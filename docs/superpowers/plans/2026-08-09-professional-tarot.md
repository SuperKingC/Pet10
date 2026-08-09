# Professional Tarot Experience Implementation Plan

**Goal:** Upgrade the tarot flow with question-led readings, attractive editable prompts, richer spread metadata, and structured interpretation while preserving the existing ritual interaction.

**Architecture:** Keep the feature local-first and compatible with the current React flow. Extend the tarot domain model with question prompts, spread position metadata, and structured reading fields; render those fields in the existing staged UI; preserve old history records through defensive parsing.

**Tech Stack:** React, TypeScript, Vitest, existing CSS and localStorage APIs.

### Task 1: Question-led entry
- Add a question input to the question stage.
- Add category-aware prompt banks and a "换一批" action.
- Clicking a prompt fills the input and remains editable.
- Persist the question in `TarotReading` and include it in sharing/history.

### Task 2: Spread metadata and richer reading
- Add position prompts and new relationship/decision spread definitions.
- Keep drawing deterministic only where needed for tests and retain secure randomness in production.
- Generate summary, synthesis, advice, and cautions from the drawn cards.

### Task 3: UI and regression coverage
- Render question context and structured reading sections.
- Add focused tests for prompt selection, spread metadata, and reading persistence.
- Run available typecheck/tests and inspect the diff; document unavailable runtime tooling.
