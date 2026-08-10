# Tarot Animation Rules

## Canonical flow

```text
question → spread → shuffle → cut → fan → reveal → reading
```

The reducer is the only source of truth for stage transitions. Animation tokens and interaction locks are separate from business data.

## Required behavior

- A stage has one entry condition, one user action contract, and one exit transition.
- A completed animation unlocks the next action exactly once.
- Repeated clicks cannot dispatch duplicate stage transitions.
- Reduced motion completes the logical result without leaving an animation lock.
- CSS for tarot lives in `src/games/tarot/tarotRitual.css`.
- Do not add a later override to compensate for an earlier unknown rule.
- Do not mix unrelated animation changes with business or asset changes.

## Change workflow

1. Read `docs/visual-baselines/tarot/`.
2. Start from the latest `main` and record the base commit.
3. Change one stage or one visual target.
4. Update the timeline or acceptance point before changing code.
5. Run focused tests.
6. Open `/dev/tarot?stage=<stage>` and provide the review URL.
7. Check mobile, desktop, reduced motion, rapid input, and browser console.
8. Wait for user acceptance before merge or deployment.
