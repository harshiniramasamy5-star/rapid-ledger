# Source: https://github.com/harshiniramasamy5-star/social-network-engine/blob/main/algorithms.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[social-network-engine](https://github.com/harshiniramasamy5-star/social-network-engine)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
 

 

## FilesExpand file tree

 main

/

# algorithms.py

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

## History

[History](https://github.com/harshiniramasamy5-star/social-network-engine/commits/main/algorithms.py)

History

168 lines (134 loc) · 4.99 KB

## FilesExpand file tree

 main

/

# algorithms.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

168 lines (134 loc) · 4.99 KB

[Raw](https://github.com/harshiniramasamy5-star/social-network-engine/raw/refs/heads/main/algorithms.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from collections import defaultdict, deque import heapq from graph import social def suggest\_friends(user\_id: str, max\_suggestions: int = 5) -> list: if user\_id not in social.users: return \[\] visited = {user\_id} # Level 1 = people user already follows level1 = social.graph\[user\_id\] visited.update(level1) suggestions = defaultdict(int) # BFS level 2 — friends of friends queue = deque(level1) while queue: friend = queue.popleft() for fof in social.graph\[friend\]: # friend of friend if fof not in visited: suggestions\[fof\] += 1 # count mutual connections # Sort by mutual connection count (most mutuals first) ranked = sorted(suggestions.items(), key=lambda x: -x\[1\]) return \[ {\*\*social.users\[uid\], "mutual\_connections": count} for uid, count in ranked\[:max\_suggestions\] if uid in social.users \] def shortest\_path(start\_id: str, end\_id: str) -> dict: if start\_id not in social.users or end\_id not in social.users: return {"path": \[\], "hops": -1, "found": False} # Min heap: (distance, user\_id, path) heap = \[(0, start\_id, \[start\_id\])\] visited = set() while heap: dist, current, path = heapq.heappop(heap) if current in visited: continue visited.add(current) if current == end\_id: return { "path": \[social.users\[u\]\["name"\] for u in path\], "hops": dist, "found": True, "user\_ids": path } for neighbor in social.graph\[current\]: if neighbor not in visited: heapq.heappush(heap, (dist + 1, neighbor, path + \[neighbor\])) return {"path": \[\], "hops": -1, "found": False} def get\_top\_influencers(k: int = 5) -> list: # Max heap using negative values (Python heapq is min-heap) heap = \[\] for uid, info in social.users.items(): followers = len(social.followers\[uid\]) # Push (-followers, uid) so largest followers = highest priority heapq.heappush(heap, (-followers, uid)) top = \[\] for \_ in range(min(k, len(heap))): neg\_count, uid = heapq.heappop(heap) top.append({ \*\*social.users\[uid\], "follower\_count": -neg\_count, "rank": len(top) + 1 }) return top def rank\_feed(user\_id: str, max\_posts: int = 10) -> list: if user\_id not in social.users: return \[\] following = social.graph\[user\_id\] candidate\_posts = \[\] for followed\_id in following: for post\_id in social.user\_posts.get(followed\_id, \[\]): if post\_id in social.posts: candidate\_posts.append(social.posts\[post\_id\]) # DP scoring: engagement\_score = likes\*1 + comments\*3 + shares\*5 # weights reflect real platform priorities (shares > comments > likes) def engagement\_score(post): memo = {} pid = post\["id"\] if pid not in memo: memo\[pid\] = ( post\["likes"\] \* 1 + post\["comments"\] \* 3 + post\["shares"\] \* 5 ) return memo\[pid\] ranked = sorted(candidate\_posts, key=engagement\_score, reverse=True) return \[ {\*\*p, "engagement\_score": engagement\_score(p)} for p in ranked\[:max\_posts\] \] class UnionFind: def \_\_init\_\_(self, elements): self.parent = {e: e for e in elements} self.rank = {e: 0 for e in elements} def find(self, x): # Path compression if self.parent\[x\] != x: self.parent\[x\] = self.find(self.parent\[x\]) return self.parent\[x\] def union(self, x, y): px, py = self.find(x), self.find(y) if px == py: return # Union by rank if self.rank\[px\] < self.rank\[py\]: px, py = py, px self.parent\[py\] = px if self.rank\[px\] == self.rank\[py\]: self.rank\[px\] += 1 def detect\_communities() -> list: users = list(social.users.keys()) if not users: return \[\] uf = UnionFind(users) # Union users who follow each other (mutual connection = same community) for user in users: for followee in social.graph\[user\]: if user in social.followers\[followee\]: # mutual follow uf.union(user, followee) # Group users by their root/community communities = defaultdict(list) for user in users: root = uf.find(user) communities\[root\].append(social.users\[user\]) # Sort communities by size (largest first) result = sorted(communities.values(), key=len, reverse=True) return \[ {"community\_id": i+1, "size": len(c), "members": c} for i, c in enumerate(result) \] def get\_mutual\_followers(user1\_id: str, user2\_id: str) -> list: followers1 = social.followers\[user1\_id\] followers2 = social.followers\[user2\_id\] mutual\_ids = followers1.intersection(followers2) return \[social.users\[uid\] for uid in mutual\_ids if uid in social.users\]

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

98

99

100

101

102

103

104

105

106

107

108

109

110

111

112

113

114

115

116

117

118

119

120

121

122

123

124

125

126

127

128

129

130

131

132

133

134

135

136

137

138

139

140

141

142

143

144

145

146

147

148

149

150

151

152

153

154

155

156

157

158

159

160

161

162

163

164

165

166

167

168

from collections import defaultdict, deque

import heapq

from graph import social

def suggest\_friends(user\_id: str, max\_suggestions: int \= 5) \-> list:

if user\_id not in social.users:

return \[\]

visited \= {user\_id}

\# Level 1 = people user already follows

level1 \= social.graph\[user\_id\]

visited.update(level1)

suggestions \= defaultdict(int)

\# BFS level 2 — friends of friends

queue \= deque(level1)

while queue:

friend \= queue.popleft()

for fof in social.graph\[friend\]: \# friend of friend

if fof not in visited:

suggestions\[fof\] += 1 \# count mutual connections

\# Sort by mutual connection count (most mutuals first)

ranked \= sorted(suggestions.items(), key\=lambda x: \-x\[1\])

return \[

{\*\*social.users\[uid\], "mutual\_connections": count}

for uid, count in ranked\[:max\_suggestions\]

if uid in social.users

\]

def shortest\_path(start\_id: str, end\_id: str) \-> dict:

if start\_id not in social.users or end\_id not in social.users:

return {"path": \[\], "hops": \-1, "found": False}

\# Min heap: (distance, user\_id, path)

heap \= \[(0, start\_id, \[start\_id\])\]

visited \= set()

while heap:

dist, current, path \= heapq.heappop(heap)

if current in visited:

continue

visited.add(current)

if current \== end\_id:

return {

"path": \[social.users\[u\]\["name"\] for u in path\],

"hops": dist,

"found": True,

"user\_ids": path

}

for neighbor in social.graph\[current\]:

if neighbor not in visited:

heapq.heappush(heap, (dist + 1, neighbor, path + \[neighbor\]))

return {"path": \[\], "hops": \-1, "found": False}

def get\_top\_influencers(k: int \= 5) \-> list:

\# Max heap using negative values (Python heapq is min-heap)

heap \= \[\]

for uid, info in social.users.items():

followers \= len(social.followers\[uid\])

\# Push (-followers, uid) so largest followers = highest priority

heapq.heappush(heap, (\-followers, uid))

top \= \[\]

for \_ in range(min(k, len(heap))):

neg\_count, uid \= heapq.heappop(heap)

top.append({

\*\*social.users\[uid\],

"follower\_count": \-neg\_count,

"rank": len(top) + 1

})

return top

def rank\_feed(user\_id: str, max\_posts: int \= 10) \-> list:

if user\_id not in social.users:

return \[\]

following \= social.graph\[user\_id\]

candidate\_posts \= \[\]

for followed\_id in following:

for post\_id in social.user\_posts.get(followed\_id, \[\]):

if post\_id in social.posts:

candidate\_posts.append(social.posts\[post\_id\])

\# DP scoring: engagement\_score = likes\*1 + comments\*3 + shares\*5

\# weights reflect real platform priorities (shares > comments > likes)

def engagement\_score(post):

memo \= {}

pid \= post\["id"\]

if pid not in memo:

memo\[pid\] \= (

post\["likes"\] \* 1 +

post\["comments"\] \* 3 +

post\["shares"\] \* 5

)

return memo\[pid\]

ranked \= sorted(candidate\_posts, key\=engagement\_score, reverse\=True)

return \[

{\*\*p, "engagement\_score": engagement\_score(p)}

for p in ranked\[:max\_posts\]

\]

class UnionFind:

def \_\_init\_\_(self, elements):

self.parent \= {e: e for e in elements}

self.rank \= {e: 0 for e in elements}

def find(self, x):

\# Path compression

if self.parent\[x\] != x:

self.parent\[x\] \= self.find(self.parent\[x\])

return self.parent\[x\]

def union(self, x, y):

px, py \= self.find(x), self.find(y)

if px \== py:

return

\# Union by rank

if self.rank\[px\] < self.rank\[py\]:

px, py \= py, px

self.parent\[py\] \= px

if self.rank\[px\] \== self.rank\[py\]:

self.rank\[px\] += 1

def detect\_communities() \-> list:

users \= list(social.users.keys())

if not users:

return \[\]

uf \= UnionFind(users)

\# Union users who follow each other (mutual connection = same community)

for user in users:

for followee in social.graph\[user\]:

if user in social.followers\[followee\]: \# mutual follow

uf.union(user, followee)

\# Group users by their root/community

communities \= defaultdict(list)

for user in users:

root \= uf.find(user)

communities\[root\].append(social.users\[user\])

\# Sort communities by size (largest first)

result \= sorted(communities.values(), key\=len, reverse\=True)

return \[

{"community\_id": i+1, "size": len(c), "members": c}

for i, c in enumerate(result)

\]

def get\_mutual\_followers(user1\_id: str, user2\_id: str) \-> list:

followers1 \= social.followers\[user1\_id\]

followers2 \= social.followers\[user2\_id\]

mutual\_ids \= followers1.intersection(followers2)

return \[social.users\[uid\] for uid in mutual\_ids if uid in social.users\]