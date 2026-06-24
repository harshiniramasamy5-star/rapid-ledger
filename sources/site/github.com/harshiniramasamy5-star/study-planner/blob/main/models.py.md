# Source: https://github.com/harshiniramasamy5-star/study-planner/blob/main/models.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[study-planner](https://github.com/harshiniramasamy5-star/study-planner)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
 

 

## FilesExpand file tree

 main

/

# models.py

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

[History](https://github.com/harshiniramasamy5-star/study-planner/commits/main/models.py)

Open commit details

History

23 lines (15 loc) · 646 Bytes

## FilesExpand file tree

 main

/

# models.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

23 lines (15 loc) · 646 Bytes

[Raw](https://github.com/harshiniramasamy5-star/study-planner/raw/refs/heads/main/models.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from sqlalchemy import Column, Integer, String, Date, ForeignKey from database import Base class StudySession(Base): \_\_tablename\_\_ = "sessions" id = Column(Integer, primary\_key=True, index=True) subject\_id = Column(Integer, ForeignKey("subjects.id")) duration\_minutes = Column(Integer) notes = Column(String, nullable=True) # ✅ MUST allow real dates OR NULL date = Column(Date, nullable=True) class Subject(Base): \_\_tablename\_\_ = "subjects" id = Column(Integer, primary\_key=True, index=True) name = Column(String, unique=True, index=True) daily\_goal\_minutes = Column(Integer, default=60)

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

from sqlalchemy import Column, Integer, String, Date, ForeignKey

from database import Base

class StudySession(Base):

\_\_tablename\_\_ \= "sessions"

id \= Column(Integer, primary\_key\=True, index\=True)

subject\_id \= Column(Integer, ForeignKey("subjects.id"))

duration\_minutes \= Column(Integer)

notes \= Column(String, nullable\=True)

\# ✅ MUST allow real dates OR NULL

date \= Column(Date, nullable\=True)

class Subject(Base):

\_\_tablename\_\_ \= "subjects"

id \= Column(Integer, primary\_key\=True, index\=True)

name \= Column(String, unique\=True, index\=True)

daily\_goal\_minutes \= Column(Integer, default\=60)