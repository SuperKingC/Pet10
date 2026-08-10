# Change Protocol

## Before editing

Record:

- repository root and worktree path;
- current branch and base commit;
- clean/dirty status;
- target behavior;
- explicit non-goals;
- focused verification command.

## During editing

- Make one cohesive change.
- Prefer a failing focused test before behavior changes.
- Do not rewrite unrelated files.
- Do not carry forward an unverified workaround from an old worktree.
- Stop and report when the required behavior is ambiguous.

## Before handoff

Run the smallest relevant verification first. For UI changes, run `npm run review` and provide the URL. For merge or deployment, run `npm run verify:full`.

Report:

```text
Goal:
Files changed:
Behavior changed:
Tests:
Review URL:
Not verified:
Rollback:
```
