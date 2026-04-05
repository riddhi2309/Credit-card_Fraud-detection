import time
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from services import model_service

health_bp = Blueprint("health", __name__)
_start    = time.time()


@health_bp.route("/health", methods=["GET"])
def health():
    elapsed   = int(time.time() - _start)
    h, rem    = divmod(elapsed, 3600)
    m, s      = divmod(rem, 60)
    ms        = model_service.status()

    return jsonify({
        "status":    "online",
        "uptime":    f"{h}h {m}m {s}s",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "models":    ms,
    }), 200


@health_bp.route("/reload", methods=["POST"])
def reload():
    result = model_service.reload()
    return jsonify({"message": "Models reloaded", "models": result}), 200
