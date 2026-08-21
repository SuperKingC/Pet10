# Shuffle Visual Checkpoint

## Timing

- The existing `2000ms` long-press progress contract remains unchanged.
- Progress pauses on pointer release and resumes from the current percentage.

## Visual layers

- The deck shows two arcane orbit rings and a central rune while held.
- Orbit rotation, rune charging, and card interleaving run together during the hold.
- Reaching `100%` emits one expanding energy burst without changing the reducer contract.

## Accessibility

- Reduced motion keeps the static ritual layers and disables orbit, charge, and burst animation.
- The decorative layers are `aria-hidden` and do not change the button's accessible label.

## Non-goals

- No changes to tarot data, reading logic, stage transitions, or card assets.
