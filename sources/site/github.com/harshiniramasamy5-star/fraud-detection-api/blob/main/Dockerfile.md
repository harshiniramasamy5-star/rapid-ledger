# Source: https://github.com/harshiniramasamy5-star/fraud-detection-api/blob/main/Dockerfile

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[fraud-detection-api](https://github.com/harshiniramasamy5-star/fraud-detection-api)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Ffraud-detection-api)
 

 

## FilesExpand file tree

 main

/

# Dockerfile

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/fraud-detection-api/commits?author=harshiniramasamy5-star)

[Initial commit: fraud detection API with Docker](https://github.com/harshiniramasamy5-star/fraud-detection-api/commit/776c8afb6d654923995bd62edd49b75f2ebae23b)

Jun 13, 2026

[776c8af](https://github.com/harshiniramasamy5-star/fraud-detection-api/commit/776c8afb6d654923995bd62edd49b75f2ebae23b) · Jun 13, 2026

## History

[History](https://github.com/harshiniramasamy5-star/fraud-detection-api/commits/main/Dockerfile)

Open commit details

History

13 lines (7 loc) · 208 Bytes

## FilesExpand file tree

 main

/

# Dockerfile

Copy path

Top

## File metadata and controls

- Code
 
- Blame
 

13 lines (7 loc) · 208 Bytes

[Raw](https://github.com/harshiniramasamy5-star/fraud-detection-api/raw/refs/heads/main/Dockerfile)

Copy raw file

Download raw file

Open symbols panel

Edit and raw actions

FROM python:3.11-slim WORKDIR /app COPY requirements.txt . RUN pip install --no-cache-dir -r requirements.txt COPY . . EXPOSE 8000 CMD \["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"\]

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

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD \["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"\]