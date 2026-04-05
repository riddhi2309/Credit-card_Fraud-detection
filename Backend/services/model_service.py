import os
import pickle
import logging
import xgboost as xgb
import joblib
log = logging.getLogger(__name__)

# BASE_DIR = Backend/ folder (one level up from services/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

_models = {
    "scaler":     None,
    "classifier": None,
    "ctgan":      None,
    "vae":        None,
}
_errors = {}


def _load_pkl(filename: str):
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        return None, f"{filename} not found at {path}"
    try:
        with open(path, "rb") as f:
            return pickle.load(f), None
    except Exception as e:
        return None, str(e)

def _load_xgb(filename: str):
    path = os.path.join(BASE_DIR, filename)
    if not os.path.exists(path):
        return None, f"{filename} not found"
    try:
        model = xgb.XGBClassifier()
        model.load_model(path)
        return model, None
    except Exception as e:
        return None, str(e)

def load_all():
    _errors.clear()

    # ── Scaler ────────────────────────────────────────────────────────────────
    scaler_path = os.path.join(BASE_DIR, "scaler.joblib")
    try:
        _models["scaler"] = joblib.load(scaler_path)
        log.info("✓ scaler.joblib loaded")
    except Exception as e:
        _errors["scaler"] = str(e)
        log.warning(f"✗ scaler: {e}")

    # ── XGBoost classifier ────────────────────────────────────────────────────
    obj, err = _load_xgb("fraud_classification.ubj")
    if obj is not None:
        _models["classifier"] = obj
        log.info("✓ fraud_classification.ubj loaded")
    else:
        _errors["classifier"] = err
        log.warning(f"✗ classifier: {err}")

    # ── CTGAN ─────────────────────────────────────────────────────────────────
    # Your model was trained with cuda=True. SDV refuses to load it on a
    # CPU-only machine. We catch that specific error and skip gracefully.
    ctgan_path = os.path.join(BASE_DIR, "ctgan_model.pkl")
    if os.path.exists(ctgan_path):
        try:
            from sdv.utils import load_synthesizer
            _models["ctgan"] = load_synthesizer(ctgan_path)
            log.info("✓ ctgan_model.pkl loaded")
        except Exception as e:
            msg = str(e)
            if "GPU" in msg or "cuda" in msg.lower():
                log.info(
                    "  ctgan_model.pkl skipped — model was trained on GPU, "
                    "cannot load on CPU. /generate endpoint disabled. "
                    "To fix: retrain CTGAN with cuda=False or run on your GPU machine."
                )
            else:
                log.warning(f"  CTGAN load failed: {msg}")
    else:
        log.info("  ctgan_model.pkl not found — /generate disabled")

    # ── VAE (Phase 2, optional) ───────────────────────────────────────────────
    # Architecture defined inline — no import from train_vae.py needed
    vae_path = os.path.join(BASE_DIR, "vae_model.pt")
    if os.path.exists(vae_path):
        try:
            import torch
            import torch.nn as nn

            class _VAE(nn.Module):
                def __init__(self, input_dim=30, latent_dim=16):
                    super().__init__()
                    self.encoder = nn.Sequential(
                        nn.Linear(input_dim, 64), nn.ReLU(),
                        nn.Linear(64, 32),        nn.ReLU(),
                    )
                    self.fc_mu      = nn.Linear(32, latent_dim)
                    self.fc_log_var = nn.Linear(32, latent_dim)
                    self.decoder = nn.Sequential(
                        nn.Linear(latent_dim, 32), nn.ReLU(),
                        nn.Linear(32, 64),         nn.ReLU(),
                        nn.Linear(64, input_dim),
                    )

                def encode(self, x):
                    h = self.encoder(x)
                    return self.fc_mu(h), self.fc_log_var(h)

                def reparameterize(self, mu, logvar):
                    std = torch.exp(0.5 * logvar)
                    return mu + std * torch.randn_like(std)

                def decode(self, z):
                    return self.decoder(z)

                def forward(self, x):
                    mu, logvar = self.encode(x)
                    z = self.reparameterize(mu, logvar)
                    return self.decode(z), mu, logvar

            vae = _VAE(input_dim=30)
            vae.load_state_dict(
                torch.load(vae_path, map_location="cpu", weights_only=True)
            )
            vae.eval()
            _models["vae"] = vae
            log.info("✓ vae_model.pt loaded — ensemble mode active")
        except Exception as e:
            log.warning(f"  VAE load failed: {e}")
    else:
        log.info("  vae_model.pt not found — running classifier-only mode")


def reload():
    load_all()
    return status()


def status() -> dict:
    return {
        "scaler":     _models["scaler"] is not None,
        "classifier": _models["classifier"] is not None,
        "ctgan":      _models["ctgan"] is not None,
        "vae":        _models["vae"] is not None,
        "errors":     _errors,
        "mode": (
            "ensemble"    if _models["classifier"] and _models["vae"]
            else "classifier" if _models["classifier"]
            else "degraded"
        ),
    }


def get_scaler():
    return _models["scaler"]


def get_classifier():
    if _models["classifier"] is None:
        raise RuntimeError(
            "Classifier not loaded. Make sure fraud_classification.pkl is in Backend/"
        )
    return _models["classifier"]


def get_ctgan():
    if _models["ctgan"] is None:
        raise RuntimeError(
            "CTGAN not available. It was trained on GPU and cannot load on this CPU machine."
        )
    return _models["ctgan"]


def predict_proba(df):
    """
    Phase 1: XGBoost score only.
    Phase 2: 0.7 * XGBoost + 0.3 * normalised VAE reconstruction error.
    Switches automatically when vae_model.pt is loaded.
    """
    clf   = get_classifier()
    proba = clf.predict_proba(df)[:, 1]

    vae = _models["vae"]
    if vae is not None:
        try:
            import torch
            import numpy as np
            x = torch.tensor(df.values, dtype=torch.float32)
            with torch.no_grad():
                x_hat, _, _ = vae(x)
                errors = ((x - x_hat) ** 2).mean(dim=1).numpy()
            # Normalise VAE error to [0,1] via sigmoid
            vae_norm = 1 / (1 + np.exp(-10 * (errors - 0.5)))
            proba = 0.7 * proba + 0.3 * vae_norm
        except Exception as e:
            log.warning(f"VAE inference failed, falling back to XGBoost only: {e}")

    return proba


def confidence(p: float) -> str:
    if p >= 0.75: return "High"
    if p >= 0.40: return "Medium"
    return "Low"


def risk_level(p: float) -> str:
    if p >= 0.75: return "high"
    if p >= 0.40: return "medium"
    return "low"