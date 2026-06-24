# Source: https://github.com/harshiniramasamy5-star/social-network-engine/blob/main/main.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[social-network-engine](https://github.com/harshiniramasamy5-star/social-network-engine)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
 

 

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

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/social-network-engine/commits?author=harshiniramasamy5-star)

[Update main.py](https://github.com/harshiniramasamy5-star/social-network-engine/commit/26b76c1e5632801f0bba194f6fed00c4ce39e85b)

May 3, 2026

[26b76c1](https://github.com/harshiniramasamy5-star/social-network-engine/commit/26b76c1e5632801f0bba194f6fed00c4ce39e85b) · May 3, 2026

## History

[History](https://github.com/harshiniramasamy5-star/social-network-engine/commits/main/main.py)

Open commit details

History

84 lines (70 loc) · 2.58 KB

## FilesExpand file tree

 main

/

# main.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

84 lines (70 loc) · 2.58 KB

[Raw](https://github.com/harshiniramasamy5-star/social-network-engine/raw/refs/heads/main/main.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from fastapi import FastAPI, HTTPException from fastapi.middleware.cors import CORSMiddleware from graph import social from schemas import UserCreate, FollowRequest, Post, FeedRequest from seed\_data import seed seed() app = FastAPI(title="Social Network Analytics Engine") app.add\_middleware( CORSMiddleware, allow\_origins=\["\*"\], allow\_methods=\["\*"\], allow\_headers=\["\*"\], ) @app.post("/users") def create\_user(user: UserCreate): if user.user\_id in social.users: raise HTTPException(400, "User already exists") social.add\_user(user.user\_id, user.name, user.bio) return social.users\[user.user\_id\] @app.get("/users") def get\_users(): return social.all\_users() @app.get("/users/{user\_id}") def get\_user(user\_id: int): user = social.get\_user(user\_id) if not user: raise HTTPException(404, "User not found") return { \*\*user, "followers": social.get\_followers(user\_id), "following": social.get\_following(user\_id), "follower\_count": social.follower\_count(user\_id), "following\_count": social.following\_count(user\_id), } @app.post("/follow") def follow(req: FollowRequest): ok = social.follow(req.follower\_id, req.followee\_id) if not ok: raise HTTPException(400, "Could not follow — check user IDs") return {"message": f"{req.follower\_id} now follows {req.followee\_id}"} @app.post("/unfollow") def unfollow(req: FollowRequest): social.unfollow(req.follower\_id, req.followee\_id) return {"message": f"{req.follower\_id} unfollowed {req.followee\_id}"} @app.get("/suggest/{user\_id}") def suggest(user\_id: int, limit: int = 5): result = social.suggest\_friends(user\_id, limit) return {"user\_id": user\_id, "suggestions": result, "algorithm": "BFS"} @app.get("/path/{start}/{end}") def path(start: int, end: int): result = social.shortest\_path(start, end) if not result: raise HTTPException(404, "One or both users not found") return {\*\*result, "algorithm": "Dijkstra"} @app.get("/influencers") def influencers(k: int = 5): result = social.top\_influencers(k) return {"top\_influencers": result, "algorithm": "Max Heap"} @app.get("/communities") def communities(): result = social.detect\_communities() return {"communities": result, "algorithm": "Union-Find"} @app.post("/feed") def feed(req: FeedRequest): posts = \[p.model\_dump() for p in req.posts\] result = social.rank\_feed(req.user\_id, posts) return {"user\_id": req.user\_id, "ranked\_feed": result, "algorithm": "Dynamic Programming"} @app.get("/stats") def stats(): return social.stats()

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

from fastapi import FastAPI, HTTPException

from fastapi.middleware.cors import CORSMiddleware

from graph import social

from schemas import UserCreate, FollowRequest, Post, FeedRequest

from seed\_data import seed

seed()

app \= FastAPI(title\="Social Network Analytics Engine")

app.add\_middleware(

CORSMiddleware,

allow\_origins\=\["\*"\],

allow\_methods\=\["\*"\],

allow\_headers\=\["\*"\],

)

@app.post("/users")

def create\_user(user: UserCreate):

if user.user\_id in social.users:

raise HTTPException(400, "User already exists")

social.add\_user(user.user\_id, user.name, user.bio)

return social.users\[user.user\_id\]

@app.get("/users")

def get\_users():

return social.all\_users()

@app.get("/users/{user\_id}")

def get\_user(user\_id: int):

user \= social.get\_user(user\_id)

if not user:

raise HTTPException(404, "User not found")

return {

\*\*user,

"followers": social.get\_followers(user\_id),

"following": social.get\_following(user\_id),

"follower\_count": social.follower\_count(user\_id),

"following\_count": social.following\_count(user\_id),

}

@app.post("/follow")

def follow(req: FollowRequest):

ok \= social.follow(req.follower\_id, req.followee\_id)

if not ok:

raise HTTPException(400, "Could not follow — check user IDs")

return {"message": f"{req.follower\_id} now follows {req.followee\_id}"}

@app.post("/unfollow")

def unfollow(req: FollowRequest):

social.unfollow(req.follower\_id, req.followee\_id)

return {"message": f"{req.follower\_id} unfollowed {req.followee\_id}"}

@app.get("/suggest/{user\_id}")

def suggest(user\_id: int, limit: int \= 5):

result \= social.suggest\_friends(user\_id, limit)

return {"user\_id": user\_id, "suggestions": result, "algorithm": "BFS"}

@app.get("/path/{start}/{end}")

def path(start: int, end: int):

result \= social.shortest\_path(start, end)

if not result:

raise HTTPException(404, "One or both users not found")

return {\*\*result, "algorithm": "Dijkstra"}

@app.get("/influencers")

def influencers(k: int \= 5):

result \= social.top\_influencers(k)

return {"top\_influencers": result, "algorithm": "Max Heap"}

@app.get("/communities")

def communities():

result \= social.detect\_communities()

return {"communities": result, "algorithm": "Union-Find"}

@app.post("/feed")

def feed(req: FeedRequest):

posts \= \[p.model\_dump() for p in req.posts\]

result \= social.rank\_feed(req.user\_id, posts)

return {"user\_id": req.user\_id, "ranked\_feed": result, "algorithm": "Dynamic Programming"}

@app.get("/stats")

def stats():

return social.stats()