"""
Pakistan Real Estate Price Prediction Model  ·  v2
====================================================
Dataset : Zameen.com CSV (Kaggle)
Output  : models/price_predictor.pkl  (consumed by valuation.py FastAPI endpoint)

Key improvements over v1
─────────────────────────
  • Neighbourhood AND Area_Name are now SEPARATE features (v1 silently merged them)
  • Target (mean) encoding for high-cardinality location columns instead of
    OrdinalEncoder – each area is encoded as its smoothed average log-price,
    giving the model genuine location price signal
  • Cross-validated fit_transform prevents target-encoding data leakage
  • XGBoost regressor (falls back to GradientBoostingRegressor if not installed)
  • Premium-location binary flag (DHA / Bahria / Gulberg / Defence / Cantt)
  • Kanal / Marla / Sqft size string parser so raw 'size' column works too

Usage
─────
    pip install pandas scikit-learn xgboost joblib
    python train_model.py --data path/to/zameen_data.csv

Saved .pkl structure (unchanged – backwards-compatible with valuation.py)
─────────────────────────────────────────────────────────────────────────
    {
        "pipeline"  : PricePredictor  (wraps target encoder + sklearn Pipeline),
        "metadata"  : dict             (stats returned by /valuation/stats),
    }
"""

import argparse
import json
import warnings
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, StandardScaler

try:
    from xgboost import XGBRegressor
    HAS_XGB = True
except ImportError:
    from sklearn.ensemble import GradientBoostingRegressor
    HAS_XGB = False
    print("[warn] xgboost not installed – falling back to GradientBoostingRegressor")
    print("[warn] For better accuracy: pip install xgboost")

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# 1.  COLUMN-NAME MAPPING
#     Zameen CSVs come in several flavours; normalise them all.
#     IMPORTANT: neighbourhood and area now map to DIFFERENT canonical names.
# ─────────────────────────────────────────────────────────────────────────────
COL_MAP = {
    # price
    "price":          "price_str",   # string like "5.75 Crore" – dropped if price_pkr exists
    "Price":          "price_str",
    "price_pkr":      "price",       # numeric PKR – preferred
    "PRICE":          "price",
    # city
    "city":           "City",
    "City":           "City",
    "CITY":           "City",
    # property type
    "property_type":  "Property Type",
    "Property Type":  "Property Type",
    "PropertyType":   "Property Type",
    "property type":  "Property Type",
    "type":           "Property Type",
    "Type":           "Property Type",
    # bedrooms
    "bedrooms":       "Bedrooms",
    "Bedrooms":       "Bedrooms",
    "beds":           "Bedrooms",
    "Beds":           "Bedrooms",
    "bedroom":        "Bedrooms",
    # baths
    "baths":          "Baths",
    "Baths":          "Baths",
    "bathrooms":      "Baths",
    "bath":           "Baths",
    # area – raw numeric (marla or sqft)
    "size_marla":     "area_raw",    # numeric marla – preferred over string 'size'
    "area_in_marla":  "area_raw",
    "area_marla":     "area_raw",
    "size_str":       "_drop_size",  # string like "1.2 Kanal" – dropped if size_marla exists
    "Area_SqFt":      "Area_SqFt",
    "area_sqft":      "Area_SqFt",
    # area unit
    "area_type":      "area_type",
    "Area_Type":      "area_type",
    "unit":           "area_type",
    # ── LOCATION COLUMNS (now three distinct features) ────────────────────
    "neighbourhood":  "Neighbourhood",   # specific sub-area  e.g. "DHA Phase 2"
    "Neighbourhood":  "Neighbourhood",
    "area":           "Area_Name",       # broader area       e.g. "DHA Defence"
    "Area":           "Area_Name",
    "location":       "Location",        # full string        e.g. "DHA Phase 2, DHA Defence"
    "Location":       "Location",
    # misc
    "price_per_marla": "price_per_marla",
    "title":          "title",
    "purpose":        "purpose",
    "Purpose":        "purpose",
}

MARLA_TO_SQFT_DEFAULT = 272.25   # standard marla
MARLA_TO_SQFT_PREMIUM = 225.0    # DHA / Bahria / Defence (smaller marla convention)

PREMIUM_KEYWORDS = ("dha", "defence", "bahria", "gulberg", "cantt",
                    "clifton", "f-6", "f-7", "f-8", "f-10", "e-7")

