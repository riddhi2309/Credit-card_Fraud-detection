# FraudShield — AI-Powered Credit Card Fraud Detection

A full-stack fraud detection product built with a GAN-based synthetic data pipeline,
an XGBoost + VAE ensemble model, a Flask REST API, and a React dashboard.

---

## What This Project Does

FraudShield solves one of the hardest problems in fraud detection — **extreme class imbalance**.
The real dataset has 284,315 legitimate transactions and only 492 fraud cases (0.17%).

Instead of simple oversampling (SMOTE), this project uses a **Generative Adversarial Network
(CTGAN)** to synthesize realistic fraud transactions, trains an **XGBoost classifier** on
that balanced synthetic data, and combines it with a **Variational Autoencoder (VAE)**
that detects anomalies by reconstruction error — giving a final ensemble score.

---

## Project Structure

```
AI_synthetic_data/
│
├── Backend/                          Flask REST API
│   ├── app.py                        Entry point — run this to start the server
│   ├── requirements.txt              Python dependencies
│   ├── .env                          Environment config (PORT, CORS origins)
│   ├── train_vae.py                  VAE training script (Phase 2)
│   │
│   ├── routes/
│   │   ├── health.py                 GET /health, POST /reload
│   │   ├── predict.py                POST /predict, POST /explain
│   │   └── batch.py                  POST /predict_batch, GET /download/<file>
│   │
│   ├── services/
│   │   ├── model_service.py          Loads all .pkl files, runs inference
│   │   └── preprocess.py             Preprocessing logic (mirrors notebook)
│   │
│   └── uploads/                      Auto-created, batch CSVs saved here
│
├── fraudshield/                      React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx           Product homepage
│   │   │   ├── Dashboard.jsx         Live fraud feed with charts
│   │   │   ├── BatchUpload.jsx       CSV upload and batch scoring
│   │   │   └── Playground.jsx        API explorer and live tester
│   │   ├── components/
│   │   │   ├── Sidebar.jsx           Navigation with live API status
│   │   │   ├── Layout.jsx            Page wrapper
│   │   │   └── RiskBadge.jsx         Risk level pill (High/Medium/Low)
│   │   ├── hooks/
│   │   │   └── useApi.js             All Flask API calls in one place
│   │   └── lib/
│   │       └── utils.js              Helpers + real sample transactions
│   ├── .env                          VITE_API_URL=http://localhost:5000
│   └── package.json
│
├── creditcard.csv                    Raw Kaggle dataset
├── preprocessed_creditcard.csv       Scaled dataset (Time + Amount normalized)
├── synthetic_creditcard.csv          CTGAN-generated balanced dataset
├── code.ipynb                        Full training pipeline notebook
├── train_vae.ipynb                   VAE training notebook
│
├── scaler.pkl                        MinMaxScaler (Time + Amount)
├── fraud_classification.pkl          Trained XGBoost classifier
├── ctgan_model.pkl                   Trained CTGAN synthesizer
├── vae_model.pt                      Trained VAE encoder
├── vae_scaler.pkl                    VAE-specific feature scaler
└── metadata.json                     SDV table metadata
```

---

## ML Pipeline

```
Raw CSV (creditcard.csv)
        │
        ▼
Preprocessing
  • Fill nulls with column mean
  • MinMaxScaler on Time + Amount only
  • V1–V28 pass through unchanged (already PCA-transformed)
  • Save scaler.pkl
        │
        ▼
CTGAN Training (300 epochs, GPU)
  • Learns the joint distribution of all 31 features
  • Generates 5,000 fraud + 5,000 legit synthetic rows
  • Saves ctgan_model.pkl + synthetic_creditcard.csv
        │
        ▼
XGBoost Training
  • Trained on 10,000 synthetic rows (balanced 50/50)
  • Evaluated on real held-out test set
  • Saves fraud_classification.pkl
        │
        ▼
VAE Training (50 epochs, CPU)
  • Trained on legitimate transactions only
  • Learns what "normal" looks like
  • High reconstruction error = suspicious transaction
  • Saves vae_model.pt + vae_scaler.pkl + vae_threshold.pkl
        │
        ▼
Ensemble Scoring
  final_score = 0.7 × XGBoost_probability
              + 0.3 × normalized_VAE_reconstruction_error
        │
        ▼
Flask API → React Dashboard
```

---

## Dataset

