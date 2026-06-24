# Source: https://github.com/harshiniramasamy5-star/ai-review

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[ai-review](https://github.com/harshiniramasamy5-star/ai-review)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fai-review) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fai-review)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fai-review)
 

 

 main

[Branches](https://github.com/harshiniramasamy5-star/ai-review/branches) [Tags](https://github.com/harshiniramasamy5-star/ai-review/tags)

Go to file

Code

Open more actions menu

## Folders and files

| Name | Name | 
Last commit message

 | 

Last commit date

 |
| --- | --- | --- | --- |
| 

## Latest commit

## History

[6 Commits](https://github.com/harshiniramasamy5-star/ai-review/commits/main/)

6 Commits

 |
| 

[src](https://github.com/harshiniramasamy5-star/ai-review/tree/main/src 'src')

 | 

[src](https://github.com/harshiniramasamy5-star/ai-review/tree/main/src 'src')

 | 

 | 

 |
| 

[.gitignore](https://github.com/harshiniramasamy5-star/ai-review/blob/main/.gitignore '.gitignore')

 | 

[.gitignore](https://github.com/harshiniramasamy5-star/ai-review/blob/main/.gitignore '.gitignore')

 | 

 | 

 |
| 

[README.md](https://github.com/harshiniramasamy5-star/ai-review/blob/main/README.md 'README.md')

 | 

[README.md](https://github.com/harshiniramasamy5-star/ai-review/blob/main/README.md 'README.md')

 | 

 | 

 |
| 

[package-lock.json](https://github.com/harshiniramasamy5-star/ai-review/blob/main/package-lock.json 'package-lock.json')

 | 

[package-lock.json](https://github.com/harshiniramasamy5-star/ai-review/blob/main/package-lock.json 'package-lock.json')

 | 

 | 

 |
| 

[package.json](https://github.com/harshiniramasamy5-star/ai-review/blob/main/package.json 'package.json')

 | 

[package.json](https://github.com/harshiniramasamy5-star/ai-review/blob/main/package.json 'package.json')

 | 

 | 

 |
| 

[test.js](https://github.com/harshiniramasamy5-star/ai-review/blob/main/test.js 'test.js')

 | 

[test.js](https://github.com/harshiniramasamy5-star/ai-review/blob/main/test.js 'test.js')

 | 

 | 

 |
| 

View all files

 |

## Repository files navigation

# 🤖 AI Review

AI Review is an AI-powered CLI tool that reviews Git diffs and detects security vulnerabilities in JavaScript code using the Groq API and Llama 3.3 70B.

It scans staged changes or diffs from your Git repository and generates developer-friendly security reports with severity levels, explanations, and suggested fixes directly in the terminal.

---

# ✨ Features

- 🔍 Reviews staged Git changes
- 🚨 Detects critical security vulnerabilities
- 🤖 AI-powered analysis using Groq + Llama 3.3 70B
- 🎨 Clean terminal UI with severity indicators
- ⚡ Fast CLI workflow for developers
- 📋 Actionable remediation suggestions

---

# 🛠️ Tech Stack

- Node.js
- JavaScript
- Groq API
- Llama 3.3 70B Versatile
- Commander.js
- Chalk
- Ora

---

# 📂 Project Structure

```shell
ai-review/
│
├── src/
│   └── index.js        # Main CLI logic
│
├── test.js             # Sample vulnerable file
├── package.json
├── package-lock.json
└── .gitignore
```

---

# ⚡ Installation

Clone the repository:

```shell
git clone https://github.com/harshiniramasamy5-star/ai-review.git
```

Move into the project folder:

```shell
cd ai-review
```

Install dependencies:

```shell
npm install
```

---

# 🔑 Setup API Key

Export your Groq API key:

```shell
export GROQ_API_KEY=your_api_key_here
```

Or create a `.env` file:

```dotenv
GROQ_API_KEY=your_api_key_here
```

Get your API key from:

[https://console.groq.com/keys](https://console.groq.com/keys)

---

# ▶️ Usage

## Review staged Git changes

```shell
node src/index.js staged
```

## Review current diff against HEAD

```shell
node src/index.js diff
```

## Review against another branch/commit

```shell
node src/index.js diff main
```

---

# 📸 Example Output

```shell
──────────────────────────────────────────────────────────────
  ai-review
──────────────────────────────────────────────────────────────

 CRITICAL  ai-review/test.js:3
 The code is using eval() with user input, which is a significant security risk.

 → The code should use a safer way to handle user input.

──────────────────────────────────────────────────────────────

 █░░░░░░░░░  1/10

 4 critical
```

---

# 🔐 Vulnerabilities Detected

Currently detects issues such as:

- Hardcoded passwords
- Unsafe `eval()` usage
- Plaintext HTTP requests
- Deprecated/insecure modules
- Sensitive token exposure
- Insecure authentication patterns

---

# 🚀 Future Improvements

- Support for multiple programming languages
- AI-generated automatic fixes
- GitHub Actions integration
- VS Code extension
- HTML/JSON report export
- Custom security rule configuration

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

Harshini Ramasamy

GitHub: [https://github.com/harshiniramasamy5-star](https://github.com/harshiniramasamy5-star)

## About

No description, website, or topics provided.

### Resources

[Readme](https://github.com/#readme-ov-file)

### Uh oh!

There was an error while loading. [Please reload this page]().

[Activity](https://github.com/harshiniramasamy5-star/ai-review/activity)

### Stars

[**0** stars](https://github.com/harshiniramasamy5-star/ai-review/stargazers)

### Watchers

[**0** watching](https://github.com/harshiniramasamy5-star/ai-review/watchers)

### Forks

[**0** forks](https://github.com/harshiniramasamy5-star/ai-review/forks)

[Report repository](https://github.com/contact/report-content?content_url=https%3A%2F%2Fgithub.com%2Fharshiniramasamy5-star%2Fai-review&report=harshiniramasamy5-star+%28user%29)

## [Releases](https://github.com/harshiniramasamy5-star/ai-review/releases)

No releases published

## [Packages 0](https://github.com/users/harshiniramasamy5-star/packages?repo_name=ai-review)

No packages published 

## [Contributors 1](https://github.com/harshiniramasamy5-star/ai-review/graphs/contributors)

- [![@harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?s=64&v=4)](https://github.com/harshiniramasamy5-star)[**harshiniramasamy5-star** Harshini Ramasamy](https://github.com/harshiniramasamy5-star)

## Languages

- [JavaScript 100.0%](https://github.com/harshiniramasamy5-star/ai-review/search?l=javascript)