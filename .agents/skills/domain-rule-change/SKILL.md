---
name: domain-rule-change
description: Use when changing business rules, calculations, validation, or shared contracts.
---

# Domain Rule Change

1. Locate every frontend and backend consumer of the rule.
2. Decide whether the rule belongs in shared pure code or separate adapters.
3. Add tests for valid input, invalid input, boundaries, and compatibility.
4. Keep domain code free of React, HTTP, storage, and environment access.
5. Run frontend and server tests that cover the rule.
6. Update the feature document with the user-visible consequence.