- **Source:** [Kaggle Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- **Size:** 284,807 transactions
- **Fraud cases:** 492 (0.17%)
- **Features:** Time, V1–V28 (PCA-transformed), Amount, Class
- **Class imbalance ratio:** 578:1 (legit:fraud)

---

## Model Files

| File | Description | Size |
|---|---|---|
| `scaler.pkl` | MinMaxScaler fitted on raw Time + Amount | ~1 KB |
| `fraud_classification.pkl` | XGBoost classifier | ~500 KB |
| `ctgan_model.pkl` | CTGANSynthesizer (GPU-trained) | ~50 MB |
| `vae_model.pt` | VAE encoder weights | ~200 KB |
| `vae_scaler.pkl` | MinMaxScaler for all 30 VAE features | ~1 KB |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Model status, uptime, scoring mode |
| POST | `/reload` | Hot-reload models without restarting Flask |
| POST | `/predict` | Score a single transaction |
| POST | `/explain` | Score + SHAP feature attributions |
| POST | `/predict_batch` | Upload CSV, score all rows |
| GET | `/download/<file>` | Download annotated batch predictions |

### POST /predict — Request

```json
{
  "Time": 0.000133,
  "V1": 1.173, "V2": 0.353, "V3": 0.284,
  "V4": 1.134, "V5": -0.173, "V6": -0.916,
  "V7": 0.369, "V8": -0.327, "V9": -0.247,
  "V10": -0.046, "V11": -0.143, "V12": 0.979,
  "V13": 1.492, "V14": 0.101, "V15": 0.761,
  "V16": -0.015, "V17": -0.512, "V18": -0.325,
  "V19": -0.391, "V20": 0.028, "V21": 0.067,
  "V22": 0.228, "V23": -0.150, "V24": 0.435,
  "V25": 0.725, "V26": -0.337, "V27": 0.016,
  "V28": 0.030, "Amount": 149.62
}
```

### POST /predict — Response

```json
{
  "fraud": false,
  "fraud_probability": 0.0312,
  "confidence": "Low",
  "risk_level": "low"
}
```

---

## Setup & Running

### Prerequisites

- Python 3.10+
- Node.js 18+
- The model files listed above in `AI_synthetic_data/`

### Backend

```bash
# 1. Go into Backend folder
cd AI_synthetic_data/Backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install PyTorch (for VAE)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# 4. Start the API
python app.py
```

API runs at `http://localhost:5000`

Verify at `http://localhost:5000/health`:
```json
{
  "status": "online",
  "models": {
    "scaler": true,
    "classifier": true,
    "vae": true,
    "ctgan": false
  },
  "mode": "ensemble"
}
```

> **Note on CTGAN:** The model was trained with `cuda=True` and cannot load on
> a CPU-only machine. This only disables the `/generate` endpoint.
> All prediction endpoints work normally.

### Frontend

```bash
# 1. Go into fraudshield folder
cd AI_synthetic_data/fraudshield

# 2. Install dependencies
npm install

# 3. Create environment file
echo VITE_API_URL=http://localhost:5000 > .env

# 4. Start dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Product homepage with model stats and pipeline overview |
| Dashboard | `/dashboard` | Live feed — scores real transactions every 3 seconds via `/predict` |
| Batch Upload | `/batch` | Drag & drop CSV → all rows scored → download annotated CSV |
| API Playground | `/playground` | Test any endpoint live, view SHAP explanations |

---

## Tech Stack

### Backend
| Library | Version | Purpose |
|---|---|---|
| Flask | 3.0.3 | REST API framework |
| flask-cors | 4.0.0 | Cross-origin requests from React |
| XGBoost | 2.0.3 | Fraud classifier |
| scikit-learn | 1.4.1 | MinMaxScaler, metrics |
| PyTorch | 2.x | VAE encoder |
| SDV | 1.9.0 | CTGAN synthesizer |
| pandas | 2.2.1 | Data manipulation |
| shap | 0.44.1 | Feature explanations (optional) |

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Framer Motion | 11.x | Animations |
| Recharts | 2.x | Charts |
| React Router | 6.x | Client-side routing |
| Lucide React | 0.383 | Icons |

---

## Key Design Decisions

**Why CTGAN instead of SMOTE?**
SMOTE interpolates between existing fraud samples, creating synthetic points
along straight lines in feature space. CTGAN learns the full joint distribution
of all features — including complex correlations between PCA components — and
generates more realistic samples that better represent the true fraud population.

**Why train XGBoost on synthetic data and test on real data?**
This is the TSTR (Train on Synthetic, Test on Real) evaluation paradigm.
It validates that the synthetic data is actually useful — if the model
trained only on synthetic data generalises to real transactions, the
synthetic data has captured the real data's statistical properties.

**Why add a VAE on top of XGBoost?**
XGBoost learns from patterns seen in training data. A VAE trained on
legitimate transactions learns a compressed representation of "normal".
Fraud transactions don't fit that representation, producing high reconstruction
error. This catches novel fraud patterns that look different from the synthetic
fraud used to train XGBoost — making the ensemble more robust.

---

## Deployment

### Backend → Render.com (free tier)

1. Push `Backend/` to a GitHub repository
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `gunicorn app:app`
5. Add environment variables:
   - `FLASK_ENV=production`
   - `ALLOWED_ORIGINS=https://your-frontend.vercel.app`

### Frontend → Vercel (free tier)

1. Push `fraudshield/` to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Framework preset: **Vite**
4. Add environment variable:
   - `VITE_API_URL=https://your-backend.onrender.com`

---

## Known Limitations

- CTGAN model cannot be loaded on CPU — it was trained with `cuda=True`.
  The `/generate` endpoint is disabled on CPU machines.
- sklearn version mismatch warnings on load (1.7.0 → 1.7.2) are harmless
  and do not affect model accuracy.
- The dashboard live feed uses 8 real transactions from the dataset on a
  3-second loop. In a production system this would connect to a real
  transaction stream.

---

## Author

Built by Riddh as a Semester 6 Machine Learning project.
Combines cybersecurity domain knowledge with generative ML techniques
for production-grade fraud detection.