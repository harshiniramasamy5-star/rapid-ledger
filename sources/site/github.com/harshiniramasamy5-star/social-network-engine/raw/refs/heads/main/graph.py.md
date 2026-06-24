# Source: https://github.com/harshiniramasamy5-star/social-network-engine/raw/refs/heads/main/graph.py

from collections import defaultdict, deque
import heapq

class SocialGraph:

 def \_\_init\_\_(self):
 self.graph = defaultdict(set)
 self.reverse\_graph = defaultdict(set)
 self.users = {}

 def add\_user(self, user\_id: int, name: str, bio: str = ""):
 self.users\[user\_id\] = {"id": user\_id, "name": name, "bio": bio}
 self.graph\[user\_id\]
 self.reverse\_graph\[user\_id\]

 def get\_user(self, user\_id: int):
 return self.users.get(user\_id)

 def all\_users(self):
 return list(self.users.values())

 def follow(self, follower\_id: int, followee\_id: int):
 if follower\_id == followee\_id:
 return False
 if follower\_id not in self.users or followee\_id not in self.users:
 return False
 self.graph\[follower\_id\].add(followee\_id)
 self.reverse\_graph\[followee\_id\].add(follower\_id)
 return True

 def unfollow(self, follower\_id: int, followee\_id: int):
 self.graph\[follower\_id\].discard(followee\_id)
 self.reverse\_graph\[followee\_id\].discard(follower\_id)

 def get\_following(self, user\_id: int):
 return \[self.users\[uid\] for uid in self.graph\[user\_id\] if uid in self.users\]

 def get\_followers(self, user\_id: int):
 return \[self.users\[uid\] for uid in self.reverse\_graph\[user\_id\] if uid in self.users\]

 def follower\_count(self, user\_id: int):
 return len(self.reverse\_graph\[user\_id\])

 def following\_count(self, user\_id: int):
 return len(self.graph\[user\_id\])

 def is\_following(self, follower\_id: int, followee\_id: int):
 return followee\_id in self.graph\[follower\_id\]

 def suggest\_friends(self, user\_id: int, max\_suggestions: int = 5):
 if user\_id not in self.users:
 return \[\]

 visited = {user\_id}
 following = self.graph\[user\_id\]
 visited.update(following)

 suggestions = defaultdict(int)

 queue = deque(following)
 while queue:
 current = queue.popleft()
 for neighbor in self.graph\[current\]:
 if neighbor not in visited:
 suggestions\[neighbor\] += 1
 visited.add(neighbor)

 ranked = sorted(suggestions.items(), key=lambda x: x\[1\], reverse=True)
 return \[
 {\*\*self.users\[uid\], "mutual\_connections": count}
 for uid, count in ranked\[:max\_suggestions\]
 if uid in self.users
 \]

 def shortest\_path(self, start\_id: int, end\_id: int):
 if start\_id not in self.users or end\_id not in self.users:
 return None

 distances = {uid: float('inf') for uid in self.users}
 distances\[start\_id\] = 0
 previous = {uid: None for uid in self.users}
 heap = \[(0, start\_id)\]

 while heap:
 dist, current = heapq.heappop(heap)
 if current == end\_id:
 break
 if dist > distances\[current\]:
 continue
 for neighbor in self.graph\[current\]:
 new\_dist = distances\[current\] + 1
 if new\_dist < distances\[neighbor\]:
 distances\[neighbor\] = new\_dist
 previous\[neighbor\] = current
 heapq.heappush(heap, (new\_dist, neighbor))

 if distances\[end\_id\] == float('inf'):
 return {"connected": False, "path": \[\], "degrees": -1}

 path, current = \[\], end\_id
 while current is not None:
 path.append(self.users\[current\]\["name"\])
 current = previous\[current\]
 path.reverse()

 return {
 "connected": True,
 "path": path,
 "degrees": distances\[end\_id\]
 }

 def top\_influencers(self, k: int = 5):
 heap = \[\]
 for uid in self.users:
 count = self.follower\_count(uid)
 heapq.heappush(heap, (-count, uid))

 result = \[\]
 for \_ in range(min(k, len(heap))):
 neg\_count, uid = heapq.heappop(heap)
 result.append({
 \*\*self.users\[uid\],
 "followers": -neg\_count,
 "following": self.following\_count(uid),
 "influence\_score": round(-neg\_count / max(1, len(self.users)) \* 100, 1)
 })
 return result

 def detect\_communities(self):
 parent = {uid: uid for uid in self.users}
 rank = {uid: 0 for uid in self.users}

 def find(x):
 if parent\[x\] != x:
 parent\[x\] = find(parent\[x\])
 return parent\[x\]

 def union(x, y):
 px, py = find(x), find(y)
 if px == py:
 return
 if rank\[px\] < rank\[py\]:
 px, py = py, px
 parent\[py\] = px
 if rank\[px\] == rank\[py\]:
 rank\[px\] += 1

 for uid in self.users:
 for neighbor in self.graph\[uid\]:
 if uid in self.graph.get(neighbor, set()):
 union(uid, neighbor)

 communities = defaultdict(list)
 for uid in self.users:
 communities\[find(uid)\].append(self.users\[uid\])

 return \[
 {"community\_id": i+1, "size": len(members), "members": members}
 for i, members in enumerate(communities.values())
 if len(members) > 0
 \]

 def rank\_feed(self, user\_id: int, posts: list):
 following = self.graph\[user\_id\]

 scored = \[\]
 for post in posts:
 author\_id = post.get("author\_id")

 dp = \[0.0\] \* 6
 dp\[1\] = post.get("likes", 0) \* 1.0 + \\
 post.get("comments", 0) \* 2.0 + \\
 post.get("shares", 0) \* 3.0
 dp\[2\] = dp\[1\] + (20.0 if author\_id in following else 0.0)
 dp\[3\] = dp\[2\] + (15.0 if user\_id in self.graph.get(author\_id, set()) else 0.0)
 dp\[4\] = dp\[3\] + (self.follower\_count(author\_id) \* 0.1)
 dp\[5\] = dp\[4\] + post.get("recency\_score", 0) \* 5.0

 scored.append({\*\*post, "feed\_score": round(dp\[5\], 2)})

 return sorted(scored, key=lambda x: x\["feed\_score"\], reverse=True)

 def stats(self):
 total\_edges = sum(len(v) for v in self.graph.values())
 return {
 "total\_users": len(self.users),
 "total\_connections": total\_edges,
 "avg\_following": round(total\_edges / max(1, len(self.users)), 2),
 "density": round(total\_edges / max(1, len(self.users) \* (len(self.users)-1)), 4)
 }

social = SocialGraph()