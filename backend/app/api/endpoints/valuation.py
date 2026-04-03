from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter
from pathlib import Path
from pydantic import BaseModel

# ⚠ model_utils MUST be imported before joblib so pickle can resolve
# TargetMeanEncoder when deserialising the saved pipeline.
import sys
BASE_DIR = Path(__file__).resolve().parents[3]
models_dir = BASE_DIR / "models"
if str(models_dir) not in sys.path:
    sys.path.insert(0, str(models_dir))

from model_utils import TargetMeanEncoder, PREMIUM_KEYWORDS  # noqa: F401
import joblib

router = APIRouter(tags=["valuation"])

# ── request / response schemas ────────────────────────────────────────────────

class ValuationRequest(BaseModel):
    city: str
    property_type: str
    bedrooms: int
    baths: int
    # area – caller may supply sqft OR marla (sqft takes priority)
    area_sqft:   Optional[float] = None
    area_marla:  Optional[float] = None
    # location fields – supply as many as you have; more = better accuracy
    neighbourhood: Optional[str] = None  # specific sub-area e.g. "DHA Phase 2"
    area_name:     Optional[str] = None  # broader area       e.g. "DHA Defence"
    location:      Optional[str] = None  # free-text fallback e.g. "DHA Phase 2, DHA Defence"


class ValuationResponse(BaseModel):
    predicted_price_pkr: float
    min_price_lakh: float
    max_price_lakh: float
    currency: str = "PKR"
    confidence: float
    is_premium_location: bool


# ── model loading ─────────────────────────────────────────────────────────────

_MODEL_PATH = BASE_DIR / "models" / "price_predictor.pkl"
_model          = None
_model_metadata = None


def _get_model():
    global _model, _model_metadata
    if _model is None and _MODEL_PATH.exists():
        try:
            data = joblib.load(_MODEL_PATH)
            if isinstance(data, dict):
                _model          = data.get("pipeline")
                _model_metadata = data.get("metadata", {})
            else:
                _model          = data
                _model_metadata = {}
            print(f"[valuation] Model loaded from {_MODEL_PATH}")
        except Exception as e:
            print(f"[valuation] Error loading model: {e}")
            _model, _model_metadata = None, {}
    return _model


# ── helpers ───────────────────────────────────────────────────────────────────

def _marla_to_sqft(marla: float, location_str: str) -> float:
    """Convert marla to sqft using premium-area factor where appropriate."""
    loc = location_str.lower()
    factor = 225.0 if any(k in loc for k in PREMIUM_KEYWORDS) else 272.25
    return marla * factor


def _build_features(req: ValuationRequest, area_sqft: float) -> pd.DataFrame:
    """
    Assemble the complete feature DataFrame that the v2 pipeline expects.

    The pipeline internally applies:
      • TargetMeanEncoder  →  Neighbourhood, Area_Name, Location
      • OrdinalEncoder     →  City, Property Type
      • StandardScaler     →  all numeric columns
    so we just need to pass the raw strings and numbers.
    """
    neighbourhood = req.neighbourhood or "Other"
    area_name     = req.area_name     or neighbourhood  # fall back to neighbourhood
    location      = req.location      or f"{neighbourhood}, {area_name}"

    combined_loc = f"{neighbourhood} {area_name} {location}".lower()
    is_premium   = any(k in combined_loc for k in PREMIUM_KEYWORDS)

    bath_per_bed   = req.baths / (req.bedrooms + 0.1)  # avoid division by zero
    
    # Area binning - similar to what was likely used during training
    if area_sqft < 500:
        area_bin = 0  # Small
    elif area_sqft < 1000:
        area_bin = 1  # Medium
    elif area_sqft < 2000:
        area_bin = 2  # Large
    else:
        area_bin = 3  # Very Large

    return pd.DataFrame([{
        # low-cardinality categoricals → OrdinalEncoder
        "City":           req.city.strip().title(),
        "Property Type":  req.property_type.strip().title(),
        # high-cardinality location categoricals → TargetMeanEncoder
        "Location":       location,
        # numeric features expected by the model
        "Bedrooms":       req.bedrooms,
        "Baths":          req.baths,
        "Area_SqFt":      area_sqft,
        "Bath_per_Bed":   bath_per_bed,
        "Area_Bin":       area_bin,
    }]), is_premium


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/valuation/predict", response_model=ValuationResponse)
async def valuation_predict(payload: ValuationRequest) -> ValuationResponse:
    # ── resolve area in sqft ──────────────────────────────────────────────
    if payload.area_sqft is not None:
        area_sqft = payload.area_sqft
    elif payload.area_marla is not None:
        loc_str = " ".join(filter(None, [
            payload.neighbourhood, payload.area_name, payload.location
        ]))
        area_sqft = _marla_to_sqft(payload.area_marla, loc_str)
    else:
        area_sqft = 0.0

    model = _get_model()

    # ── fallback if model not available ──────────────────────────────────
    if model is None:
        print("[valuation] Warning: model not loaded – using hardcoded fallback.")
        price    = max(25_00_000.0, area_sqft * 12_000.0) if area_sqft else 1_00_00_000.0
        min_lakh = (price * 0.90) / 1e5
        max_lakh = (price * 1.10) / 1e5
        return ValuationResponse(
            predicted_price_pkr  = price,
            min_price_lakh       = min_lakh,
            max_price_lakh       = max_lakh,
            confidence           = 0.5,
            is_premium_location  = False,
        )

    # ── build feature DataFrame and predict ──────────────────────────────
    df, is_premium = _build_features(payload, area_sqft)
    pred_log = float(model.predict(df)[0])
    pred = float(np.expm1(pred_log))  # inverse of log1p transformation

    # widen the confidence interval slightly for unknown locations
    has_specific_location = any([
        payload.neighbourhood, payload.area_name, payload.location
    ])
    spread   = 0.075 if has_specific_location else 0.125
    confidence = 0.78 if has_specific_location else 0.62

    min_lakh = (pred * (1 - spread)) / 1e5
    max_lakh = (pred * (1 + spread)) / 1e5

    return ValuationResponse(
        predicted_price_pkr  = pred,
        min_price_lakh       = min_lakh,
        max_price_lakh       = max_lakh,
        confidence           = confidence,
        is_premium_location  = is_premium,
    )


@router.get("/valuation/stats")
async def valuation_stats():
    """Return model training statistics and feature importances."""
    _get_model()  # ensure loaded

    if _model_metadata:
        return _model_metadata

    # fallback when model isn't loaded yet
    return {
        "total_samples": 0,
        "accuracy":      0.0,
        "last_trained":  "N/A",
        "mae":           "N/A",
        "model_type":    "Not loaded",
        "features":      [],
    }