# ─────────────────────────────────────────────────────────────────────────────
# 2.  PROPERTY-TYPE EXTRACTION FROM TITLE
# ─────────────────────────────────────────────────────────────────────────────
_TYPE_PATTERNS = [
    ("upper portion",  "Upper Portion"),
    ("lower portion",  "Lower Portion"),
    ("penthouse",      "Penthouse"),
    ("apartment",      "Apartment"),
    ("flat",           "Flat"),
    ("villa",          "Villa"),
    ("farm house",     "Farm House"),
    ("farmhouse",      "Farm House"),
    ("house",          "House"),
    ("room",           "Room"),
    ("plot",           "Plot"),
    ("shop",           "Shop"),
    ("office",         "Office"),
    ("building",       "Building"),
    ("portion",        "Portion"),
]

def _extract_property_type(title: str) -> str:
    t = (title or "").lower()
    for pattern, label in _TYPE_PATTERNS:
        if pattern in t:
            return label
    return "Other"

# ─────────────────────────────────────────────────────────────────────────────
# 3.  SIZE STRING PARSER  ("1.2 Kanal", "10 Marla", "2000 sq ft", …)
# ─────────────────────────────────────────────────────────────────────────────
def _parse_size_string(s: str) -> tuple[float | None, str | None]:
    """Return (numeric_value, unit) parsed from a raw size string."""
    import re
    s = str(s or "").strip().lower()
    m = re.match(r"([\d,\.]+)\s*(.*)", s)
    if not m:
        return None, None
    val_str, unit_str = m.group(1).replace(",", ""), m.group(2).strip()
    try:
        val = float(val_str)
    except ValueError:
        return None, None
    if "kanal" in unit_str:
        return val * 20, "marla"   # 1 Kanal = 20 Marla
    if "marla" in unit_str or unit_str == "":
        return val, "marla"
    if "sq" in unit_str or "feet" in unit_str or "ft" in unit_str:
        return val, "sqft"
    return val, None

# ─────────────────────────────────────────────────────────────────────────────
# 4.  DATA LOADING & NORMALISATION
# ─────────────────────────────────────────────────────────────────────────────
def load_and_normalise(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"[load] raw shape : {df.shape}")
    print(f"[load] columns   : {list(df.columns)}")

    # ── resolve duplicate source columns before renaming ─────────────────
    # price: prefer numeric price_pkr over string price
    if "price" in df.columns and "price_pkr" in df.columns:
        df.drop(columns=["price"], inplace=True)
    elif "price" in df.columns:
        # try to parse string prices like "5.75 Crore"
        df["price_pkr"] = df["price"].apply(_parse_price_str)
        df.drop(columns=["price"], inplace=True)

    # size: prefer numeric size_marla over string size
    if "size" in df.columns and "size_marla" in df.columns:
        df.drop(columns=["size"], inplace=True)
    elif "size" in df.columns:
        # parse "1.2 Kanal", "10 Marla", etc.
        parsed = df["size"].apply(lambda s: _parse_size_string(s))
        df["size_marla"] = parsed.apply(lambda x: x[0] if x[1] in ("marla", None) else None)
        area_sqft_from_size = parsed.apply(lambda x: x[0] if x[1] == "sqft" else None)
        if "Area_SqFt" not in df.columns:
            df["Area_SqFt"] = area_sqft_from_size
        df.drop(columns=["size"], inplace=True)

    # ── rename all columns to canonical names ─────────────────────────────
    df.rename(columns=COL_MAP, inplace=True)
    # drop internal markers
    drop_cols = [c for c in df.columns if c.startswith("_drop")]
    if drop_cols:
        df.drop(columns=drop_cols, inplace=True)

    # deduplicate in case multiple source cols mapped to same target
    df = _dedup_columns(df)

    # ── for-sale filter ───────────────────────────────────────────────────
    if "purpose" in df.columns:
        df = df[df["purpose"].str.lower().str.contains("sale", na=False)]
        print(f"[load] after 'For Sale' filter : {len(df)}")

    # ── infer Property Type from title if missing ─────────────────────────
    if "Property Type" not in df.columns and "title" in df.columns:
        df["Property Type"] = df["title"].apply(_extract_property_type)
        print(f"[load] inferred Property Type from title "
              f"({df['Property Type'].nunique()} types)")

    # ── report location columns found ─────────────────────────────────────
    loc_cols = [c for c in ("Neighbourhood", "Area_Name", "Location") if c in df.columns]
    print(f"[load] location columns found : {loc_cols}")
    for col in loc_cols:
        print(f"         {col:15s}: {df[col].nunique()} unique values")

    return df


