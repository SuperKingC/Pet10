# Testing and Review Rules

## Verification levels

### Level 1: development

Run the smallest relevant test and type check. For UI changes, inspect only the changed page.

### Level 2: user acceptance

Run the relevant miniapp/server tests, rebuild `miniapp/dist`, preview it in WeChat DevTools, and check the console output. The user validates UI and interaction behavior.

### Level 3: merge or deployment

Run:

```powershell
npm run verify:full
```

This includes miniapp tests, server tests, production builds, documentation checks, and asset checks.

## User acceptance gate

AI automated checks do not replace human visual acceptance. Do not merge or deploy a UI change until the user confirms the DevTools preview.

## Failure handling

Report the first failing command and stop. Do not hide failures by weakening tests, increasing timeouts, or skipping unrelated checks without explaining why.
