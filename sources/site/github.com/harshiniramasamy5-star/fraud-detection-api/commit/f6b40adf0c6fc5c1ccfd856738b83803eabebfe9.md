# Source: https://github.com/harshiniramasamy5-star/fraud-detection-api/commit/f6b40adf0c6fc5c1ccfd856738b83803eabebfe9

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[fraud-detection-api](https://github.com/harshiniramasamy5-star/fraud-detection-api)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
 

 

## File tree

Expand file treeCollapse file tree

TopOpen diff view settings

Filter options

- app
 
 - [main.py](https://github.com/#diff-990f7e4140fab1ad82afc787505090b64d4024e63a891405cd9085e7e6b249dd)
 

Expand file treeCollapse file tree

Top

 

Open diff view settings

Collapse file

### [`‎app/main.py‎`](https://github.com/#diff-990f7e4140fab1ad82afc787505090b64d4024e63a891405cd9085e7e6b249dd)

Copy file name to clipboardExpand all lines: app/main.py

+58\-14Lines changed: 58 additions & 14 deletions

| Original file line number | Diff line number | Diff line change |
| --- | --- | --- |
| 
`   @@ -7,11 +7,17 @@   `

 |
| `7` | `7` | `   # Column order must match training: Time, V1..V28, Amount   ` |
| `8` | `8` | `   COLS = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]   ` |
| `9` | `9` | `       ` |
| | `10` | `+  # Decision threshold. The default 0.5 assumes false positives and false  ` |
| | `11` | `+  # negatives cost the same; in fraud they do not. This should be set to the  ` |
| | `12` | `+  # value chosen during training (e.g. the recall-constrained optimum) so the  ` |
| | `13` | `+  # model optimizes total cost rather than raw accuracy.  ` |
| | `14` | `+  THRESHOLD = 0.5  ` |
| | `15` | `+  ` |
| `10` | `16` | `   # Load model and scaler once at startup   ` |
| `11` | `17` | `   model = joblib.load("model/fraud_model.pkl")   ` |
| `12` | `18` | `   scaler = joblib.load("model/scaler.pkl")   ` |
| `13` | `19` | `       ` |
| `14` | | `-  app = FastAPI(title="Fraud Detection API")  ` |
| | `20` | `+  app = FastAPI(title="Fraud Detection API", version="2.0")  ` |
| `15` | `21` | `       ` |
| `16` | `22` | `   app.add_middleware(   ` |
| `17` | `23` | `   CORSMiddleware,   ` |
| 

`   @@ -25,6 +31,44 @@ class Transaction(BaseModel):   `

 |
| `25` | `31` | `   features: list[float] # 30 values in COLS order   ` |
| `26` | `32` | `       ` |
| `27` | `33` | `       ` |
| | `34` | `+  class TransactionBatch(BaseModel):  ` |
| | `35` | `+  transactions: list[Transaction]  ` |
| | `36` | `+  ` |
| | `37` | `+  ` |
| | `38` | `+  def _risk_level(prob: float) -> str:  ` |
| | `39` | `+  """Bucket a fraud probability into an operational risk level.  ` |
| | `40` | `+  ` |
| | `41` | `+  Mirrors how a real system routes transactions to different actions:  ` |
| | `42` | `+  clear automatically, queue for review, hold, or block outright.  ` |
| | `43` | `+  """  ` |
| | `44` | `+  if prob >= 0.95:  ` |
| | `45` | `+  return "CRITICAL" # block immediately  ` |
| | `46` | `+  if prob >= 0.80:  ` |
| | `47` | `+  return "HIGH" # hold and review  ` |
| | `48` | `+  if prob >= THRESHOLD:  ` |
| | `49` | `+  return "MEDIUM" # flag for review  ` |
| | `50` | `+  return "LOW" # clears automatically  ` |
| | `51` | `+  ` |
| | `52` | `+  ` |
| | `53` | `+  def _score(features: list[float]) -> dict:  ` |
| | `54` | `+  """Score a single feature vector and return the full decision payload."""  ` |
| | `55` | `+  if len(features) != len(COLS):  ` |
| | `56` | `+  raise HTTPException(  ` |
| | `57` | `+  status_code=422,  ` |
| | `58` | `+  detail=f"Expected {len(COLS)} features, got {len(features)}",  ` |
| | `59` | `+  )  ` |
| | `60` | `+  df = pd.DataFrame([features], columns=COLS)  ` |
| | `61` | `+  # Scale only Time and Amount, exactly as during training  ` |
| | `62` | `+  df[["Time", "Amount"]] = scaler.transform(df[["Time", "Amount"]])  ` |
| | `63` | `+  probability = float(model.predict_proba(df)[0][1])  ` |
| | `64` | `+  return {  ` |
| | `65` | `+  "fraud": probability >= THRESHOLD,  ` |
| | `66` | `+  "fraud_probability": round(probability, 4),  ` |
| | `67` | `+  "risk_level": _risk_level(probability),  ` |
| | `68` | `+  "threshold_used": THRESHOLD,  ` |
| | `69` | `+  }  ` |
| | `70` | `+  ` |
| | `71` | `+  ` |
| `28` | `72` | `   @app.get("/")   ` |
| `29` | `73` | `   def root():   ` |
| `30` | `74` | `   return {"message": "Fraud Detection API is running", "docs": "/docs"}   ` |
| 

`   @@ -37,17 +81,17 @@ def health():   `

 |
| `37` | `81` | `       ` |
| `38` | `82` | `   @app.post("/predict")   ` |
| `39` | `83` | `   def predict(txn: Transaction):   ` |
| `40` | | `-  if len(txn.features) != len(COLS):  ` |
| `41` | | `-  raise HTTPException(  ` |
| `42` | | `-  status_code=422,  ` |
| `43` | | `-  detail=f"Expected {len(COLS)} features, got {len(txn.features)}",  ` |
| `44` | | `-  )  ` |
| `45` | | `-  df = pd.DataFrame([txn.features], columns=COLS)  ` |
| `46` | | `-  # Scale only Time and Amount, exactly as during training  ` |
| `47` | | `-  df[["Time", "Amount"]] = scaler.transform(df[["Time", "Amount"]])  ` |
| `48` | | `-  prediction = int(model.predict(df)[0])  ` |
| `49` | | `-  probability = float(model.predict_proba(df)[0][1])  ` |
| | `84` | `+  return _score(txn.features)  ` |
| | `85` | `+  ` |
| | `86` | `+  ` |
| | `87` | `+  @app.post("/predict/batch")  ` |
| | `88` | `+  def predict_batch(batch: TransactionBatch):  ` |
| | `89` | `+  results = [_score(t.features) for t in batch.transactions]  ` |
| | `90` | `+  flagged = sum(1 for r in results if r["fraud"])  ` |
| | `91` | `+  total = len(results)  ` |
| `50` | `92` | `   return {   ` |
| `51` | | `-  "fraud": bool(prediction),  ` |
| `52` | | `-  "fraud_probability": round(probability, 4),  ` |
| `53` | | `-  }  ` |
| | `93` | `+  "predictions": results,  ` |
| | `94` | `+  "total_transactions": total,  ` |
| | `95` | `+  "flagged_as_fraud": flagged,  ` |
| | `96` | `+  "fraud_rate_in_batch": round(flagged / total, 4) if total else 0.0,  ` |
| | `97` | `+  }  ` |

## 0 commit comments

Comments

0 (0)

Please [sign in](https://github.com/login?return_to=https://github.com/harshiniramasamy5-star/fraud-detection-api/commit/f6b40adf0c6fc5c1ccfd856738b83803eabebfe9) to comment.