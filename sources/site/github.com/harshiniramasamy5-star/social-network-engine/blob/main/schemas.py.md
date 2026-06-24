# Source: https://github.com/harshiniramasamy5-star/social-network-engine/blob/main/schemas.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[social-network-engine](https://github.com/harshiniramasamy5-star/social-network-engine)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
 

 

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

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/social-network-engine/commits?author=harshiniramasamy5-star)

[Initial commit — Social Network Analytics Engine](https://github.com/harshiniramasamy5-star/social-network-engine/commit/122198bab9439887f70267c8c5fe72876ded96ce)

May 3, 2026

[122198b](https://github.com/harshiniramasamy5-star/social-network-engine/commit/122198bab9439887f70267c8c5fe72876ded96ce) · May 3, 2026

## History

[History](https://github.com/harshiniramasamy5-star/social-network-engine/commits/main/schemas.py)

Open commit details

History

24 lines (20 loc) · 507 Bytes

## FilesExpand file tree

 main

/

# schemas.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

24 lines (20 loc) · 507 Bytes

[Raw](https://github.com/harshiniramasamy5-star/social-network-engine/raw/refs/heads/main/schemas.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from pydantic import BaseModel from typing import Optional, List class UserCreate(BaseModel): user\_id: int name: str bio: Optional\[str\] = "" class FollowRequest(BaseModel): follower\_id: int followee\_id: int class Post(BaseModel): post\_id: str author\_id: int content: str likes: Optional\[int\] = 0 comments: Optional\[int\] = 0 shares: Optional\[int\] = 0 recency\_score: Optional\[float\] = 1.0 class FeedRequest(BaseModel): user\_id: int posts: List\[Post\]

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

from pydantic import BaseModel

from typing import Optional, List

class UserCreate(BaseModel):

user\_id: int

name: str

bio: Optional\[str\] \= ""

class FollowRequest(BaseModel):

follower\_id: int

followee\_id: int

class Post(BaseModel):

post\_id: str

author\_id: int

content: str

likes: Optional\[int\] \= 0

comments: Optional\[int\] \= 0

shares: Optional\[int\] \= 0

recency\_score: Optional\[float\] \= 1.0

class FeedRequest(BaseModel):

user\_id: int

posts: List\[Post\]