from typing import List, Optional, Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel
import os
from pathlib import Path
import joblib
import pandas as pd

router = APIRouter(tags=["valuation"])


class ValuationRequest(BaseModel):
    city: str
    property_type: str
    bedrooms: int
    baths: int
    area_sqft: Optional[float] = None
    area_marla: Optional[float] = None
    location: Optional[str] = None


class ValuationResponse(BaseModel):
    predicted_price_pkr: float
    min_price_lakh: float
    max_price_lakh: float
    currency: str = "PKR"
    confidence: float


_MODEL_PATH = Path(os.getenv("PRICE_MODEL_PATH", "models/price_predictor.pkl"))
_model = None


def _to_sqft(marla: Optional[float], location: Optional[str]) -> Optional[float]:
    if marla is None:
        return None
    loc = (location or "").lower()
    if ("dha" in loc) or ("defence" in loc) or ("bahria" in loc):
        return marla * 225.0
    return marla * 272.25


def _get_model():
    global _model
    if _model is None and _MODEL_PATH.exists():
        _model = joblib.load(_MODEL_PATH).get("pipeline")
    return _model


@router.post("/valuation/predict", response_model=ValuationResponse)
async def valuation_predict(payload: ValuationRequest) -> ValuationResponse:
    model = _get_model()

    if payload.area_sqft is None and payload.area_marla is not None:
        area_sqft = _to_sqft(payload.area_marla, payload.location)
    else:
        area_sqft = payload.area_sqft

    if model is None:
        price = 1_00_00_000.0
        if area_sqft:
            price = max(25_00_000.0, area_sqft * 12_000.0)
        min_lakh = (price * 0.9) / 100_000.0
        max_lakh = (price * 1.1) / 100_000.0
        return ValuationResponse(
            predicted_price_pkr=price,
            min_price_lakh=min_lakh,
            max_price_lakh=max_lakh,
            confidence=0.5,
        )

    df = pd.DataFrame(
        [
            {
                "City": payload.city,
                "Property Type": payload.property_type,
                "Bedrooms": payload.bedrooms,
                "Baths": payload.baths,
                "Area_SqFt": area_sqft or 0.0,
            }
        ]
    )

    pred = float(model.predict(df)[0])
    min_lakh = (pred * 0.925) / 100_000.0
    max_lakh = (pred * 1.075) / 100_000.0

    return ValuationResponse(
        predicted_price_pkr=pred,
        min_price_lakh=min_lakh,
        max_price_lakh=max_lakh,
        confidence=0.72,
    )
