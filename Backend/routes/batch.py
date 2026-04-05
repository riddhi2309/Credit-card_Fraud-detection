import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
import pandas as pd
from services.preprocess import preprocess_batch, FEATURE_COLUMNS
from services import model_service

batch_bp = Blueprint("batch", __name__)


@batch_bp.route("/predict_batch", methods=["POST"])
def predict_batch():
    """
    Upload a CSV of transactions → get every row scored.

    Form field: file=<your.csv>
    CSV must have columns: Time, V1..V28, Amount
    Optional column: Class  (enables F1 + AUC metrics)

    Response:
    {
      "total": 1000,
      "fraud_count": 12,
      "legit_count": 988,
      "fraud_rate": 0.012,
      "predictions": [ { "row":1, "fraud":false, "fraud_probability":0.03, ... } ],
      "metrics": { ... }   // only if Class column present
    }
    """
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided — use field name 'file'"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
        if not file.filename.lower().endswith(".csv"):
            return jsonify({"error": "Only .csv files accepted"}), 400

        filename  = secure_filename(file.filename)
        save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        file.save(save_path)

        df = pd.read_csv(save_path)

        missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
        if missing:
            return jsonify({"error": f"Missing columns: {missing}"}), 400

        scaler   = model_service.get_scaler()
        features = preprocess_batch(df[FEATURE_COLUMNS].copy(), scaler)
        probas   = model_service.predict_proba(features)
        preds    = (probas >= 0.5).astype(int)

        rows = [
            {
                "row":               i + 1,
                "fraud":             bool(p),
                "fraud_probability": round(float(prob), 4),
                "confidence":        model_service.confidence(float(prob)),
                "risk_level":        model_service.risk_level(float(prob)),
            }
            for i, (prob, p) in enumerate(zip(probas, preds))
        ]

        fraud_count = int(preds.sum())
        response = {
            "total":        len(df),
            "fraud_count":  fraud_count,
            "legit_count":  len(df) - fraud_count,
            "fraud_rate":   round(fraud_count / len(df), 4),
            "predictions":  rows,
            "download_url": "/download/batch_predictions.csv",
        }

        # Metrics — only if Class column exists
        if "Class" in df.columns:
            from sklearn.metrics import f1_score, roc_auc_score, precision_score, recall_score
            y_true = df["Class"].astype(int).values
            response["metrics"] = {
                "f1_score":  round(float(f1_score(y_true, preds, zero_division=0)), 4),
                "auc_roc":   round(float(roc_auc_score(y_true, probas)), 4),
                "precision": round(float(precision_score(y_true, preds, zero_division=0)), 4),
                "recall":    round(float(recall_score(y_true, preds, zero_division=0)), 4),
            }

        # Save annotated output CSV
        out_df = df.copy()
        out_df["Predicted_Fraud"]   = preds.astype(bool)
        out_df["Fraud_Probability"] = probas.round(4)
        out_df["Risk_Level"]        = [model_service.risk_level(p) for p in probas]
        out_path = os.path.join(current_app.config["UPLOAD_FOLDER"], "batch_predictions.csv")
        out_df.to_csv(out_path, index=False)

        return jsonify(response), 200

    except RuntimeError as e:
        return jsonify({"error": str(e), "status": "model_unavailable"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@batch_bp.route("/download/<filename>", methods=["GET"])
def download(filename):
    """Download the annotated batch predictions CSV."""
    safe = secure_filename(filename)
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"], safe, as_attachment=True
    )
