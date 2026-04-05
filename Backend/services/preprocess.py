"""
preprocess.py
=============
Mirrors the exact preprocessing logic from code.ipynb.

What the notebook does:
  1. MinMaxScaler fitted on raw Time + Amount from creditcard.csv
  2. V1-V28 are already PCA-transformed — they pass through unchanged
  3. Class column is boolean

This module replicates that for inference.
"""

import pandas as pd

FEATURE_COLUMNS = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]


def validate_input(data: dict) -> tuple:
    """
    Check all 30 required features are present and numeric.
    Returns (is_valid: bool, error_message: str)
    """
    missing = [col for col in FEATURE_COLUMNS if col not in data]
    if missing:
        return False, f"Missing features: {missing}"

    non_numeric = []
    for col in FEATURE_COLUMNS:
        try:
            float(data[col])
        except (TypeError, ValueError):
            non_numeric.append(col)

    if non_numeric:
        return False, f"Non-numeric values in: {non_numeric}"

    return True, ""


def preprocess_single(data: dict, scaler) -> pd.DataFrame:
    """
    Preprocess one transaction dict for inference.

    The scaler was fitted on raw Time + Amount values.
    If the incoming values are already scaled (0-1 range),
    we skip scaling to avoid double-scaling.
    """
    df = pd.DataFrame([data], columns=FEATURE_COLUMNS)
    df = df.fillna(0)

    if scaler is not None:
        needs_scaling = (df["Time"].max() > 1.0) or (df["Amount"].max() > 1.0)
        if needs_scaling:
            df[["Time", "Amount"]] = scaler.transform(df[["Time", "Amount"]])

    return df[FEATURE_COLUMNS]


def preprocess_batch(df: pd.DataFrame, scaler) -> pd.DataFrame:
    """
    Preprocess a full DataFrame for batch inference.
    Mirrors the notebook: fill nulls with column mean,
    scale Time + Amount only if they look like raw values.
    """
    df = df.copy()

    if df.isnull().sum().any():
        df.fillna(df.mean(numeric_only=True), inplace=True)

    if scaler is not None:
        needs_scaling = (df["Time"].max() > 1.0) or (df["Amount"].max() > 1.0)
        if needs_scaling:
            df[["Time", "Amount"]] = scaler.transform(df[["Time", "Amount"]])

    return df[FEATURE_COLUMNS]
