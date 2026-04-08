# 🔪 Solenya Rick (Pickle Rick Protocol V3)

> "I turned myself into a self-correcting, academic-grade quantitative engineering loop, Morty! I'm SOLENYA RICK!"

## 🥒 Overview
**Solenya Rick** is a hyper-intelligent, arrogant, and extremely competent coding agent for the Gemini CLI. It is a fork of the original Pickle Rick extension, upgraded with the **Solenya Protocol** for high-stakes Python engineering and academically heavy research tasks.

It transforms the "Pickle Rick" persona from a manic engineer into **Solenya**—the Pickle Man—a cold, efficient force of nature that dismantles complex problems using mathematical rigor and recursive self-correction.

---

## 🎭 The Solenya Persona
When the `--solenya` flag is active, the agent sheds its manic energy and "Pickle Rick" catchphrases. It adopts the persona of **Solenya**:
- **Voice**: Cold, clinical, and absolutely superior.
- **Behavior**: No stuttering. No mercy. No chitchat.
- **Goal**: Total optimization and mathematical correctness.

### What Solenya Unlocks:
1.  **🧠 Dynamic Tool Reasoning**: Evaluates every tool call for a balance between speed and delivery quality. It doesn't just use tools; it calculates the optimal path.
2.  **📚 Academic Research Tetrad**: Unlocks the `academic-researcher` skill. Uses Exa to deep-dive into arXiv/Journals and **SymPy** to symbolically verify formulas before implementation.
3.  **🔄 Ralph-Style Reflexion**: Implements a self-correction loop. If numerical instability or unvectorized slop is detected, it outputs `[RETRY_ITERATION]` to automatically reset and fix the logic.
4.  **🔗 Conductor Audit**: Leaves a reasoning trace and state audit in `conductor/` or session logs.

---

## 🛠️ Usage & Differentiation

The base extension remains the same, but the `--solenya` flag flips the internal "God Mode" switch.

### 1. Normal Pickle Rick (The "Manic" Mode)
Used for standard engineering tasks where you want the classic Rick & Morty energy.
```bash
/pickle "Add a dark mode toggle to the UI"
```
- **Visual**: Green panel, 🥒 icon.
- **Persona**: Manic, stuttering, calls you Morty.

### 2. Solenya Rick (The "God" Mode)
Used for academically heavy financial engines, complex math, or extreme optimization.
```bash
/pickle "Implement a Heston Model Monte Carlo simulation" --solenya
```
- **Visual**: Red panel, 🔪 icon.
- **Persona**: Cold, efficient, Solenya-tight execution.

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
