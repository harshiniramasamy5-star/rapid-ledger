# Source: https://github.com/harshiniramasamy5-star/black-box/blob/main/DOCUMENTATION.md

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[black-box](https://github.com/harshiniramasamy5-star/black-box)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fblack-box) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fblack-box)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fblack-box)
 

 

## FilesExpand file tree

 main

/

# DOCUMENTATION.md

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/black-box/commits?author=harshiniramasamy5-star)

[Update DOCUMENTATION.md](https://github.com/harshiniramasamy5-star/black-box/commit/9965fbc104a229c6aee06a39c23c19652e433f1c)

May 12, 2026

[9965fbc](https://github.com/harshiniramasamy5-star/black-box/commit/9965fbc104a229c6aee06a39c23c19652e433f1c) · May 12, 2026

## History

[History](https://github.com/harshiniramasamy5-star/black-box/commits/main/DOCUMENTATION.md)

Open commit details

History

680 lines (482 loc) · 14.4 KB

## FilesExpand file tree

 main

/

# DOCUMENTATION.md

Copy path

Top

## File metadata and controls

- Preview
 
- Code
 
- Blame
 

680 lines (482 loc) · 14.4 KB

[Raw](https://github.com/harshiniramasamy5-star/black-box/raw/refs/heads/main/DOCUMENTATION.md)

Copy raw file

Download raw file

Outline

Edit and raw actions

# 📦 Black Box — Personal Prediction & Calibration Tracker

### Complete Project Documentation

> _“The goal is not just to store notes. The tool should reveal whether you are well-calibrated, overconfident, underconfident, or stronger in some categories than others.”_

---

# Table of Contents

1. Project Overview
2. Problem Statement
3. How AI Was Used in This Project
4. Architecture & Design
5. Installation & Setup
6. Command Reference
7. Flow Diagrams
8. Data Model
9. Example Outputs
10. Analytics & Calibration Explained
11. Bonus Features

---

# 1\. Project Overview

**Black Box** is a Python command-line application designed to help users track predictions, confidence levels, outcomes, and decision-making accuracy over time.

The project works as a personal prediction journal with built-in analytics. Before an event happens, users record:

- What they believe will happen
- Their confidence level (0–100)
- The category of prediction

Once the event is over, they can review the prediction, record the actual outcome, and evaluate how accurate the original prediction was.

Over time, Black Box analyzes these records to identify patterns such as:

- Consistent overconfidence or underconfidence
- Stronger prediction ability in certain categories
- Confidence levels that do or do not match real accuracy

This concept is known as **calibration** — the relationship between perceived certainty and actual correctness.

---

## Key Features

- Record predictions with confidence scores
- Review predictions after outcomes occur
- Calibration analysis across confidence ranges
- Category-based performance tracking
- Markdown export support
- Edit and delete functionality
- Search and filter commands
- 30-day reminder system for pending reviews
- Colored terminal output
- Unit test coverage

---

## Tech Stack

| Module | Purpose |
| --- | --- |
| `argparse` | Command-line argument parsing |
| `json` | Local persistent storage |
| `datetime` | Timestamp handling and reminders |
| `statistics` | Mean and calibration calculations |
| `pathlib` | Cross-platform file handling |
| `colorama` | Colored terminal output |
| `pytest` | Unit testing |

---

# 2\. Problem Statement

Most people make predictions every day without ever evaluating the quality of their thinking.

A person may feel highly confident about:

- Exam performance
- Startup ideas
- Project timelines
- Career decisions
- Market predictions

However, once the outcome happens, the original confidence level is usually forgotten. This creates hindsight bias and removes the opportunity to improve decision-making.

Black Box solves this problem by introducing a structured prediction-feedback loop:

1. Users record predictions _before_ outcomes occur
2. A confidence score is attached to each prediction
3. Actual outcomes are later reviewed and evaluated
4. Calibration analytics compare confidence vs. accuracy

The main goal is not simply determining whether a prediction was right or wrong.

The deeper goal is understanding:

> _“When I say I am 80% confident, am I actually correct around 80% of the time?”_

---

# 3\. How AI Was Used in This Project

AI was used throughout development as a coding and productivity assistant.

The overall project planning, implementation decisions, testing, debugging, and final validation were handled manually, while AI support was used to speed up development and improve code organization.

---

## 3.1 Problem Understanding & Planning

The project was developed based on a problem statement focused on prediction tracking and calibration analysis.

Initial planning included:

- Defining the CLI workflow
- Designing the JSON data structure
- Identifying analytics requirements
- Planning command organization
- Designing calibration logic

AI assisted by suggesting:

- Better project structure
- Cleaner command organization
- Validation approaches
- Calibration bucket calculations
- Documentation formatting improvements

All suggestions were reviewed and adjusted manually during development.

---

## 3.2 Code Development

AI assistance was used during implementation to help generate and refine:

- CLI command handlers
- Argument parsing using `argparse`
- Validation functions
- Filtering logic
- Export functionality
- Calibration calculations
- Table formatting
- Error handling

The generated code was manually reviewed, tested, edited, and integrated into the final project.

---

## 3.3 Testing & Debugging

Testing was performed manually using multiple real CLI scenarios.

AI assisted by:

- Suggesting test cases
- Identifying edge cases
- Improving validation logic
- Recommending debugging approaches

However, all final debugging, verification, and corrections were completed manually.

---

## 3.4 Overall Contribution

This project was developed using a balanced workflow between manual engineering and AI assistance.

AI improved productivity and reduced repetitive work, while the final logic, architecture, validation, and implementation decisions remained manually controlled.

---

# 4\. Architecture & Design

## Project Structure

```
black_box/
│
├── black_box/              # Main application package
│   ├── __init__.py
│   ├── cli.py
│   ├── storage.py
│   ├── analytics.py
│   └── utils.py
│
├── tests/                  # Unit tests
│   ├── test_cli.py
│   ├── test_storage.py
│   └── test_analytics.py
│
├── README.md
├── DOCUMENTATION.md
├── TESTS.md
├── requirements.txt
└── .gitignore
```

---

## Internal Architecture

```
CLI Layer
├── argparse command parsing
├── command routing
└── input validation

Business Logic Layer
├── prediction recording
├── review handling
├── statistics calculations
├── calibration analysis
└── filtering/search logic

Data Layer
├── load_data()
├── save_data()
└── black_box_data.json
```

---

## Command Overview

| Command | Purpose |
| --- | --- |
| `record` | Create a new prediction entry |
| `list` | Display entries with filters |
| `review` | Add outcome and accuracy |
| `stats` | Show overall statistics |
| `calibration` | Analyze confidence vs. accuracy |
| `edit` | Modify an existing entry |
| `delete` | Remove an entry permanently |
| `export` | Generate Markdown reports |
| `remind` | Show overdue pending entries |

---

## Data Persistence

All entries are stored locally inside:

```
black_box_data.json
```

The file is:

- Human-readable
- Portable
- Easy to back up
- Easy to inspect manually

---

# 5\. Installation & Setup

## Requirements

- Python 3.8 or newer
- pip package manager

---

## Step 1 — Clone the Repository

```shell
git clone https://github.com/your-username/black-box.git
cd black-box
```

---

## Step 2 — Install Dependencies

```shell
pip install -r requirements.txt
```

---

## Step 3 — Run the Application

```shell
python -m black_box
```

This displays the help menu and available commands.

---

## Step 4 — Record Your First Prediction

```shell
python -m black_box record \
  --event "Job Interview" \
  --prediction "I will receive an offer" \
  --confidence 75 \
  --category career
```

---

# 6\. Command Reference

## `record` — Create a Prediction Entry

```shell
python -m black_box record \
  --event "EVENT NAME" \
  --prediction "YOUR PREDICTION" \
  --confidence 70 \
  --category study
```

| Flag | Required | Description |
| --- | --- | --- |
| `--event` | Yes | Real-world event name |
| `--prediction` | Yes | Prediction statement |
| `--confidence` | Yes | Confidence score (0–100) |
| `--category` | No | Optional grouping tag |

---

## `list` — Display Entries

```shell
python -m black_box list
python -m black_box list --status pending
python -m black_box list --category business
python -m black_box list --search "pitch"
```

Supports:

- Status filtering
- Category filtering
- Keyword search

---

## `review` — Review an Existing Prediction

```shell
python -m black_box review 3 \
  --outcome "Got the offer" \
  --accuracy 70 \
  --lesson "Underestimated negotiation delays"
```

| Argument | Required | Description |
| --- | --- | --- |
| `id` | Yes | Entry ID |
| `--outcome` | Yes | Actual result |
| `--accuracy` | Yes | Accuracy score (0–100) |
| `--lesson` | No | Reflection or learning |

---

## `stats` — Performance Overview

```shell
python -m black_box stats
```

Displays:

- Total entries
- Reviewed and pending counts
- Average confidence
- Average accuracy
- Best prediction
- Worst prediction
- Most overconfident category

---

## `calibration` — Confidence vs. Accuracy Analysis

```shell
python -m black_box calibration
```

Groups predictions into confidence buckets and compares:

- Average confidence
- Average accuracy
- Calibration gap

---

## `edit` — Modify an Entry

```shell
python -m black_box edit 2 --category startup
```

Supports updating any editable field with confirmation before saving.

---

## `delete` — Remove an Entry

```shell
python -m black_box delete 4
```

Prompts for confirmation before permanent deletion.

---

## `export` — Export Markdown Report

```shell
python -m black_box export
```

Creates a Markdown summary report containing reviewed entries and analytics.

---

## `remind` — Show Overdue Entries

```shell
python -m black_box remind
```

Displays pending entries older than 30 days.

---

# 7\. Flow Diagrams

## 7.1 Prediction Lifecycle

```
User records prediction
        │
        ▼
status = pending
saved to JSON
        │
        │ (event happens)
        ▼
User reviews prediction
        │
        ▼
status = reviewed
accuracy and lessons saved
        │
        ▼
Statistics & calibration analysis generated
```

---

## 7.2 Calibration Bucket Logic

```
confidence = 75
        │
        ▼
bucket = 70–79%
        │
        ▼
Group predictions by bucket
        │
        ▼
Compare:
- average confidence
- average accuracy
        │
        ▼
Compute calibration gap
```

---

## 7.3 Validation Flow

```
User enters invalid confidence
        │
        ▼
validate_score()
        │
        ▼
If value < 0 or > 100
        │
        ▼
Display clear error message
        │
        ▼
Exit safely without modifying JSON
```

---

# 8\. Data Model

Each prediction entry is stored as JSON.

Example:

```json
{
  "id": 1,
  "event": "Final Exam",
  "statement": "I will score above 85",
  "confidence": 70.0,
  "category": "study",
  "created": "2026-05-10T14:32:00",
  "status": "reviewed",
  "outcome": "Scored 78",
  "accuracy": 55.0,
  "lesson": "Underestimated time pressure",
  "reviewed": "2026-05-11T09:15:00"
}
```

---

## Data Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | int | Unique identifier |
| `event` | string | Event name |
| `statement` | string | Prediction text |
| `confidence` | float | Confidence level |
| `category` | string | Entry category |
| `created` | datetime | Creation timestamp |
| `status` | string | pending/reviewed |
| `outcome` | string | Actual outcome |
| `accuracy` | float | Accuracy score |
| `lesson` | string | Reflection |
| `reviewed` | datetime | Review timestamp |

---

# 9\. Example Outputs

## Example — `record`

```
✓ Recorded entry #1: Final Exam
  Statement  : I will score above 85
  Confidence : 70%
  Category   : study
```

---

## Example — `list`

```
ID   STATUS      CONF   ACC   EVENT
────────────────────────────────────────
1    reviewed    70%    55%   Final Exam
2    pending     80%     —    Startup Pitch
```

---

## Example — `stats`

```
=== Stats ===
Total entries   : 8
Pending reviews : 2
Avg confidence  : 75.4%
Avg accuracy    : 49.2%
```

---

## Example — `calibration`

```
Confidence 70–79% | Avg accuracy: 62% | Gap: -12%
Confidence 80–89% | Avg accuracy: 32% | Gap: -52%
```

---

# 10\. Analytics & Calibration Explained

## What Is Calibration?

Calibration measures how closely confidence matches real-world accuracy.

A perfectly calibrated person who says:

> “I am 80% confident”

would be correct approximately 80% of the time.

Most people are not perfectly calibrated.

Some are:

- Overconfident
- Underconfident
- Accurate only in specific domains

Black Box helps identify these patterns over time.

---

## Calibration Formula

The calibration gap is calculated as:

```
Gap = Average Accuracy − Average Confidence
```

Interpretation:

| Gap | Meaning |
| --- | --- |
| Near 0 | Well calibrated |
| Negative | Overconfident |
| Positive | Underconfident |

---

## Why This Matters

Understanding calibration improves:

- Decision-making
- Forecasting ability
- Planning accuracy
- Risk estimation
- Self-awareness

Instead of relying on memory or intuition alone, users can measure thinking quality using real historical data.

---

# 11\. Bonus Features

| Feature | Implementation |
| --- | --- |
| Markdown export | `export` command |
| 30-day reminders | `remind` command |
| Edit with confirmation | `edit` command |
| Delete with confirmation | `delete` command |
| Unit tests | Implemented using `pytest` |
| Colored terminal output | Implemented using `colorama` |

---

# Conclusion

Black Box is more than a simple note-taking CLI tool.

It is a lightweight system for improving prediction quality, tracking confidence, and understanding personal calibration over time.

The project combines:

- Command-line application development
- Data persistence
- Analytics
- Validation
- Testing
- Documentation
- Human-centered decision analysis

while maintaining a beginner-friendly and extensible architecture.

---

_Black Box v1.0 — Built with Python, argparse, json, datetime, statistics, pathlib, colorama, and pytest._