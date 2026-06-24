# Source: https://github.com/harshiniramasamy5-star/social-network-engine/blob/main/seed_data.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[social-network-engine](https://github.com/harshiniramasamy5-star/social-network-engine)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fsocial-network-engine)
 

 

## FilesExpand file tree

 main

/

# seed\_data.py

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

[History](https://github.com/harshiniramasamy5-star/social-network-engine/commits/main/seed_data.py)

Open commit details

History

41 lines (37 loc) · 1.2 KB

## FilesExpand file tree

 main

/

# seed\_data.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

41 lines (37 loc) · 1.2 KB

[Raw](https://github.com/harshiniramasamy5-star/social-network-engine/raw/refs/heads/main/seed_data.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from graph import social def seed(): users = \[ (1, "Harshini", "CS Student & Developer"), (2, "Arjun", "ML Engineer at Google"), (3, "Priya", "Full Stack Developer"), (4, "Ravi", "Data Scientist"), (5, "Meera", "UI/UX Designer"), (6, "Kiran", "Backend Engineer"), (7, "Divya", "DevOps Engineer"), (8, "Sanjay", "Product Manager"), (9, "Ananya", "AI Researcher"), (10, "Vikram", "Startup Founder"), (11, "Lakshmi", "Software Architect"), (12, "Rahul", "Cybersecurity Expert"), \] for uid, name, bio in users: social.add\_user(uid, name, bio) follows = \[ (1,2),(1,3),(1,4),(1,9), (2,1),(2,4),(2,9),(2,11), (3,1),(3,5),(3,6),(3,8), (4,2),(4,9),(4,11), (5,3),(5,8),(5,10), (6,3),(6,7),(6,11), (7,6),(7,12), (8,3),(8,5),(8,10), (9,2),(9,4),(9,11), (10,5),(10,8),(10,12), (11,2),(11,4),(11,9), (12,7),(12,10), \] for f, t in follows: social.follow(f, t) print(f"Seeded: {len(users)} users, {len(follows)} follows") if \_\_name\_\_ == "\_\_main\_\_": seed()

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

from graph import social

def seed():

users \= \[

(1, "Harshini", "CS Student & Developer"),

(2, "Arjun", "ML Engineer at Google"),

(3, "Priya", "Full Stack Developer"),

(4, "Ravi", "Data Scientist"),

(5, "Meera", "UI/UX Designer"),

(6, "Kiran", "Backend Engineer"),

(7, "Divya", "DevOps Engineer"),

(8, "Sanjay", "Product Manager"),

(9, "Ananya", "AI Researcher"),

(10, "Vikram", "Startup Founder"),

(11, "Lakshmi", "Software Architect"),

(12, "Rahul", "Cybersecurity Expert"),

\]

for uid, name, bio in users:

social.add\_user(uid, name, bio)

follows \= \[

(1,2),(1,3),(1,4),(1,9),

(2,1),(2,4),(2,9),(2,11),

(3,1),(3,5),(3,6),(3,8),

(4,2),(4,9),(4,11),

(5,3),(5,8),(5,10),

(6,3),(6,7),(6,11),

(7,6),(7,12),

(8,3),(8,5),(8,10),

(9,2),(9,4),(9,11),

(10,5),(10,8),(10,12),

(11,2),(11,4),(11,9),

(12,7),(12,10),

\]

for f, t in follows:

social.follow(f, t)

print(f"Seeded: {len(users)} users, {len(follows)} follows")

if \_\_name\_\_ \== "\_\_main\_\_":

seed()