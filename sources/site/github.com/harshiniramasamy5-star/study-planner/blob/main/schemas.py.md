# Source: https://github.com/harshiniramasamy5-star/study-planner/blob/main/schemas.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[study-planner](https://github.com/harshiniramasamy5-star/study-planner)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
 

 

## FilesExpand file tree

 main

/

# schemas.py

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/study-planner/commits?author=harshiniramasamy5-star)

[Initial commit — Study Planner](https://github.com/harshiniramasamy5-star/study-planner/commit/08c775f1272962e238356a27e0a5c9aa2571a9f4)

May 3, 2026

[08c775f](https://github.com/harshiniramasamy5-star/study-planner/commit/08c775f1272962e238356a27e0a5c9aa2571a9f4) · May 3, 2026

## History

[History](https://github.com/harshiniramasamy5-star/study-planner/commits/main/schemas.py)

Open commit details

History

33 lines (23 loc) · 638 Bytes

## FilesExpand file tree

 main

/

# schemas.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

33 lines (23 loc) · 638 Bytes

[Raw](https://github.com/harshiniramasamy5-star/study-planner/raw/refs/heads/main/schemas.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from pydantic import BaseModel from typing import Optional from datetime import date class SessionCreate(BaseModel): subject\_id: int duration\_minutes: int notes: Optional\[str\] = None date: Optional\[date\] = None class SubjectCreate(BaseModel): name: str daily\_goal\_minutes: int class SubjectOut(SubjectCreate): id: int class Config: from\_attributes = True class SessionOut(BaseModel): id: int subject\_id: int duration\_minutes: int notes: Optional\[str\] = None date: date # ← remove Optional, it WILL always have a date class Config: from\_attributes = True

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

from pydantic import BaseModel

from typing import Optional

from datetime import date

class SessionCreate(BaseModel):

subject\_id: int

duration\_minutes: int

notes: Optional\[str\] \= None

date: Optional\[date\] \= None

class SubjectCreate(BaseModel):

name: str

daily\_goal\_minutes: int

class SubjectOut(SubjectCreate):

id: int

class Config:

from\_attributes \= True

class SessionOut(BaseModel):

id: int

subject\_id: int

duration\_minutes: int

notes: Optional\[str\] \= None

date: date \# ← remove Optional, it WILL always have a date

class Config:

from\_attributes \= True