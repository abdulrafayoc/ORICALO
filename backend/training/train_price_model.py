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

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error


DATA_DIR = Path("data/rag")
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
    out["Location"] = _first_series(df, ["Location"]).fillna("")
    out["Long Location"] = _first_series(df, ["Long Location", "address"]).fillna("")
    out["Area_SqFt"] = pd.to_numeric(_first_series(df, ["Area_SqFt", "area_sqft"]), errors="coerce")
    # Size helpers for fallback computation
    out["Size (in Zameen.com)"] = _first_series(df, ["Size (in Zameen.com)", "area"])  # e.g., "10 Marla"
    out["Size (Marla, Kanal)"] = pd.to_numeric(_first_series(df, ["Size (Marla, Kanal)"]), errors="coerce")
    out["Area Type (Marla, Kanal)"] = _first_series(df, ["Area Type (Marla, Kanal)"])
    return out


def _load_dataset() -> pd.DataFrame:
    # Prefer unified dataset from ingestion if present
    if MERGED_CSV.exists():
        return pd.read_csv(MERGED_CSV)
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
            if str(area_type).strip().lower() == "kanal":
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
                if unit.startswith("kanal"):
                    return val * 20.0
                if unit.startswith("marla"):
                    return val
            except Exception:
                return None
    return None


def _to_sqft(marla: Optional[float], location: Optional[object]) -> Optional[float]:
    if marla is None:
        return None
    # Robustly coerce to lowercase string
    if location is None or (isinstance(location, float) and pd.isna(location)):
        loc = ""
    else:
        loc = str(location).lower()
    # DHA/Bahria often use 225 sqft per marla; otherwise ~272.25
    if ("dha" in loc) or ("defence" in loc) or ("bahria" in loc):
        return marla * 225.0
    return marla * 272.25


def _iqr_filter(group: pd.DataFrame, col: str, k: float = 1.5) -> pd.DataFrame:
    q1 = group[col].quantile(0.25)
    q3 = group[col].quantile(0.75)
    iqr = q3 - q1
    lower = q1 - k * iqr
    upper = q3 + k * iqr
    return group[(group[col] >= lower) and (group[col] <= upper)]


def prepare_training_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["_marla"] = df.apply(_to_marla, axis=1)
    # Prefer existing Area_SqFt if valid, else compute using Location/Long Location
    computed_sqft = df.apply(
        lambda r: _to_sqft(r.get("_marla"), r.get("Location") or r.get("Long Location")), axis=1
    )
    df["Area_SqFt"] = df["Area_SqFt"].where(pd.notna(df["Area_SqFt"]) & (df["Area_SqFt"] > 0), computed_sqft)

    # Keep relevant columns
    cols = [
        "City",
        "Property Type",
        "Bedrooms",
        "Baths",
        "Area_SqFt",
        "Price",
    ]
    df = df[cols].copy()

    # Clean types
    for c in ["Bedrooms", "Baths", "Area_SqFt", "Price"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    df = df.dropna(subset=["City", "Property Type", "Bedrooms", "Baths", "Area_SqFt", "Price"])
    df = df[(df["Bedrooms"] >= 0) & (df["Baths"] >= 0) & (df["Area_SqFt"] > 0) & (df["Price"] > 0)]

    # Price per sqft for outlier detection
    df["pps"] = df["Price"] / df["Area_SqFt"]

    # IQR filter per city
    filtered = []
    for city, g in df.groupby("City"):
        q1 = g["pps"].quantile(0.25)
        q3 = g["pps"].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        filtered.append(g[(g["pps"] >= lower) & (g["pps"] <= upper)])
    df = pd.concat(filtered, ignore_index=True)

    return df


def build_model(df: pd.DataFrame) -> Pipeline:
    y = df["Price"].values
    X = df.drop(columns=["Price", "pps"])  # keep features

    cat_cols = ["City", "Property Type"]
    num_cols = ["Bedrooms", "Baths", "Area_SqFt"]

    pre = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
            ("num", "passthrough", num_cols),
        ]
    )

    if _USE_XGB:
        model = XGBRegressor(
            n_estimators=600,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_lambda=1.0,
            n_jobs=-1,
            tree_method="hist",
        )
    else:
        # Fallback
        model = RandomForestRegressor(
            n_estimators=400, max_depth=None, n_jobs=-1, random_state=42
        )

    pipe = Pipeline(steps=[("pre", pre), ("model", model)])

    return pipe


def main() -> None:
    df = _load_dataset()
    df = prepare_training_frame(df)
    if len(df) < 100:
        raise RuntimeError("Not enough clean rows to train the model.")

    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

    pipe = build_model(train_df)
    pipe.fit(train_df.drop(columns=["Price", "pps"]), train_df["Price"]) 

    # Evaluate
    preds = pipe.predict(test_df.drop(columns=["Price", "pps"]))
    rmse = mean_squared_error(test_df["Price"], preds, squared=False)
    print(f"RMSE: {rmse:,.0f} PKR  |  n_train={len(train_df)}  n_test={len(test_df)}  XGB={_USE_XGB}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipe}, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
