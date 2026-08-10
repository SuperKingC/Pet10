# Testing and Review Rules

## Verification levels

### Level 1: development

Run the smallest relevant test and type check. For animation, inspect only the changed stage.

### Level 2: user acceptance

Run the relevant frontend/backend tests, start `npm run review`, check the browser console, and provide a clickable URL. The user validates UI and animation behavior.

### Level 3: merge or deployment

Run:

```powershell
npm run verify:full
```

This includes type checking, frontend tests, server tests, production builds, architecture checks, documentation checks, and asset checks.

## User acceptance gate

AI automated checks do not replace human visual acceptance. Do not merge or deploy a UI or animation change until the user confirms the review URL.

## Failure handling

Report the first failing command and stop. Do not hide failures by weakening tests, increasing timeouts, or skipping unrelated checks without explaining why.
