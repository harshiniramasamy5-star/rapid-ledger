# Source: https://github.com/harshiniramasamy5-star/study-planner/blob/main/database.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[study-planner](https://github.com/harshiniramasamy5-star/study-planner)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
 

 

## FilesExpand file tree

 main

/

# database.py

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

[History](https://github.com/harshiniramasamy5-star/study-planner/commits/main/database.py)

Open commit details

History

20 lines (15 loc) · 467 Bytes

## FilesExpand file tree

 main

/

# database.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

20 lines (15 loc) · 467 Bytes

[Raw](https://github.com/harshiniramasamy5-star/study-planner/raw/refs/heads/main/database.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from sqlalchemy import create\_engine from sqlalchemy.ext.declarative import declarative\_base from sqlalchemy.orm import sessionmaker DATABASE\_URL = "sqlite:///./study\_planner.db" engine = create\_engine( DATABASE\_URL, connect\_args={"check\_same\_thread": False} ) SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) Base = declarative\_base() def get\_db(): db = SessionLocal() try: yield db finally: db.close()

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

from sqlalchemy import create\_engine

from sqlalchemy.ext.declarative import declarative\_base

from sqlalchemy.orm import sessionmaker

DATABASE\_URL \= "sqlite:///./study\_planner.db"

engine \= create\_engine(

DATABASE\_URL, connect\_args\={"check\_same\_thread": False}

)

SessionLocal \= sessionmaker(autocommit\=False, autoflush\=False, bind\=engine)

Base \= declarative\_base()

def get\_db():

db \= SessionLocal()

try:

yield db

finally:

db.close()