import os
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

# Try to use XGBoost if available, else fall back to RandomForest
try:  # pragma: no cover
    from xgboost import XGBRegressor  # type: ignore
    _USE_XGB = True
except Exception:  # pragma: no cover
    from sklearn.ensemble import RandomForestRegressor
    _USE_XGB = False

from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score


DATA_DIR = Path(r"d:\FAST\FYP\ORICALO\data\rag")
MODEL_PATH = Path("models/price_predictor.pkl")
MERGED_CSV = Path("data/processed/merged_rag_dataset.csv")


def _first_series(df: pd.DataFrame, names: list[str], default=None) -> pd.Series:
    for n in names:
        if n in df.columns:
            return df[n]
    return pd.Series([default] * len(df), index=df.index)


def _parse_numeric_series(s: pd.Series) -> pd.Series:
    if s.dtype.kind in ("i", "u", "f"):
        return s
    return pd.to_numeric(s.astype(str).str.extract(r"([0-9]+\.?[0-9]*)")[0], errors="coerce")


def _unify_one(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    out = pd.DataFrame(index=df.index)

    out["City"] = _first_series(df, ["City", "city"]).fillna("")
    out["Property Type"] = _first_series(df, ["Property Type", "type"]).fillna("")
    out["Bedrooms"] = _parse_numeric_series(_first_series(df, ["Bedrooms", "bedrooms"]))
    out["Baths"] = _parse_numeric_series(_first_series(df, ["Baths", "baths"]))
    out["Price"] = _first_series(df, ["Price", "price"])
    out["Location"] = _first_series(df, ["Location"]).fillna("Unknown")
    out["Long Location"] = _first_series(df, ["Long Location", "address"]).fillna("")
    out["Area_SqFt"] = pd.to_numeric(_first_series(df, ["Area_SqFt", "area_sqft"]), errors="coerce")
    
    # Size helpers
    out["Size (in Zameen.com)"] = _first_series(df, ["Size (in Zameen.com)", "area"])
    out["Size (Marla, Kanal)"] = pd.to_numeric(_first_series(df, ["Size (Marla, Kanal)"]), errors="coerce")
    out["Area Type (Marla, Kanal)"] = _first_series(df, ["Area Type (Marla, Kanal)"])
    return out


def _load_dataset() -> pd.DataFrame:
    # Prefer unified dataset from ingestion if present
    if MERGED_CSV.exists():
        print(f"Loading merged dataset from {MERGED_CSV}...")
        return pd.read_csv(MERGED_CSV)
    
    print(f"Loading individual CSVs from {DATA_DIR}...")
    files = sorted(DATA_DIR.glob("zameen-com-dataset_*.csv"))
    if not files:
        raise FileNotFoundError(f"No CSVs found in {DATA_DIR}")
    
    unified = [_unify_one(pd.read_csv(p)) for p in files]
    return pd.concat(unified, ignore_index=True)


def _to_marla(row: pd.Series) -> Optional[float]:
    # Prefer structured numeric columns if present
    size = row.get("Size (Marla, Kanal)")
    area_type = row.get("Area Type (Marla, Kanal)")
    if pd.notna(size) and pd.notna(area_type):
        try:
            size = float(size)
            atype = str(area_type).strip().lower()
            if "kanal" in atype:
                return size * 20.0
            return size
        except Exception:
            pass

    # Fallback: parse "Size (in Zameen.com)" like "10 Marla" or "1 Kanal"
    raw = row.get("Size (in Zameen.com)")
    if isinstance(raw, str):
        parts = raw.strip().split()
        if len(parts) >= 2:
            try:
                val = float(parts[0])
                unit = parts[1].lower()
                if "kanal" in unit:
                    return val * 20.0
                if "marla" in unit:
                    return val
            except Exception:
                return None
    return None


def _to_sqft(marla: Optional[float], location: Optional[object]) -> Optional[float]:
    if marla is None:
        return None
    
    loc = str(location).lower() if location else ""
    
    # Standard conversion conventions in Pakistan
    # DHA/Bahria typically use 225 sqft/marla, others 272.25
    if any(k in loc for k in ["dha", "defence", "bahria", "askari", "cantt"]):
        return marla * 225.0
    return marla * 272.25


def prepare_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # compute normalized area
    df["_marla"] = df.apply(_to_marla, axis=1)
    computed_sqft = df.apply(
        lambda r: _to_sqft(r.get("_marla"), r.get("Location") or r.get("Long Location")), axis=1
    )
    # Fill missing Area_SqFt
    df["Area_SqFt"] = df["Area_SqFt"].where(pd.notna(df["Area_SqFt"]) & (df["Area_SqFt"] > 50), computed_sqft)

    # Keep relevant columns - ADDED LOCATION
    cols = [
        "City",
        "Location",
        "Property Type",
        "Bedrooms",
        "Baths",
        "Area_SqFt",
        "Price",
    ]
    
    # Check if columns exist before subsetting
    missing_cols = [c for c in cols if c not in df.columns]
    if missing_cols:
        print(f"Warning: Missing columns {missing_cols}. Creating empty ones.")
        for c in missing_cols: df[c] = np.nan

    df = df[cols].copy()

    # Clean numeric types
    for c in ["Bedrooms", "Baths", "Area_SqFt", "Price"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Drop invalid rows
    df = df.dropna(subset=["City", "Location", "Property Type", "Area_SqFt", "Price"])
    df = df[(df["Area_SqFt"] > 50) & (df["Price"] > 1000)]
    
    # Defaults for beds/baths if missing (assume land/plot if missing, but we filtered mostly)
    df["Bedrooms"] = df["Bedrooms"].fillna(0)
    df["Baths"] = df["Baths"].fillna(0)

    # Outlier Removal using Price Per SqFt (PPS)
    df["pps"] = df["Price"] / df["Area_SqFt"]

    # Filter by City + Property Type to be more granular
    filtered = []
    # If dataset is too large, groupby might be slow, but essential for cleaning
    for (city, ptype), g in df.groupby(["City", "Property Type"]):
        if len(g) < 5:
            filtered.append(g) # Keep small groups as is or drop? Keeping for now.
            continue
            
        q1 = g["pps"].quantile(0.20)
        q3 = g["pps"].quantile(0.80)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        
        # also filter absolute crazy outliers on price
        g = g[(g["pps"] >= lower) & (g["pps"] <= upper)]
        filtered.append(g)
        
    if filtered:
        df = pd.concat(filtered, ignore_index=True)
    
    print(f"Training data shape after cleaning: {df.shape}")
    return df


def build_model(df: pd.DataFrame) -> Pipeline:
    # Features vs Target
    X = df.drop(columns=["Price", "pps"])
    y = df["Price"].values

    # Preprocessing
    # Note: 'Location' has high cardinality. We use min_frequency to group rare locations into 'infrequent_sklearn'.
    cat_cols = ["City", "Location", "Property Type"]
    num_cols = ["Bedrooms", "Baths", "Area_SqFt"]

    pre = ColumnTransformer(
        transformers=[
            # encode known cats, handle unknown at inference, group rare ones
            ("cat", OneHotEncoder(handle_unknown="ignore", min_frequency=20, sparse_output=False), cat_cols),
            ("num", StandardScaler(), num_cols),
        ],
        remainder="drop"
    )

    # Model Selection
    if _USE_XGB:
        print("Using XGBoost Regressor...")
        base_model = XGBRegressor(
            n_estimators=1000,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=2,
            n_jobs=-1,
            tree_method="hist",  # faster for large data
            early_stopping_rounds=None  # pipeline doesn't support this easily without fit params
        )
    else:
        print("Using RandomForest Regressor (Fallback)...")
        base_model = RandomForestRegressor(
            n_estimators=500, 
            max_depth=20, 
            n_jobs=-1, 
            random_state=42
        )

    # Use TransformedTargetRegressor to predict log(Price)
    # This helps SIGNIFICANTLY with real estate price ranges (Lakhs vs Crores)
    model = TransformedTargetRegressor(
        regressor=base_model,
        func=np.log1p,
        inverse_func=np.expm1
    )

    pipe = Pipeline(steps=[("pre", pre), ("model", model)])

    return pipe


def main() -> None:
    print("Starting Model Training...")
    df = _load_dataset()
    df = prepare_training_frame(df)
    
    if len(df) < 100:
        raise RuntimeError("Not enough clean rows to train the model (<100).")

    train_df, test_df = train_test_split(df, test_size=0.15, random_state=42)
    
    print(f"Training on {len(train_df)} samples, testing on {len(test_df)}...")

    pipe = build_model(train_df)
    
    # Fit
    X_train = train_df.drop(columns=["Price", "pps"])
    y_train = train_df["Price"]
    pipe.fit(X_train, y_train)

    # Evaluate
    X_test = test_df.drop(columns=["Price", "pps"])
    y_test = test_df["Price"]
    
    preds = pipe.predict(X_test)
    
    rmse = mean_squared_error(y_test, preds, squared=False)
    r2 = r2_score(y_test, preds)
    
    print("="*40)
    print(f"Model Evaluation Results:")
    print(f"RMSE: {rmse:,.0f} PKR")
    print(f"R² Score: {r2:.4f}")
    print("="*40)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipe, "features": X_train.columns.tolist()}, MODEL_PATH)
    print(f"Saved model and metadata to {MODEL_PATH}")


if __name__ == "__main__":
    main()
