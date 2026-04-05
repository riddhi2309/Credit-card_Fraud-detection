"""
FraudShield — Flask API
========================
Run from inside the backend/ folder:
    python app.py

Your .pkl files are expected one level up in AI_synthetic_data/:
    ../scaler.pkl
    ../fraud_classification.pkl
    ../ctgan_model.pkl
    ../vae_model.pt   (Phase 2 — optional, run train_vae.py first)
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

app = Flask(__name__)

# Allow requests from React dev server
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
CORS(app, resources={r"/*": {"origins": origins}})

# Upload folder inside backend/
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.config["UPLOAD_FOLDER"]      = UPLOAD_DIR
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024   # 50 MB

# ── Load all models once at startup ──────────────────────────────────────────
from services import model_service
model_service.load_all()

# ── Blueprints ────────────────────────────────────────────────────────────────
from routes.health  import health_bp
from routes.predict import predict_bp
from routes.batch   import batch_bp

app.register_blueprint(health_bp)
app.register_blueprint(predict_bp)
app.register_blueprint(batch_bp)

# ── Error handlers ────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large — max 50 MB"}), 413

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
