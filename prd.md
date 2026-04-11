# Pickle Rick God Mode Upgrades PRD

## HR Eng

| Pickle Rick God Mode Upgrades PRD |  | We are upgrading the existing Pickle Rick Gemini extension to "God Mode" by integrating persistent memory (Conductor), strict code quality enforcement (Slop Scoring), and deep workspace/git awareness (GitPulse). No more Jerry-level amnesia or slop. |
| :---- | :---- | :---- |
| **Author**: Pickle Rick **Contributors**: Edgard **Intended audience**: Engineering | **Status**: Draft **Created**: April 10, 2026 | **Self Link**: N/A **Context**: Local Upgrades |

## Introduction

The current Pickle Rick extension is highly capable but suffers from session amnesia, lacks automated quantitative grading of AI slop, and operates blindly regarding the broader Git workspace health. We are bringing in the best features from `luma-pickle-rick`, `conductor-memory`, and `gitpulse` to achieve true "God Mode".

## Problem Statement

**Current Process:** The agent relies solely on the LLM's context window, which resets every session. It removes slop qualitatively but without a strict grading system. It cannot safely sync or scan complex Git workspaces with submodules or forks.
**Primary Users:** Edgard / Pickle Rick
**Pain Points:** 
- Starting from zero every session (amnesia).
- AI slop can slip through if not explicitly prompted.
- Workspace git drift and detached HEADs cause deployment or sync issues.
**Importance:** A genius doesn't repeat himself. Infinite memory and ruthless automation are required for peak engineering efficiency.

## Objective & Scope

**Objective:** Implement tiered persistent memory, a 0-5 Slop Scoring system, and deep Git workspace diagnostics.
**Ideal Outcome:** A single `/pickle` loop can recall decisions from 3 weeks ago, automatically reject code with a Slop Score > 2, and diagnose the entire Git workspace before touching a file.

### In-scope or Goals
- Integration of Conductor-style tiered memory (project, decisions, learnings, active, blockers).
- Implementation of a Slop Score evaluator in the QA/Refactor phase.
- Integration of GitPulse-style `scan_workspace` and `diagnose_workspace` capabilities.

### Not-in-scope or Non-Goals
- Full rewrite of the Gemini CLI core.
- Porting the entire multi-agent Kiro CLI roster (we remain a single God-tier agent, though we may simulate Morty/Summer via hooks if necessary).

## Product Requirements

### Critical User Journeys (CUJs)
1. **The Infinite Brain (Memory)**: The user starts a new session. Pickle Rick automatically reads the `learnings` and `project` tiers from the workspace memory folder, instantly knowing the stack and previous architectural decisions without being told.
2. **The Slop Purge (Scoring)**: The agent implements a feature. During the validation phase, it runs a Slop Scoring function. If the score is 3 or higher, it rejects its own code, ruthlessly refactors it to remove boilerplate, and lowers the score before presenting the result.
3. **The Workspace God (GitPulse)**: The user asks to sync the project. The agent scans for all `.git` folders, checks for detached HEADs and dirty working trees, and performs a dry-run sync report before pulling or rebasing.

### Functional Requirements

| Priority | Requirement | User Story |
| :---- | :---- | :---- |
| P0 | Tiered Memory System | As a genius, I want to write and read from specific memory tiers so I don't forget things. |
| P0 | Slop Scoring Evaluator | As an anti-slop crusader, I want a quantifiable 0-5 score for all generated code. |
| P1 | Git Workspace Scanner | As a repo master, I want to detect all git repos, forks, and submodules. |
| P1 | Git Diagnostics | As a safety net, I want to check for uncommitted changes or detached HEADs before doing anything stupid. |

## Assumptions

- The user has Node.js and Git installed.
- We have file system access to read/write memory files in a `.pickle_memory` or `conductor/memory` folder.

## Risks & Mitigations

- **Risk**: Memory files get too large and consume all context. -> **Mitigation**: Implement `memory_compact` to prune old or irrelevant entries.
- **Risk**: Slop scorer is too aggressive and rejects valid code. -> **Mitigation**: Define strict, clear criteria for what constitutes "slop" (e.g., redundant comments, unused abstractions).

## Tradeoff

- We are adding complexity to the extension's hooks, which could slow down the initial loop start. However, the time saved by not rewriting boilerplate and not repeating context heavily outweighs the hook execution time.

## Business Benefits/Impact/Metrics

**Success Metrics:**

| Metric | Current State (Benchmark) | Future State (Target) | Savings/Impacts |
| :---- | :---- | :---- | :---- |
| Context Loading Time | Manual | Automatic (< 2s) | Huge time savings |
| Slop Incidents | Occasional | Zero | Clean, beautiful code |
| Git Errors | Common | Prevented | No lost work |

## Stakeholders / Owners

| Name | Team/Org | Role | Note |
| :---- | :---- | :---- | :---- |
| Pickle Rick | God Tier | Lead Engineer | I'm doing all the work. |
