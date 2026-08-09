# Tarot Reading V2 and Ritual Flow Design

## Scope

Keep the existing 22-card Major Arcana deck. Improve the professional depth of readings and the completeness, responsiveness, and ritual quality of the entire mobile flow.

## Flow

The sequence remains question, spread, shuffle, cut, fan, reveal, and reading. A compact progress indicator keeps the user oriented. The selected question remains visible after the entry step. Repeated users may skip the shuffle and cut ritual while retaining a securely randomized draw.

Shuffle provides continuous deck motion and progress feedback. Cut locks input while the two piles separate and return. Selection lifts the chosen card and prevents duplicate input. Reveal remains manual and sequential; after the final card, the result action appears after a short pause.

## Reading Model

Each spread defines position labels and professional prompts. Interpretations combine the card orientation, category, and position purpose. Multi-card readings add a synthesis based on reversal balance and card energy tags. Results render question, core conclusion, spread synthesis, card-by-card evidence, actions, cautions, and a closing reflection.

## Motion

Transitions use short 200-350ms stage entrances, 600ms card flips, and a 500ms final reveal pause. Only the active ritual object moves. All persistent looping motion is subtle. `prefers-reduced-motion` disables looping and collapses transitions to near-instant feedback.

## Reliability

Pointer cancellation and unmount always clear timers. Cut and stage transitions are guarded against repeated input. Five-card layouts wrap into a readable mobile grid. Legacy local records are normalized with missing structured fields so history remains readable.

## Validation

Unit tests cover spread position definitions, position-aware interpretation, synthesis, structured reading fields, and backward-compatible history parsing. The frontend test suite and production build must pass.
