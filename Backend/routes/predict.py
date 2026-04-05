from flask import Blueprint, request, jsonify
from services.preprocess import validate_input, preprocess_single, FEATURE_COLUMNS
from services import model_service

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
def predict():
    """
    Score a single transaction.

    Request JSON:
    {
      "Time": 0.000133,
      "V1": 1.173, ..., "V28": 0.030,
      "Amount": 149.62
    }

    Response:
    {
      "fraud": false,
      "fraud_probability": 0.0312,
      "confidence": "Low",
      "risk_level": "low"
    }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        valid, msg = validate_input(data)
        if not valid:
            return jsonify({"error": msg}), 400

        scaler = model_service.get_scaler()
        df     = preprocess_single(data, scaler)
        probas = model_service.predict_proba(df)
        prob   = float(probas[0])

        return jsonify({
            "fraud":             prob >= 0.5,
            "fraud_probability": round(prob, 4),
            "confidence":        model_service.confidence(prob),
            "risk_level":        model_service.risk_level(prob),
        }), 200

    except RuntimeError as e:
        return jsonify({"error": str(e), "status": "model_unavailable"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@predict_bp.route("/explain", methods=["POST"])
def explain():
    """
    Score + SHAP feature attributions for one transaction.
    Requires: pip install shap
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        valid, msg = validate_input(data)
        if not valid:
            return jsonify({"error": msg}), 400

        scaler = model_service.get_scaler()
        df     = preprocess_single(data, scaler)
        probas = model_service.predict_proba(df)
        prob   = float(probas[0])

        # SHAP
        top_features  = None
        shap_available = False
        try:
            import shap
            clf         = model_service.get_classifier()
            explainer   = shap.TreeExplainer(clf)
            shap_vals   = explainer.shap_values(df)
            sv          = shap_vals[1] if isinstance(shap_vals, list) else shap_vals
            pairs       = sorted(
                zip(FEATURE_COLUMNS, sv[0]),
                key=lambda x: abs(x[1]),
                reverse=True
            )
            top_features  = [
                {
                    "feature":    feat,
                    "shap_value": round(float(val), 4),
                    "direction":  "increases risk" if val > 0 else "decreases risk",
                }
                for feat, val in pairs[:8]
            ]
            shap_available = True
        except ImportError:
            pass
        except Exception:
            pass

        return jsonify({
            "fraud":             prob >= 0.5,
            "fraud_probability": round(prob, 4),
            "confidence":        model_service.confidence(prob),
            "risk_level":        model_service.risk_level(prob),
            "shap_available":    shap_available,
            "top_features":      top_features,
        }), 200

    except RuntimeError as e:
        return jsonify({"error": str(e), "status": "model_unavailable"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500
