# Source: https://github.com/harshiniramasamy5-star/ai-review/blob/main/README.md

[harshiniramasamy5-star](https://github.com/harshiniramasamy5-star) / **[ai-review](https://github.com/harshiniramasamy5-star/ai-review)** Public

- [Notifications](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fai-review) You must be signed in to change notification settings
- [Fork 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fai-review)
- [Star 0](https://github.com/login?return_to=%2Fharshiniramasamy5-star%2Fai-review)
 

 

## FilesExpand file tree

 main

/

# README.md

Copy path

Blame

More file actions

Blame

More file actions

## Latest commit

[![harshiniramasamy5-star](https://avatars.githubusercontent.com/u/269648429?v=4&size=40)](https://github.com/harshiniramasamy5-star) [harshiniramasamy5-star](https://github.com/harshiniramasamy5-star/ai-review/commits?author=harshiniramasamy5-star)

[Update README.md](https://github.com/harshiniramasamy5-star/ai-review/commit/23bff13a3000a6c3489c2837053fd63c6ab7be5d)

May 3, 2026

[23bff13](https://github.com/harshiniramasamy5-star/ai-review/commit/23bff13a3000a6c3489c2837053fd63c6ab7be5d) · May 3, 2026

## History

[History](https://github.com/harshiniramasamy5-star/ai-review/commits/main/README.md)

Open commit details

History

169 lines (110 loc) · 3.24 KB

## FilesExpand file tree

 main

/

# README.md

Copy path

Top

## File metadata and controls

- Preview
 
- Code
 
- Blame
 

169 lines (110 loc) · 3.24 KB

[Raw](https://github.com/harshiniramasamy5-star/ai-review/raw/refs/heads/main/README.md)

Copy raw file

Download raw file

Outline

Edit and raw actions

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