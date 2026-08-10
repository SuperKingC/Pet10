# Tarot Cut Depth Animation Design

## Goal

Replace the cut-stage position swap with one readable, continuous card-pile transfer. The user must see the upper half lift out of the deck, move toward the viewer, pass over the lower half, and settle behind it with visible card thickness.

## Root Cause

The active cut animation moves both halves between the same two vertical coordinates. The upper half travels from `0` to `34px` while the lower half travels from `34px` to `0`. Because both card backs are visually flat and the depth change is small, the motion reads as a one-frame exchange even though intermediate keyframes exist. Older cut rules also remain in the stylesheet, making the active contract difficult to inspect and maintain.

## Approved Motion

The current React state model remains unchanged: `cutting` starts the animation, `finishCut` accepts the active upper-pile animation name, and `cutCount` changes only after the animation completes.

The visual motion uses four phases over about 1.15 seconds:

1. The upper pile separates vertically and tilts toward the viewer.
2. It advances in depth with a very small horizontal curve of no more than 4px.
3. It crosses the lower pile while the lower pile makes only a restrained receiving motion.
4. It settles at the lower resting coordinate with its shadows and tilt returning to rest.

Each half-pile gains pseudo-element layers that reveal a thin stack edge. The button retains perspective, and the moving pile uses `translate3d`, `rotateX`, `rotateZ`, scale, shadow, and brightness only. Layout properties do not animate.

## Interaction Rules

- Repeated cut clicks remain locked while `cutting` is true.
- The continue button remains disabled until at least one cut finishes and while a cut is running.
- Repeated cuts alternate which DOM half is the active upper pile without changing the motion language.
- Reduced-motion users receive an effectively immediate single-iteration state change.
- The final animated transforms exactly match the next static swapped state so React does not introduce a positional snap at `animationend`.

## Files

- `src/games/tarot/tarotRitualStyles.test.ts`: add source-level regression assertions for the four motion phases, pile thickness, limited horizontal travel, and matching final/static transforms.
- `src/styles.css`: replace the active cut-stage rules with one final depth animation and remove obsolete cut-animation blocks that can override or obscure it.
- `src/games/tarot/TarotGame.tsx`: preserve the current state sequence; only change animation-name handling if the final CSS contract requires it.

## Acceptance Criteria

- The moving half is visually identifiable throughout the cut.
- The lower half no longer appears to trade positions at the same speed as the moving half.
- The card stack has visible thickness at rest and during movement.
- The moving half has no horizontal displacement larger than 4px.
- The final frame and swapped rest state use the same `translate3d` coordinates.
- Focused tarot motion tests, the full test suite, TypeScript, and the Vite production build pass.
- Desktop and mobile browser inspection show no overlap, clipping, or jump at animation completion.
