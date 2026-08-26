---
name: react-refactor
description: Use when restructuring React components without changing product behavior.
---

# React Refactor

适用范围：`miniapp/` 内的 React 组件重构。

1. Record current behavior and tests before editing.
2. Move one responsibility at a time into a hook, feature component, domain module, or service.
3. Keep public props and user-visible behavior stable unless the task explicitly changes them.
4. Run the same tests before and after the extraction.
5. Do not combine refactoring with copy, CSS, API, or asset changes.
6. Update the feature document only when the user-visible flow or entry point changes.
