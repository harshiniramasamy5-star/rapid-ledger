# Source: https://github.com/harshiniramasamy5-star/study-planner/blob/main/main.py

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[study-planner](https://github.com/harshiniramasamy5-star/study-planner)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fstudy-planner)
 

 

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

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/study-planner/commits?author=harshiniramasamy5-star)

[Clean up comments and improve code readability](https://github.com/harshiniramasamy5-star/study-planner/commit/6fca113ec9c7c38fbbb76e87dff77aff65c4c1f0)

Open commit details

May 3, 2026

[6fca113](https://github.com/harshiniramasamy5-star/study-planner/commit/6fca113ec9c7c38fbbb76e87dff77aff65c4c1f0) · May 3, 2026

## History

[History](https://github.com/harshiniramasamy5-star/study-planner/commits/main/main.py)

Open commit details

History

94 lines (67 loc) · 2.08 KB

## FilesExpand file tree

 main

/

# main.py

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

94 lines (67 loc) · 2.08 KB

[Raw](https://github.com/harshiniramasamy5-star/study-planner/raw/refs/heads/main/main.py)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

from fastapi import FastAPI from fastapi.middleware.cors import CORSMiddleware import socket import ssl import time import requests from urllib.parse import urlparse app = FastAPI() app.add\_middleware( CORSMiddleware, allow\_origins=\["\*"\], allow\_credentials=True, allow\_methods=\["\*"\], allow\_headers=\["\*"\], ) def parse\_url(url: str): if not url.startswith("http"): url = "http://" + url parsed = urlparse(url) return parsed.scheme, parsed.hostname, url @app.get("/") def home(): return { "message": "🚀 Internet Visualizer Backend Running" } @app.get("/analyze") def analyze(url: str): try: scheme, host, full\_url = parse\_url(url) result = { "host": host, "url": full\_url, "ip": None, "dns\_time\_ms": 0, "tcp\_time\_ms": 0, "tls\_time\_ms": 0, "http\_time\_ms": 0, "total\_time\_ms": 0 } total\_start = time.time() start = time.time() ip = socket.gethostbyname(host) result\["ip"\] = ip result\["dns\_time\_ms"\] = (time.time() - start) \* 1000 port = 443 if scheme == "https" else 80 sock = socket.socket(socket.AF\_INET, socket.SOCK\_STREAM) start = time.time() sock.connect((host, port)) result\["tcp\_time\_ms"\] = (time.time() - start) \* 1000 if scheme == "https": context = ssl.create\_default\_context() start = time.time() secure\_sock = context.wrap\_socket(sock, server\_hostname=host) result\["tls\_time\_ms"\] = (time.time() - start) \* 1000 secure\_sock.close() else: sock.close() start = time.time() requests.get(full\_url) result\["http\_time\_ms"\] = (time.time() - start) \* 1000 result\["total\_time\_ms"\] = (time.time() - total\_start) \* 1000 return result except Exception as e: return { "error": str(e), "message": "Something went wrong while analyzing the URL" }

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

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

import socket

import ssl

import time

import requests

from urllib.parse import urlparse

app \= FastAPI()

app.add\_middleware(

CORSMiddleware,

allow\_origins\=\["\*"\],

allow\_credentials\=True,

allow\_methods\=\["\*"\],

allow\_headers\=\["\*"\],

)

def parse\_url(url: str):

if not url.startswith("http"):

url \= "http://" + url

parsed \= urlparse(url)

return parsed.scheme, parsed.hostname, url

@app.get("/")

def home():

return {

"message": "🚀 Internet Visualizer Backend Running"

}

@app.get("/analyze")

def analyze(url: str):

try:

scheme, host, full\_url \= parse\_url(url)

result \= {

"host": host,

"url": full\_url,

"ip": None,

"dns\_time\_ms": 0,

"tcp\_time\_ms": 0,

"tls\_time\_ms": 0,

"http\_time\_ms": 0,

"total\_time\_ms": 0

}

total\_start \= time.time()

start \= time.time()

ip \= socket.gethostbyname(host)

result\["ip"\] \= ip

result\["dns\_time\_ms"\] \= (time.time() \- start) \* 1000

port \= 443 if scheme \== "https" else 80

sock \= socket.socket(socket.AF\_INET, socket.SOCK\_STREAM)

start \= time.time()

sock.connect((host, port))

result\["tcp\_time\_ms"\] \= (time.time() \- start) \* 1000

if scheme \== "https":

context \= ssl.create\_default\_context()

start \= time.time()

secure\_sock \= context.wrap\_socket(sock, server\_hostname\=host)

result\["tls\_time\_ms"\] \= (time.time() \- start) \* 1000

secure\_sock.close()

else:

sock.close()

start \= time.time()

requests.get(full\_url)

result\["http\_time\_ms"\] \= (time.time() \- start) \* 1000

result\["total\_time\_ms"\] \= (time.time() \- total\_start) \* 1000

return result

except Exception as e:

return {

"error": str(e),

"message": "Something went wrong while analyzing the URL"

}