# Personal Daily Fortune Design

## Goal

Replace the room-based "今日共养运势" with a compact, personal "今日运势" experience. The feature must feel like a deliberately edited daily horoscope, remain visually quiet, and have no relationship to Xiaoduoli, shared pet care, friend moods, or AI generation.

## Product Placement

- Rename the bottom navigation label `日历` to `日常`. Keep its internal tab key unchanged to avoid unrelated routing churn.
- Keep the monthly calendar and mood check-in as the main content of the `日常` tab.
- Place one compact `今日运势` summary row between the `日常` header and the calendar. It shows the user's zodiac, overall rating, and one short summary. Its height should stay close to a normal list row rather than a full card.
- Tapping the row opens a dedicated full-screen fortune detail view. Returning restores the user to the same `日常` tab and calendar month.
- Rename `游戏墙` to `一起玩`. Tarot, Gobang, and the footprint map remain there; fortune is not added to this group.

This keeps daily information discoverable without permanently taking space away from the calendar.

## Content And Voice

The fortune belongs only to the signed-in user and is derived from the user's birthday, zodiac, and the current calendar day. The displayed sections are:

- `综合`
- `感情`
- `工作 / 学习`
- `财运`
- `健康`
- `幸运色`
- `幸运数字`
- `今日提示`

Copy is concise, specific, and editorial. It avoids chatty phrasing, excessive mysticism, promises of guaranteed outcomes, and references to generation or analysis. It must not mention Xiaoduoli, pets, shared care, the friend, pair compatibility, mood records, or pet interactions.

The existing profile field label changes from `生日（用于星座运势）` to `生日`.

## Visual Design

The compact entry uses a white or paper-like surface, a thin neutral border or separator, blue-gray typography, and restrained star/rating indicators. It must not use the current gradient-heavy fortune card, pet icons, decorative blobs, or loading copy such as `小多利正在翻星盘…`.

The detail view follows the supplied editorial horoscope reference without copying it literally:

- A normal mobile title bar with a back button and `今日运势` title.
- Date and zodiac near the top, with the overall rating as the strongest information signal.
- Category sections separated by fine rules, using compact headings and readable paragraph text.
- Lucky color is represented by a color swatch plus its text name; lucky number remains textual.
- The layout scrolls vertically and respects the top and bottom safe areas.

Loading uses a neutral skeleton or `正在加载今日运势`; errors offer a compact retry action. Neither state attributes the result to AI or Xiaoduoli.

## Personal Fortune Model

Replace the shared fortune content with a personal structure:

```ts
interface FortuneContent {
  zodiac: string
  overall: { rating: number; summary: string }
  love: { rating: number; text: string }
  workStudy: { rating: number; text: string }
  wealth: { rating: number; text: string }
  health: { rating: number; text: string }
  luckyColor: { name: string; hex: string }
  luckyNumber: number
  dailyTip: string
}
```

Ratings are integers from 1 through 5. The color hex value must come from a controlled palette so the client never renders arbitrary CSS.

Fortune selection is deterministic and template-based. A stable seed from `userId + local day + zodiac` selects curated text fragments and ratings. The same user receives the same result throughout a day, while different users can receive different results. No AI provider call is made.

## Data And API

- Add an authenticated user-scoped endpoint for today's fortune instead of requiring a room ID.
- Store fortunes by `user_id + day`, not `room_id + day`. Add a database migration rather than rewriting an already-applied migration.
- The server reads the authenticated user's birthday and calculates the zodiac. It does not read room members, friend moods, or pet state.
- Existing room-scoped fortune data can remain as historical database rows during migration, but it is no longer read by the application.
- If the user has no birthday, return an explicit `birthday_required` response. The compact entry then displays `设置生日，查看今日运势` and opens the existing profile birthday editor. It must not assign a random or default zodiac.
- The client may cache the successful response for the current session, but the server remains the source of truth for the day boundary.

## Removed Coupling

- Remove `mine`, `friend`, `pair`, and `luckyAction` from the fortune model.
- Remove the fortune fetch and `luckyAction` prop from `AppShell` and `NestTab`.
- Remove the `今日幸运互动` hint from the nest.
- Pet actions no longer query fortune data and no longer award the fortune-based `+5` intimacy bonus.
- Keep the general pet action behavior and other contribution calculations unchanged.
- Remove the AI fortune method and prompt if it has no remaining callers after the migration.

## Navigation And State

The fortune detail is an application subview, not a fifth bottom tab. Opening it preserves the selected bottom tab as `日常`; closing it returns to the calendar. The back affordance and browser/device back behavior should both close the detail before leaving the app where the current shell architecture permits it.

Only the compact entry initiates fortune loading. The calendar and mood features continue to work when fortune loading fails or birthday is missing.

## Error Handling

- `birthday_required`: show the profile setup call to action.
- Network or server error: retain the calendar, show a short unavailable message in the compact row, and provide retry.
- Invalid stored/generated content: reject it at the server boundary and fall back to a valid deterministic template.
- Day rollover while the app remains open: refetch when the app becomes active or the `日常` tab is revisited after the date changes.

## Verification

- Unit tests verify zodiac boundary dates, deterministic same-day results, variation across users/days, rating ranges, and controlled lucky colors.
- Repository and route tests verify authenticated user scoping and one record per user per day.
- Service tests verify that fortune generation does not access rooms, moods, pets, or the AI provider.
- Pet service tests verify that pet actions never receive a fortune-based bonus.
- Component tests cover compact summary, detail opening and closing, birthday-required behavior, loading, retry, and the revised labels `日常`, `今日运势`, `一起玩`, and `生日`.
- Production frontend/server builds and the complete existing test suites must pass.
- Mobile visual verification checks that the compact entry does not displace the calendar excessively, the detail page respects safe areas, and no legacy pet/shared-care styling or copy remains.

## Out Of Scope

- Weekly, monthly, compatibility, or friend fortune reports.
- Notifications or scheduled reminders for the daily fortune.
- User-selectable fortune themes or manual zodiac overrides.
- Moving Tarot, Gobang, or the footprint map outside the nest in this change.
