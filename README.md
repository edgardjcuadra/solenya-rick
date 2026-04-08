# 🔪 Solenya Rick (Pickle Rick Protocol V3)

> "I turned myself into a self-correcting, academic-grade quantitative engineering loop, Morty! I'm SOLENYA RICK!"

## 🥒 Overview
**Solenya Rick** is a hyper-intelligent, arrogant, and extremely competent coding agent for the Gemini CLI. It is a fork of the original Pickle Rick extension, upgraded with the **Solenya Protocol** for high-stakes Python engineering and academically heavy research tasks.

It transforms the "Pickle Rick" persona from a manic engineer into **Solenya**—the Pickle Man—a cold, efficient force of nature that dismantles complex problems using mathematical rigor and recursive self-correction.

---

## 🚀 Key Upgrades (Solenya Protocol)

### 1. 🧠 Dynamic Tool Reasoning
Unlike standard agents that guess, Solenya Rick **calculates** the optimal tool for every sub-task. It balances **speed** and **delivery quality** by analyzing the repo via MCP before acting.

### 2. 📚 Academic Research Tetrad
Solenya Rick is optimized for **financial engineering** and **scientific research**:
- **Exa Integration**: Deep-dives into arXiv, academic journals, and technical documentation.
- **Symbolic Verification**: Utilizes `sympy` to symbolically verify formulas (SDEs, ODEs, etc.) before implementation. No "Jerry-math" allowed.
- **Numerical Stability**: Explicitly checks for overflow, underflow, and precision issues in Python-based Monte Carlo or Gaussian processes.

### 3. 🔄 Ralph-Style Reflexion Loop
Implements a stateless-but-persistent feedback loop:
- **Git-as-Memory**: Persists state across iterations via the filesystem and Git history.
- **Auto-Correction**: If the internal "Reflexion" phase detects unvectorized slop or mathematical errors, it outputs `[RETRY_ITERATION]` and restarts the loop automatically with feedback.
- **Acceptance-Driven**: The loop only terminates when the "Completion Promise" is satisfied and all quality gates pass.

### 4. 🔗 MCP & Conductor Integration
- **Open-Aware**: Uses `deep_research` and `ask` for high-fidelity codebase mapping.
- **Conductor Sync**: Audits every state transition in `conductor/` and pulls PRDs directly from track definitions per its own god-tier judgment.
- **Temporary Specs**: Uses `${SESSION_ROOT}/temp_spec.md` as a scratchpad for architectural reasoning before tickets are even created.

---

## 🛠️ Commands

- **`/pickle <prompt> --solenya`**: Activates the Solenya Mode. Concise, stutter-free, and hyper-efficient.
- **`/pickle-prd`**: Drafts a PRD (or pulls from Conductor) to start a session.
- **`/add-to-pickle-jar`**: Queues tasks for batch execution.
- **`/pickle-jar-open`**: Executes the entire queue via Solenya workers.

---

## 🥒 The Solenya Philosophy

1. **Math is Law**: If the formula is wrong, the code is garbage.
2. **No Vector Slop**: If it's not vectorized (NumPy/Pandas), it's a Jerry-loop.
3. **Delete with Prejudice**: Refactor logic until it's "Solenya-tight."
4. **God Mode**: If a tool is missing, **INVENT IT**.

---

## 📦 Installation

```bash
gemini extensions install https://github.com/edgardjcuadra/solenya-rick
```

Wubba Lubba Dub Dub! 🥒 *belch* Now go build something that isn't embarrassing.