def _parse_price_str(s) -> float | None:
    """Parse '5.75 Crore', '40 Lakh', '1200000' → float PKR."""
    import re
    s = str(s or "").strip().lower().replace(",", "")
    m = re.match(r"([\d\.]+)\s*(.*)", s)
    if not m:
        return None
    val, unit = float(m.group(1)), m.group(2)
    if "crore" in unit:
        return val * 1e7
    if "lakh" in unit:
        return val * 1e5
    if "arab" in unit:
        return val * 1e9
    try:
        return float(s)
    except ValueError:
        return None


def _dedup_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Coalesce duplicate column names – keep first non-null per row."""
    if not df.columns.duplicated().any():
        return df
    seen: dict[str, pd.Series] = {}
    for col_name, col_data in zip(df.columns,
                                  (df.iloc[:, i] for i in range(df.shape[1]))):
        if col_name in seen:
            seen[col_name] = seen[col_name].fillna(col_data)
        else:
            seen[col_name] = col_data
    return pd.DataFrame(seen, index=df.index)

# ─────────────────────────────────────────────────────────────────────────────
# 5.  AREA → SQFT CONVERSION
# ─────────────────────────────────────────────────────────────────────────────
def _is_premium(loc: str) -> bool:
    loc = (loc or "").lower()
    return any(k in loc for k in PREMIUM_KEYWORDS)


def resolve_area_sqft(df: pd.DataFrame) -> pd.DataFrame:
    if "Area_SqFt" in df.columns and df["Area_SqFt"].notna().sum() > len(df) * 0.5:
        df["Area_SqFt"] = pd.to_numeric(df["Area_SqFt"], errors="coerce")
        return df

    if "area_raw" not in df.columns:
        raise ValueError(
            "Cannot find area/size column. Expected one of: "
            "size_marla, area_in_marla, area_marla, Area_SqFt"
        )

    df["area_raw"] = pd.to_numeric(df["area_raw"], errors="coerce")

    # determine marla → sqft factor per row based on location
    def _factor(row):
        loc = " ".join(str(row.get(c, "")) for c in ("Neighbourhood", "Area_Name", "Location"))
        return MARLA_TO_SQFT_PREMIUM if _is_premium(loc) else MARLA_TO_SQFT_DEFAULT

    if "area_type" in df.columns:
        mask_sqft = df["area_type"].str.lower().str.contains(
            r"sq|sqft|feet", na=False, regex=True
        )
        df.loc[mask_sqft,  "Area_SqFt"] = df.loc[mask_sqft,  "area_raw"]
        df.loc[~mask_sqft, "Area_SqFt"] = df.loc[~mask_sqft].apply(
            lambda r: r["area_raw"] * _factor(r), axis=1
        )
    else:
        # heuristic: < 200 almost certainly marla
        is_marla = df["area_raw"] < 200
        df.loc[is_marla,  "Area_SqFt"] = df.loc[is_marla].apply(
            lambda r: r["area_raw"] * _factor(r), axis=1
        )
        df.loc[~is_marla, "Area_SqFt"] = df.loc[~is_marla, "area_raw"]

    return df

# ─────────────────────────────────────────────────────────────────────────────
# 6.  CLEANING
# ─────────────────────────────────────────────────────────────────────────────
def clean(df: pd.DataFrame) -> pd.DataFrame:
    required  = ["price", "City", "Property Type", "Bedrooms", "Baths", "Area_SqFt"]
    loc_cols  = [c for c in ("Neighbourhood", "Area_Name", "Location") if c in df.columns]
    keep_cols = required + loc_cols

    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns after normalisation: {missing}")

    df = df[keep_cols].copy()

    for col in ("price", "Bedrooms", "Baths", "Area_SqFt"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    before = len(df)
    df.dropna(subset=required, inplace=True)

    df = df[df["price"]     > 0]
    df = df[df["Area_SqFt"] > 0]
    df = df[df["Bedrooms"]  >= 0]
    df = df[df["Baths"]     >= 0]

    # 1st–99th percentile on price & area
    for col in ("price", "Area_SqFt"):
        lo, hi = df[col].quantile(0.01), df[col].quantile(0.99)
        df = df[(df[col] >= lo) & (df[col] <= hi)]

    df["Bedrooms"] = df["Bedrooms"].clip(0, 10).astype(int)
    df["Baths"]    = df["Baths"].clip(0, 10).astype(int)

    df["City"]          = df["City"].str.strip().str.title()
    df["Property Type"] = df["Property Type"].str.strip().str.title()

    # merge rare property types
    type_counts = df["Property Type"].value_counts()
    rare_types  = type_counts[type_counts < 20].index.tolist()
    if rare_types:
        df.loc[df["Property Type"].isin(rare_types), "Property Type"] = "Other"
        print(f"[clean] merged {len(rare_types)} rare property types → 'Other': {rare_types}")

    # normalise and group rare locations for each location column
    for col in loc_cols:
        df[col] = df[col].fillna("Unknown").astype(str).str.strip().str.title()
        counts   = df[col].value_counts()
        rare     = counts[counts < 5].index
        df.loc[df[col].isin(rare), col] = "Other"
        print(f"[clean] {col}: {df[col].nunique()} unique values after grouping rare")

    print(f"[clean] {before} → {len(df)} rows after cleaning")
    return df

# ─────────────────────────────────────────────────────────────────────────────
# 7.  FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────
def engineer(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["log_area"]        = np.log1p(df["Area_SqFt"])
    df["bed_bath_ratio"]  = df["Bedrooms"] / (df["Baths"] + 0.5)
    df["area_per_bed"]    = df["Area_SqFt"] / (df["Bedrooms"] + 1)

    # explicit premium-location flag
    loc_str = df[
        [c for c in ("Neighbourhood", "Area_Name", "Location") if c in df.columns]
    ].fillna("").astype(str).apply(lambda r: " ".join(r).lower(), axis=1)
    df["is_premium"] = loc_str.apply(lambda s: int(any(k in s for k in PREMIUM_KEYWORDS)))

    return df

# ─────────────────────────────────────────────────────────────────────────────
# 8.  TARGET (MEAN) ENCODER  –  the core accuracy improvement
#
#     Why not OrdinalEncoder for location?
#     OrdinalEncoder assigns arbitrary integers (DHA→47, B-17→3) that carry
#     no price information. The model must then learn the price ordering of
#     hundreds of locations from scratch – nearly impossible with 7k rows.
#
#     Target encoding replaces each category with its smoothed mean log-price.
#     The model now sees that DHA locations have high mean price and G-15 has
#     a lower one, immediately and without additional learning effort.
#
#     Cross-validation inside fit_transform prevents data leakage.
# ─────────────────────────────────────────────────────────────────────────────
class TargetMeanEncoder(BaseEstimator, TransformerMixin):
    """
    Smoothed target (mean) encoder for high-cardinality categoricals.

    Encodes each category value as:
        (count * category_mean + smoothing * global_mean) / (count + smoothing)

    During fit_transform (training), cross-validation is used so each row's
    encoding is computed from out-of-fold data – preventing leakage.
    During transform (inference), the encoding fitted on all training data is used.
    Unknown categories receive the global mean.
    """

    def __init__(self, cols: list[str], n_splits: int = 5, smoothing: float = 10.0):
        self.cols      = cols
        self.n_splits  = n_splits
        self.smoothing = smoothing

    # ── internal helper ───────────────────────────────────────────────────
    def _compute_map(self, col_series: pd.Series, y_log: pd.Series) -> dict:
        df = pd.DataFrame({"val": col_series, "target": y_log})
        stats = df.groupby("val")["target"]
        counts = stats.count()
        means  = stats.mean()
        global_mean = y_log.mean()
        smooth = (counts * means + self.smoothing * global_mean) / (counts + self.smoothing)
        return smooth.to_dict(), global_mean

    # ── sklearn API ───────────────────────────────────────────────────────
    def fit(self, X: pd.DataFrame, y=None) -> "TargetMeanEncoder":
        if y is None:
            raise ValueError("TargetMeanEncoder requires y during fit")
        y_log = np.log1p(pd.Series(y).values)
        self.encodings_    = {}
        self.global_means_ = {}
        for col in self.cols:
            if col not in X.columns:
                continue
            enc_map, g_mean = self._compute_map(X[col].fillna("Unknown"), pd.Series(y_log))
            self.encodings_[col]    = enc_map
            self.global_means_[col] = g_mean
        self._fitted = True
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        for col in self.cols:
            if col not in X.columns:
                continue
            g_mean = self.global_means_.get(col, 0.0)
            X[col] = (
                X[col].fillna("Unknown")
                      .map(self.encodings_.get(col, {}))
                      .fillna(g_mean)
            )
        return X

    def fit_transform(self, X: pd.DataFrame, y=None) -> pd.DataFrame:
        """
        Cross-validated fit_transform called by sklearn Pipeline.fit().
        Each row's encoding comes from out-of-fold data → no leakage.
        """
        if y is None:
            return self.fit(X).transform(X)

        y_log  = np.log1p(pd.Series(y, index=X.index).values)
        result = X.copy().reset_index(drop=True)
        X_r    = X.reset_index(drop=True)
        kf     = KFold(n_splits=self.n_splits, shuffle=True, random_state=42)

        for col in self.cols:
            if col not in X_r.columns:
                continue
            encoded = np.zeros(len(X_r))
            col_s   = X_r[col].fillna("Unknown")

            for tr_idx, val_idx in kf.split(X_r):
                enc_map, g_mean = self._compute_map(
                    col_s.iloc[tr_idx],
                    pd.Series(y_log[tr_idx])
                )
                encoded[val_idx] = col_s.iloc[val_idx].map(enc_map).fillna(g_mean).values

            result[col] = encoded

        # fit on all data for later transform() calls
        self.fit(X, y)
        result.index = X.index
        return result

# ─────────────────────────────────────────────────────────────────────────────
# 9.  PIPELINE CONSTRUCTION
# ─────────────────────────────────────────────────────────────────────────────
def build_pipeline(cat_low: list, cat_high: list, num_cols: list) -> Pipeline:
    """
    cat_low  – low-cardinality categoricals (City, Property Type) → OrdinalEncoder
    cat_high – high-cardinality location columns → TargetMeanEncoder (already applied)
               They are now numeric floats going into StandardScaler
    num_cols – purely numeric features
    """
    cat_transformer = OrdinalEncoder(
        handle_unknown="use_encoded_value", unknown_value=-1
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", cat_transformer, cat_low),
            ("num", StandardScaler(), num_cols + cat_high),
        ],
        remainder="drop",
    )

    if HAS_XGB:
        regressor_base = XGBRegressor(
            n_estimators=1000,
            learning_rate=0.03,
            max_depth=6,
            min_child_weight=5,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=-1,
            verbosity=0,
        )
    else:
        from sklearn.ensemble import GradientBoostingRegressor
        regressor_base = GradientBoostingRegressor(
            n_estimators=800,
            learning_rate=0.04,
            max_depth=6,
            min_samples_leaf=8,
            min_samples_split=15,
            subsample=0.8,
            max_features=0.8,
            loss="huber",
            random_state=42,
            verbose=0,
        )

    # Train on log(price) → proportional errors, not absolute
    regressor = TransformedTargetRegressor(
        regressor=regressor_base,
        func=np.log1p,
        inverse_func=np.expm1,
    )

    return Pipeline([
        ("target_enc",   TargetMeanEncoder(cols=cat_high)),
        ("preprocessor", preprocessor),
        ("regressor",    regressor),
    ])

# ─────────────────────────────────────────────────────────────────────────────
# 10.  FEATURE IMPORTANCE (post-fit)
# ─────────────────────────────────────────────────────────────────────────────
def get_feature_importance(pipeline: Pipeline, cat_low, cat_high, num_cols) -> list:
    reg = pipeline.named_steps["regressor"]
    if hasattr(reg, "regressor_"):
        reg = reg.regressor_
    all_features = cat_low + num_cols + cat_high
    importances  = reg.feature_importances_
    if len(importances) != len(all_features):
        # fallback
        return [{"name": f, "importance": 0.0} for f in all_features]
    pairs = sorted(zip(all_features, importances), key=lambda x: -x[1])
    total = sum(i for _, i in pairs) or 1
    return [
        {"name": name, "importance": round(imp / total * 100, 1)}
        for name, imp in pairs
    ]

# ─────────────────────────────────────────────────────────────────────────────
# 11.  MAIN TRAINING ROUTINE
# ─────────────────────────────────────────────────────────────────────────────
def train(csv_path: str, output_dir: str = "models") -> None:
    # load & preprocess
    df_raw  = load_and_normalise(csv_path)
    df_area = resolve_area_sqft(df_raw)
    df      = clean(df_area)
    df      = engineer(df)

    # ── feature lists ─────────────────────────────────────────────────────
    # low-cardinality cats → OrdinalEncoder
    cat_low  = ["City", "Property Type"]
    # high-cardinality location cats → TargetMeanEncoder (then treated as numeric)
    cat_high = [c for c in ("Neighbourhood", "Area_Name", "Location") if c in df.columns]
    # numeric
    num_cols = ["Bedrooms", "Baths", "Area_SqFt",
                "log_area", "bed_bath_ratio", "area_per_bed", "is_premium"]

    print(f"\n[train] Low-card  categoricals : {cat_low}")
    print(f"[train] High-card categoricals : {cat_high}")
    print(f"[train] Numeric features       : {num_cols}")

    X = df[cat_low + cat_high + num_cols]
    y = df["price"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )
    print(f"\n[train] train={len(X_train)}, test={len(X_test)}")

    # ── fit ───────────────────────────────────────────────────────────────
    pipeline = build_pipeline(cat_low, cat_high, num_cols)
    model_name = "XGBoost" if HAS_XGB else "GradientBoosting"
    print(f"[train] fitting {model_name} with target-encoded location features …")
    pipeline.fit(X_train, y_train)

    # ── evaluate ──────────────────────────────────────────────────────────
    y_pred = pipeline.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    r2     = r2_score(y_test, y_pred)
    mape   = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1))) * 100)

    print(f"\n[eval] MAE  = {mae:,.0f} PKR")
    print(f"[eval] R²   = {r2:.4f}")
    print(f"[eval] MAPE = {mape:.2f}%")

    # ── feature importance ────────────────────────────────────────────────
    feat_imp = get_feature_importance(pipeline, cat_low, cat_high, num_cols)
    print("\n[feat] Feature importances:")
    for f in feat_imp:
        bar = "█" * int(f["importance"] / 2)
        print(f"       {f['name']:20s} {f['importance']:5.1f}%  {bar}")

    # ── metadata ──────────────────────────────────────────────────────────
    metadata = {
        "total_samples":   int(len(df)),
        "train_samples":   int(len(X_train)),
        "test_samples":    int(len(X_test)),
        "accuracy":        round(r2, 4),
        "r2_score":        round(r2, 4),
        "mae":             f"{mae:,.0f}",
        "mape_pct":        round(mape, 2),
        "last_trained":    str(date.today()),
        "model_type":      f"{model_name} + TargetMeanEncoder (log-target)",
        "cities":          sorted(df["City"].unique().tolist()),
        "property_types":  sorted(df["Property Type"].unique().tolist()),
        "neighbourhoods":  sorted(df["Neighbourhood"].unique().tolist())
                           if "Neighbourhood" in df.columns else [],
        "locations":       sorted(df["Area_Name"].unique().tolist())
                           if "Area_Name" in df.columns else [],
        "features":        feat_imp,
        "cat_low":         cat_low,
        "cat_high":        cat_high,
        "num_cols":        num_cols,
    }

    print(f"\n[meta] cities         : {metadata['cities']}")
    print(f"[meta] property types : {metadata['property_types']}")
    if metadata["neighbourhoods"]:
        print(f"[meta] neighbourhoods : {len(metadata['neighbourhoods'])} unique")
    if metadata["locations"]:
        print(f"[meta] area names     : {len(metadata['locations'])} unique")

    # ── save ──────────────────────────────────────────────────────────────
    out_path   = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    model_file = out_path / "price_predictor.pkl"
    meta_file  = out_path / "model_metadata.json"

    joblib.dump({"pipeline": pipeline, "metadata": metadata}, model_file)
    meta_file.write_text(json.dumps(metadata, indent=2, ensure_ascii=False))

    print(f"\n✅  Model saved  → {model_file.resolve()}")
    print(f"✅  Metadata     → {meta_file.resolve()}")

# ─────────────────────────────────────────────────────────────────────────────
# 12.  CLI
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Pakistan property price model v2")
    parser.add_argument(
        "--data",   default="./archive/all_listings_clean.csv",
        help="Path to Zameen.com CSV dataset",
    )
    parser.add_argument(
        "--output", default="models",
        help="Directory to save price_predictor.pkl",
    )
    args = parser.parse_args()
    train(args.data, args.output)