# Source: https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[fraud-detection-api](https://github.com/harshiniramasamy5-star/fraud-detection-api)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
 

 

 main

[Branches](https://github.com/harshiniramasamy5-star/fraud-detection-api/branches) [Tags](https://github.com/harshiniramasamy5-star/fraud-detection-api/tags)

Go to file

Code

Open more actions menu

## Folders and files

| Name | Name | 
Last commit message

 | 

Last commit date

 |
| --- | --- | --- | --- |
| 

## Latest commit

## History

[9 Commits](https://github.com/harshiniramasamy5-star/fraud-detection-api/commits/main/)

9 Commits

 |
| 

[.github/workflows](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/.github/workflows 'This path skips through empty directories')

 | 

[.github/workflows](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/.github/workflows 'This path skips through empty directories')

 | 

 | 

 |
| 

[app](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/app 'app')

 | 

[app](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/app 'app')

 | 

 | 

 |
| 

[model](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/model 'model')

 | 

[model](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/model 'model')

 | 

 | 

 |
| 

[notebooks](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/notebooks 'notebooks')

 | 

[notebooks](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/notebooks 'notebooks')

 | 

 | 

 |
| 

[tests](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/tests 'tests')

 | 

[tests](https://github.com/harshiniramasamy5-star/fraud-detection-api/tree/main/tests 'tests')

 | 

 | 

 |
| 

[.dockerignore](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/.dockerignore '.dockerignore')

 | 

[.dockerignore](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/.dockerignore '.dockerignore')

 | 

 | 

 |
| 

[.gitignore](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/.gitignore '.gitignore')

 | 

[.gitignore](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/.gitignore '.gitignore')

 | 

 | 

 |
| 

[Dockerfile](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/Dockerfile 'Dockerfile')

 | 

[Dockerfile](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/Dockerfile 'Dockerfile')

 | 

 | 

 |
| 

[README.md](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/README.md 'README.md')

 | 

[README.md](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/README.md 'README.md')

 | 

 | 

 |
| 

[pytest.ini](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/pytest.ini 'pytest.ini')

 | 

[pytest.ini](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/pytest.ini 'pytest.ini')

 | 

 | 

 |
| 

[requirements.txt](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/requirements.txt 'requirements.txt')

 | 

[requirements.txt](https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/requirements.txt 'requirements.txt')

 | 

 | 

 |
| 

View all files

 |

## Repository files navigation

# 🛡️ Fraud Detection — End-to-End ML System

**A credit-card fraud detection model, trained on 284,807 real transactions, served through a FastAPI REST API, containerized with Docker, deployed on Render, and demonstrated with two live front-ends — including a real-time evaluation that streams held-out transactions through the deployed model and scores its verdicts against ground truth.**

[![Live API](https://camo.githubusercontent.com/7e5a009a58d5e3845cf93cfb01c5077692ff0958ebc7eb854b2e22f37a4c78cb/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4150492d6c6976652d3232643339613f7374796c653d666c61742d737175617265)](https://fraud-detection-api-5eog.onrender.com/docs) [![Live Demo](https://camo.githubusercontent.com/ffc00c8e5c592645ff464dd9704e614e02cc2631036de426c61e8672254ed058/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f64656d6f2d53656e74696e656c2d3562386366663f7374796c653d666c61742d737175617265)](https://fraud-detection-ui-y8ch.onrender.com/app.html) [![Model](https://camo.githubusercontent.com/7fda3e6078d5036b9f8913a444963f81c3d13029778b389f498b20ecc49b86eb/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6d6f64656c2d5847426f6f73742d6f72616e67653f7374796c653d666c61742d737175617265)](https://github.com/#-the-model) [![Recall](https://camo.githubusercontent.com/8c2e788da101100180b940f1b3f139c9bd6c94c9c4aacb12f0dfef7ba3ba7acb/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f726563616c6c2d302e38362d3232643339613f7374796c653d666c61742d737175617265)](https://github.com/#-results) [![ROC--AUC](https://camo.githubusercontent.com/6520e4cbff7729894612ce779381a0c6b250f42deaf06831f9ccebcbc7ffdd0a/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f524f432d2d4155432d302e3938352d3232643339613f7374796c653d666c61742d737175617265)](https://github.com/#-results)

---

## 🔗 Live links

| What | URL |
| --- | --- |
| **Interactive API docs (Swagger)** | [https://fraud-detection-api-5eog.onrender.com/docs](https://fraud-detection-api-5eog.onrender.com/docs) |
| **FraudScope** — single-transaction scorer | [https://fraud-detection-ui-y8ch.onrender.com](https://fraud-detection-ui-y8ch.onrender.com) |
| **Sentinel** — live streaming evaluation | [https://fraud-detection-ui-y8ch.onrender.com/app.html](https://fraud-detection-ui-y8ch.onrender.com/app.html) |

> ⏱️ The API runs on Render's free tier and sleeps after inactivity — the first request may take ~30–50 seconds to wake. Subsequent requests are fast.

---

## 📌 What this project demonstrates

This isn't a notebook that ends at `model.fit()`. It's the full path from raw data to a running service that other software can call:

- **The modelling problem done honestly** — severe class imbalance (0.17% fraud), cost-sensitive evaluation, and a deliberate precision/recall trade-off rather than chasing accuracy.
- **The engineering around the model** — a typed REST API with input validation, risk-tier decisioning, batch scoring, containerization, and CI.
- **Proof it actually works in production** — a front-end that streams real held-out transactions through the _deployed_ model over HTTP and evaluates its live verdicts against hidden labels.

---

## 🧠 The model

| | |
| --- | --- |
| **Algorithm** | XGBoost (gradient-boosted trees) |
| **Dataset** | [ULB Credit Card Fraud](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) — 284,807 transactions, 492 fraud (0.17%) |
| **Features** | 30 — `Time`, `V1…V28` (PCA components), `Amount` |
| **Imbalance handling** | `scale_pos_weight` (cost-weighting the minority class) |
| **Preprocessing** | `StandardScaler` on `Time` and `Amount`; `V1–V28` already PCA-scaled |
| **Baseline compared against** | Logistic Regression — XGBoost was kept only because it beat the baseline |

Three models were trained and compared (Logistic Regression → class-balanced LR → XGBoost). XGBoost won on the metric that matters for fraud: **catching fraud (recall) without drowning in false alarms (precision)**.

---

## 📊 Results

Evaluated on a held-out 20% test set (56,962 transactions, 98 fraud):

| Metric (fraud class) | Value | What it means |
| --- | --- | --- |
| **Recall** | **0.86** | 84 of 98 frauds caught |
| **Precision** | **0.64** | of everything flagged, 64% was real fraud |
| **ROC-AUC** | **0.985** | strong separation of fraud vs legitimate |
| **False negatives** | **14** | frauds missed (the expensive error) |
| **False positives** | **48** | false alarms (a cheap manual review) |

**Confusion matrix**

```
                 Predicted
                 Legit    Fraud
Actual  Legit   56816       48
        Fraud      14       84
```

### Why not optimize for accuracy?

With fraud at 0.17%, a model that predicts "never fraud" scores **99.83% accuracy** and catches **zero** fraud. Accuracy is meaningless here. The two errors also cost wildly different amounts: a **missed fraud** can cost the full transaction value, while a **false alarm** costs a brief manual review. The decision threshold is therefore tuned toward **recall**, and the API returns operational **risk tiers** instead of a bare yes/no.

---

## 🏗️ Architecture

Loading

flowchart LR
 subgraph Training\["Offline - Training"\]
 D\[(Kaggle dataset<br/>284807 txns)\] --> P\[Preprocess<br/>StandardScaler\]
 P --> T\[Train and compare<br/>LR / balanced LR / XGBoost\]
 T --> M\[/fraud\_model.pkl<br/>scaler.pkl/\]
 end

 subgraph Serving\["Online - Serving"\]
 M --> API\[FastAPI service<br/>Uvicorn\]
 API --> DK\[Docker container\]
 DK --> R\[(Render<br/>Singapore)\]
 end

 subgraph Clients\["Clients"\]
 FS\[FraudScope<br/>single scorer\]
 SE\[Sentinel<br/>streaming eval\]
 end

 R -->|POST /predict| FS
 R -->|POST /predict| SE
 GH\[GitHub Actions CI\] -.->|test on push| API

### Request lifecycle for a single prediction

Loading

sequenceDiagram
 participant C as Client
 participant A as FastAPI
 participant S as Scaler
 participant M as XGBoost

 C->>A: POST /predict { features: 30 values }
 A->>A: validate length == 30
 A->>S: scale Time and Amount
 S-->>A: scaled feature row
 A->>M: predict\_proba(row)
 M-->>A: fraud probability
 A->>A: probability >= threshold? map to risk tier
 A-->>C: { fraud, fraud\_probability, risk\_level, threshold\_used }

---

## 🚦 Risk-tier decisioning

The API does not return a bare boolean. It maps the calibrated probability to an operational action — mirroring how real fraud systems route transactions:

| Risk level | Probability | Action |
| --- | --- | --- |
| `LOW` | below threshold | clears automatically |
| `MEDIUM` | threshold – 0.80 | queued for manual review |
| `HIGH` | 0.80 – 0.95 | held and reviewed |
| `CRITICAL` | ≥ 0.95 | blocked immediately |

---

## 🔌 API reference

### `GET /health`

Liveness check → `{ "status": "ok" }`

### `POST /predict`

Score a single transaction.

**Request**

```json
{ "features": [0, -1.359, -0.072, "…28 more…", 149.62] }
```

**Response**

```json
{
  "fraud": false,
  "fraud_probability": 0.0021,
  "risk_level": "LOW",
  "threshold_used": 0.5
}
```

### `POST /predict/batch`

Score many transactions in one request; returns per-transaction results plus a summary (`total_transactions`, `flagged_as_fraud`, `fraud_rate_in_batch`) — the shape a downstream monitoring job would consume.

---

## 🖥️ The two front-ends

**FraudScope** (`/`) — paste a feature vector or load a sample; the page scores it live and shows the verdict with a probability meter and risk badge. The simple, technical demo.

**Sentinel** (`/app.html`) — the headline demo. A held-out sample of **200 real transactions** (180 legitimate, 20 fraud) is streamed through the deployed model. The model scores each row **live, with no access to the true label**; Sentinel then compares each verdict against the hidden ground truth and tracks **caught fraud, misses, false alarms, recall, and precision in real time** — a genuine evaluation of the deployed model, not a scripted animation.

Loading

flowchart LR
 J\[(200 real held-out rows<br/>labels hidden)\] --> Q\[Stream one by one\]
 Q -->|POST /predict| API\[Deployed model\]
 API --> V{verdict vs<br/>hidden label}
 V -->|fraud + flagged| TP\[caught\]
 V -->|fraud + missed| FN\[missed\]
 V -->|legit + flagged| FP\[false alarm\]
 V -->|legit + cleared| TN\[cleared\]
 TP --> SC\[Live scorecard<br/>recall / precision\]
 FN --> SC
 FP --> SC
 TN --> SC

---

## 🛠️ Tech stack

**ML / Data** · Python · scikit-learn · XGBoost · pandas · joblib **API** · FastAPI · Pydantic · Uvicorn **Infra** · Docker · Render · GitHub Actions (CI) **Front-end** · Vanilla JS · HTML · CSS · Fetch API

---

## 📁 Project structure

```
fraud-detection-api/
├── app/
│   ├── __init__.py
│   └── main.py            # FastAPI app: /health, /predict, /predict/batch
├── model/
│   ├── fraud_model.pkl    # trained XGBoost model
│   └── scaler.pkl         # fitted StandardScaler
├── notebooks/             # EDA, training, model comparison, SHAP
├── tests/
│   ├── __init__.py
│   └── test_api.py        # pytest — endpoint smoke tests
├── data/                  # dataset (gitignored)
├── .github/workflows/ci.yml
├── Dockerfile
├── pytest.ini
├── requirements.txt
└── README.md
```

---

## ▶️ Run locally

**With Docker (recommended)**

```shell
git clone https://github.com/harshiniramasamy5-star/fraud-detection-api.git
cd fraud-detection-api
docker build -t fraud-api .
docker run -p 8000:8000 fraud-api
# open http://localhost:8000/docs
```

**Without Docker**

```shell
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# open http://localhost:8000/docs
```

**Try a prediction**

```shell
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"features":[0,-1.359,-0.072,2.536,1.378,-0.338,0.462,0.239,0.098,0.363,0.090,-0.551,-0.617,-0.991,-0.311,1.468,-0.470,0.207,0.025,0.403,0.251,-0.018,0.277,-0.110,0.066,0.128,-0.189,0.133,-0.021,149.62]}'
```

---

## 🧪 Continuous integration

Every push triggers a GitHub Actions workflow that installs dependencies and runs the `pytest` suite against the API endpoints, so a broken build is caught before it reaches Render.

---

## 🗺️ Production roadmap

Honest next steps that would take this from a strong portfolio project toward a production system:

- **Feature engineering on human-readable signals** (velocity, amount-vs-user-mean, time-of-day) so predictions are explainable to a human, not just PCA components.
- **Per-prediction SHAP explanations** returned by the API ("flagged because: high amount, unusual hour").
- **Drift monitoring** (PSI between training and live distributions) and scheduled retraining.
- **Model registry & experiment tracking** (MLflow) and observability (Prometheus / Grafana).
- **Tighter CORS** locked to the front-end origin, and pinned `scikit-learn` to the training version to avoid pickle-version drift.

---

Built by **Harshini R.** · CSE @ NIT Warangal Targeting ML / Data Science roles · [GitHub](https://github.com/harshiniramasamy5-star)

## About

Machine learning API for detecting fraudulent transactions, built with FastAPI and Docker

### Topics

[python](https://github.com/topics/python 'Topic: python') [docker](https://github.com/topics/docker 'Topic: docker') [machine-learning](https://github.com/topics/machine-learning 'Topic: machine-learning') [rest-api](https://github.com/topics/rest-api 'Topic: rest-api') [scikit-learn](https://github.com/topics/scikit-learn 'Topic: scikit-learn') [fraud-detection](https://github.com/topics/fraud-detection 'Topic: fraud-detection') [fastapi](https://github.com/topics/fastapi 'Topic: fastapi')

### Resources

[Readme](https://github.com/#readme-ov-file)

### Uh oh!

There was an error while loading. [Please reload this page]().

[Activity](https://github.com/harshiniramasamy5-star/fraud-detection-api/activity)

### Stars

[**0** stars](https://github.com/harshiniramasamy5-star/fraud-detection-api/stargazers)

### Watchers

[**0** watching](https://github.com/harshiniramasamy5-star/fraud-detection-api/watchers)

### Forks

[**0** forks](https://github.com/harshiniramasamy5-star/fraud-detection-api/forks)

[Report repository](https://github.com/contact/report-content?content_url=https%3A%2F%2Fgithub.com%2Fharshiniramasamy5-star%2Ffraud-detection-api&report=harshiniramasamy5-star+%28user%29)

## [Releases](https://github.com/harshiniramasamy5-star/fraud-detection-api/releases)

No releases published

## [Packages 0](https://github.com/users/harshiniramasamy5-star/packages?repo_name=fraud-detection-api)

No packages published 

## [Contributors 1](https://github.com/harshiniramasamy5-star/fraud-detection-api/graphs/contributors)

- [![@harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?s=64&v=4)](https://github.com/harshiniramasamy5-star)[**harshiniramasamy5-star** Harshini Ramasamy](https://github.com/harshiniramasamy5-star)

## Languages

- [Jupyter Notebook 85.2%](https://github.com/harshiniramasamy5-star/fraud-detection-api/search?l=jupyter-notebook)
- [Python 13.9%](https://github.com/harshiniramasamy5-star/fraud-detection-api/search?l=python)
- [Dockerfile 0.9%](https://github.com/harshiniramasamy5-star/fraud-detection-api/search?l=dockerfile)