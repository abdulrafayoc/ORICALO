"""
model_utils.py
==============
Shared utilities imported by both train_model.py and test_model.py.

Keeping TargetMeanEncoder here (rather than inside the training script)
ensures that joblib/pickle can always deserialise the saved model,
regardless of which script is the __main__ entry point.

Import order in test_model.py / any inference script:
    from model_utils import TargetMeanEncoder   # ← must come BEFORE joblib.load()
    import joblib
    bundle = joblib.load("models/price_predictor.pkl")
"""

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import KFold


PREMIUM_KEYWORDS = (
    "dha", "defence", "bahria", "gulberg", "cantt",
    "clifton", "f-6", "f-7", "f-8", "f-10", "e-7",
)


class TargetMeanEncoder(BaseEstimator, TransformerMixin):
    """
    Smoothed target (mean) encoder for high-cardinality categoricals.

    Each category value is encoded as its smoothed mean log-price:

        encoded = (count * category_mean + smoothing * global_mean)
                  / (count + smoothing)

    • During pipeline.fit()  → fit_transform() is called with cross-validation
      so each row's encoding comes from out-of-fold data (no leakage).
    • During pipeline.predict() → transform() uses encodings fitted on all
      training data.
    • Unknown categories at inference receive the global mean.

    Parameters
    ----------
    cols      : list of column names to encode
    n_splits  : number of CV folds (default 5)
    smoothing : regularisation strength – higher = more shrinkage toward global
                mean for rare categories (default 10)
    """

    def __init__(self, cols: list, n_splits: int = 5, smoothing: float = 10.0):
        self.cols      = cols
        self.n_splits  = n_splits
        self.smoothing = smoothing

    # ── internal ──────────────────────────────────────────────────────────

    def _compute_map(
        self, col_series: pd.Series, y_log: pd.Series
    ) -> tuple[dict, float]:
        df = pd.DataFrame({"val": col_series, "target": y_log})
        stats       = df.groupby("val")["target"]
        counts      = stats.count()
        means       = stats.mean()
        global_mean = float(y_log.mean())
        smooth = (
            (counts * means + self.smoothing * global_mean)
            / (counts + self.smoothing)
        )
        return smooth.to_dict(), global_mean

    # ── sklearn API ───────────────────────────────────────────────────────

    def fit(self, X: pd.DataFrame, y=None) -> "TargetMeanEncoder":
        if y is None:
            raise ValueError("TargetMeanEncoder requires y during fit.")
        y_log = np.log1p(pd.Series(y).values)
        self.encodings_    = {}
        self.global_means_ = {}
        for col in self.cols:
            if col not in X.columns:
                continue
            enc_map, g_mean = self._compute_map(
                X[col].fillna("Unknown"), pd.Series(y_log)
            )
            self.encodings_[col]    = enc_map
            self.global_means_[col] = g_mean
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        X = X.copy()
        for col in self.cols:
            if col not in X.columns:
                continue
            g_mean = self.global_means_.get(col, 0.0)
            X[col] = (
                X[col]
                .fillna("Unknown")
                .map(self.encodings_.get(col, {}))
                .fillna(g_mean)
            )
        return X

    def fit_transform(self, X: pd.DataFrame, y=None) -> pd.DataFrame:
        """
        Cross-validated fit_transform called automatically by sklearn Pipeline.fit().
        Each row's encoding is derived from out-of-fold data → prevents leakage.
        After CV encoding, fits on the full dataset for later transform() calls.
        """
        if y is None:
            return self.fit(X).transform(X)

        y_arr  = np.log1p(pd.Series(y).values)
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
                    pd.Series(y_arr[tr_idx]),
                )
                encoded[val_idx] = (
                    col_s.iloc[val_idx].map(enc_map).fillna(g_mean).values
                )

            result[col] = encoded

        # fit on all data so transform() works correctly at inference
        self.fit(X, y)
        result.index = X.index
        return result
