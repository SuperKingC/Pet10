---
name: feature-development
description: Use when adding or changing a user-facing Pet10 feature.
---

# Feature Development

1. Read `AGENTS.md`, `AI_RULES.md`, the feature document, and the relevant architecture rule.
2. Identify the UI entry, domain rule, service boundary, state source, and existing tests.
3. State the goal and explicit non-goals.
4. Write a focused failing test for behavior changes.
5. Implement the smallest layer-appropriate change.
6. Run the focused verification.
7. Start `npm run review` for UI changes and provide the URL.
8. Update the feature document and report unverified areas.
