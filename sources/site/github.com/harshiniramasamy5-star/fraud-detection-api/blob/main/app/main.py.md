# Source: https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/app/main.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[fraud-detection-api](https://github.com/harshiniramasamy5-star/fraud-detection-api)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
 

 

## FilesExpand file tree

 main

/

# main.py

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/fraud-detection-api/commits?author=harshiniramasamy5-star)

[Add risk levels and batch prediction endpoint](https://github.com/harshiniramasamy5-star/fraud-detection-api/commit/f6b40adf0c6fc5c1ccfd856738b83803eabebfe9)

success

Jun 15, 2026

[f6b40ad](https://github.com/harshiniramasamy5-star/fraud-detection-api/commit/f6b40adf0c6fc5c1ccfd856738b83803eabebfe9) · Jun 15, 2026

## History

[History](https://github.com/harshiniramasamy5-star/fraud-detection-api/commits/main/app/main.py)

Open commit details

History

97 lines (75 loc) · 2.88 KB

## FilesExpand file tree

 main

/

# main.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

97 lines (75 loc) · 2.88 KB

[Raw](https://github.com/harshiniramasamy5-star/fraud-detection-api/raw/refs/heads/main/app/main.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from fastapi import FastAPI, HTTPException from fastapi.middleware.cors import CORSMiddleware from pydantic import BaseModel import joblib import pandas as pd # Column order must match training: Time, V1..V28, Amount COLS = \["Time"\] + \[f"V{i}" for i in range(1, 29)\] + \["Amount"\] # Decision threshold. The default 0.5 assumes false positives and false # negatives cost the same; in fraud they do not. This should be set to the # value chosen during training (e.g. the recall-constrained optimum) so the # model optimizes total cost rather than raw accuracy. THRESHOLD = 0.5 # Load model and scaler once at startup model = joblib.load("model/fraud\_model.pkl") scaler = joblib.load("model/scaler.pkl") app = FastAPI(title="Fraud Detection API", version="2.0") app.add\_middleware( CORSMiddleware, allow\_origins=\["\*"\], allow\_methods=\["\*"\], allow\_headers=\["\*"\], ) class Transaction(BaseModel): features: list\[float\] # 30 values in COLS order class TransactionBatch(BaseModel): transactions: list\[Transaction\] def \_risk\_level(prob: float) -> str: """Bucket a fraud probability into an operational risk level. Mirrors how a real system routes transactions to different actions: clear automatically, queue for review, hold, or block outright. """ if prob >= 0.95: return "CRITICAL" # block immediately if prob >= 0.80: return "HIGH" # hold and review if prob >= THRESHOLD: return "MEDIUM" # flag for review return "LOW" # clears automatically def \_score(features: list\[float\]) -> dict: """Score a single feature vector and return the full decision payload.""" if len(features) != len(COLS): raise HTTPException( status\_code=422, detail=f"Expected {len(COLS)} features, got {len(features)}", ) df = pd.DataFrame(\[features\], columns=COLS) # Scale only Time and Amount, exactly as during training df\[\["Time", "Amount"\]\] = scaler.transform(df\[\["Time", "Amount"\]\]) probability = float(model.predict\_proba(df)\[0\]\[1\]) return { "fraud": probability >= THRESHOLD, "fraud\_probability": round(probability, 4), "risk\_level": \_risk\_level(probability), "threshold\_used": THRESHOLD, } @app.get("/") def root(): return {"message": "Fraud Detection API is running", "docs": "/docs"} @app.get("/health") def health(): return {"status": "ok"} @app.post("/predict") def predict(txn: Transaction): return \_score(txn.features) @app.post("/predict/batch") def predict\_batch(batch: TransactionBatch): results = \[\_score(t.features) for t in batch.transactions\] flagged = sum(1 for r in results if r\["fraud"\]) total = len(results) return { "predictions": results, "total\_transactions": total, "flagged\_as\_fraud": flagged, "fraud\_rate\_in\_batch": round(flagged / total, 4) if total else 0.0, }

1

2

3

4

5

6

7

8

9

10

11

12

13

14

15

16

17

18

19

20

21

22

23

24

25

26

27

28

29

30

31

32

33

34

35

36

37

38

39

40

41

42

43

44

45

46

47

48

49

50

51

52

53

54

55

56

57

58

59

60

61

62

63

64

65

66

67

68

69

70

71

72

73

74

75

76

77

78

79

80

81

82

83

84

85

86

87

88

89

90

91

92

93

94

95

96

97

from fastapi import FastAPI, HTTPException

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import joblib

import pandas as pd

\# Column order must match training: Time, V1..V28, Amount

COLS \= \["Time"\] + \[f"V{i}" for i in range(1, 29)\] + \["Amount"\]

\# Decision threshold. The default 0.5 assumes false positives and false

\# negatives cost the same; in fraud they do not. This should be set to the

\# value chosen during training (e.g. the recall-constrained optimum) so the

\# model optimizes total cost rather than raw accuracy.

THRESHOLD \= 0.5

\# Load model and scaler once at startup

model \= joblib.load("model/fraud\_model.pkl")

scaler \= joblib.load("model/scaler.pkl")

app \= FastAPI(title\="Fraud Detection API", version\="2.0")

app.add\_middleware(

CORSMiddleware,

allow\_origins\=\["\*"\],

allow\_methods\=\["\*"\],

allow\_headers\=\["\*"\],

)

class Transaction(BaseModel):

features: list\[float\] \# 30 values in COLS order

class TransactionBatch(BaseModel):

transactions: list\[Transaction\]

def \_risk\_level(prob: float) \-> str:

"""Bucket a fraud probability into an operational risk level.

Mirrors how a real system routes transactions to different actions:

clear automatically, queue for review, hold, or block outright.

"""

if prob \>= 0.95:

return "CRITICAL" \# block immediately

if prob \>= 0.80:

return "HIGH" \# hold and review

if prob \>= THRESHOLD:

return "MEDIUM" \# flag for review

return "LOW" \# clears automatically

def \_score(features: list\[float\]) \-> dict:

"""Score a single feature vector and return the full decision payload."""

if len(features) != len(COLS):

raise HTTPException(

status\_code\=422,

detail\=f"Expected {len(COLS)} features, got {len(features)}",

)

df \= pd.DataFrame(\[features\], columns\=COLS)

\# Scale only Time and Amount, exactly as during training

df\[\["Time", "Amount"\]\] \= scaler.transform(df\[\["Time", "Amount"\]\])

probability \= float(model.predict\_proba(df)\[0\]\[1\])

return {

"fraud": probability \>= THRESHOLD,

"fraud\_probability": round(probability, 4),

"risk\_level": \_risk\_level(probability),

"threshold\_used": THRESHOLD,

}

@app.get("/")

def root():

return {"message": "Fraud Detection API is running", "docs": "/docs"}

@app.get("/health")

def health():

return {"status": "ok"}

@app.post("/predict")

def predict(txn: Transaction):

return \_score(txn.features)

@app.post("/predict/batch")

def predict\_batch(batch: TransactionBatch):

results \= \[\_score(t.features) for t in batch.transactions\]

flagged \= sum(1 for r in results if r\["fraud"\])

total \= len(results)

return {

"predictions": results,

"total\_transactions": total,

"flagged\_as\_fraud": flagged,

"fraud\_rate\_in\_batch": round(flagged / total, 4) if total else 0.0,

}