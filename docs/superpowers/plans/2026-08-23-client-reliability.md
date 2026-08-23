# Client Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve valid client sessions and current room data across transient failures, duplicate loads, and asynchronous response races.

**Architecture:** Add a typed HTTP error boundary and a pure session-startup classifier for the PWA. Extract miniapp launch data loading into a small service that commits state only after context and current-pet requests both succeed. Keep room bootstrap lifecycle in refs so concurrent callers share one promise, successful rooms are skipped, and bootstrap messages merge with messages already received by realtime or local actions.

**Tech Stack:** React 19, TypeScript, Vitest, jsdom, Taro, Socket.IO.

---

### Task 1: Establish the focused baseline

**Files:**
- Read: `src/services/httpClient.ts`, `src/main.tsx`, `src/state/useRoomRuntime.ts`
- Read: `miniapp/src/pages/index/index.tsx`, `miniapp/src/services/launchContextApi.ts`, `miniapp/src/services/petApi.ts`

- [ ] **Step 1: Run the current focused suites**

Run:

```powershell
npx vitest --run src/services/sessionApi.test.ts src/services/messageCollection.test.ts
npm test --prefix miniapp -- --run src/services/launchContextApi.test.ts src/services/launchAssetLoader.test.ts
```

Expected: all selected existing tests pass. This confirms the baseline before adding behavior tests.

### Task 2: Classify PWA session startup failures

**Files:**
- Create: `src/services/sessionStartup.ts`
- Create: `src/services/sessionStartup.test.ts`
- Modify: `src/services/httpClient.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the failing classifier tests**

Create `src/services/sessionStartup.test.ts` with these cases:

```ts
import { describe, expect, it } from 'vitest'
import { HttpError } from './httpClient'
import { classifySessionStartupError } from './sessionStartup'

describe('classifySessionStartupError', () => {
  it('clears the token only for an explicit unauthorized response', () => {
    expect(classifySessionStartupError(new HttpError('expired', 401))).toEqual({
      message: 'expired',
      clearToken: true,
    })
    expect(classifySessionStartupError(new HttpError('forbidden', 403))).toEqual({
      message: 'forbidden',
      clearToken: true,
    })
  })

  it('keeps the token for server failures', () => {
    expect(classifySessionStartupError(new HttpError('temporary failure', 503))).toEqual({
      message: 'temporary failure',
      clearToken: false,
    })
  })

  it('keeps the token and uses the existing timeout message for aborts', () => {
    expect(classifySessionStartupError(new DOMException('aborted', 'AbortError'))).toEqual({
      message: '服务器响应超时，请检查网络后重试',
      clearToken: false,
    })
  })

  it('keeps the token for network errors', () => {
    expect(classifySessionStartupError(new TypeError('Failed to fetch'))).toEqual({
      message: '网络连接失败，请检查网络后重试',
      clearToken: false,
    })
  })
})
```

- [ ] **Step 2: Run the new suite and verify the expected RED failure**

Run:

```powershell
npx vitest --run src/services/sessionStartup.test.ts
```

Expected: FAIL because `HttpError` and `classifySessionStartupError` do not exist yet.

- [ ] **Step 3: Add a typed HTTP error without changing network exceptions**

In `src/services/httpClient.ts`, add:

```ts
export class HttpError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}
```

Change only the non-OK branch of `apiRequest` to throw `new HttpError(body.error || \`request_failed:${response.status}\`, response.status)`. Leave `fetch` rejections untouched so abort and offline errors retain their native identity.

- [ ] **Step 4: Implement the pure classifier**

Create `src/services/sessionStartup.ts`:

```ts
import { HttpError } from './httpClient'

export interface SessionStartupFailure {
  message: string
  clearToken: boolean
}

export function classifySessionStartupError(error: unknown): SessionStartupFailure {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { message: '服务器响应超时，请检查网络后重试', clearToken: false }
  }
  if (error instanceof HttpError && (error.status === 401 || error.status === 403)) {
    return { message: error.message, clearToken: true }
  }
  if (error instanceof HttpError) {
    return { message: error.message, clearToken: false }
  }
  if (error instanceof TypeError) {
    return { message: '网络连接失败，请检查网络后重试', clearToken: false }
  }
  return {
    message: error instanceof Error ? error.message : '会话加载失败',
    clearToken: false,
  }
}
```

- [ ] **Step 5: Run the classifier suite and verify GREEN**

Run `npx vitest --run src/services/sessionStartup.test.ts`. Expected: 4 tests pass.

- [ ] **Step 6: Route `main.tsx` through the classifier**

Import `classifySessionStartupError` in `src/main.tsx`. In `refreshSession`'s non-abort catch path, compute `const failure = classifySessionStartupError(sessionError)`, remove the access token only when `failure.clearToken` is true, and set `failure.message`. Keep the explicit abort branch behavior equivalent or replace it with the classifier while preserving `setSession(undefined)` and the existing retry UI. Do not clear the token for timeout, `TypeError`, or HTTP 5xx.

- [ ] **Step 7: Run the PWA focused suite and TypeScript check**

Run:

```powershell
npx vitest --run src/services/sessionStartup.test.ts src/services/sessionApi.test.ts
npx tsc -b
```

Expected: all selected tests pass and TypeScript exits 0.

- [ ] **Step 8: Commit the session change**

```powershell
git add src/services/httpClient.ts src/services/sessionStartup.ts src/services/sessionStartup.test.ts src/main.tsx
git commit -m "修复会话启动错误分类"
```

### Task 3: Propagate miniapp launch failures

**Files:**
- Create: `miniapp/src/services/launchPreparation.ts`
- Create: `miniapp/src/services/launchPreparation.test.ts`
- Modify: `miniapp/src/pages/index/index.tsx`
- Update docs: `docs/features/miniapp-wechat-launch.md`

- [ ] **Step 1: Write the failing launch preparation tests**

Create `miniapp/src/services/launchPreparation.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { LaunchContext } from './launchContextApi'
import type { RoomBootstrap } from './petApi'
import { prepareLaunchContext } from './launchPreparation'

const context: LaunchContext = {
  user: { id: 'user-1', displayName: 'One' },
  rooms: [],
  pendingInvitations: [],
  activeRoomId: 'room-1',
  entry: 'room-list',
  assetVersion: 'v1',
}
const pet: RoomBootstrap = {
  room: { id: 'room-1', type: 'pair', proactiveEnabled: true },
  pet: {
    id: 'pet-1', name: '小多利', level: 1, experience: 0, experienceToNextLevel: 10,
    hunger: 1, mood: 1, energy: 1, health: 1, intimacy: 1,
  },
}

describe('prepareLaunchContext', () => {
  it('propagates context failures', async () => {
    const getContext = vi.fn().mockRejectedValue(new Error('offline'))
    const getPet = vi.fn()

    await expect(prepareLaunchContext(getContext, getPet)).rejects.toThrow('offline')
    expect(getPet).not.toHaveBeenCalled()
  })

  it('propagates current-pet failures after context succeeds', async () => {
    const getContext = vi.fn().mockResolvedValue(context)
    const getPet = vi.fn().mockRejectedValue(new Error('pet unavailable'))

    await expect(prepareLaunchContext(getContext, getPet)).rejects.toThrow('pet unavailable')
  })

  it('returns context, active room, and mapped pet only after both requests succeed', async () => {
    const getContext = vi.fn().mockResolvedValue(context)
    const getPet = vi.fn().mockResolvedValue(pet)

    await expect(prepareLaunchContext(getContext, getPet)).resolves.toEqual({
      context,
      roomId: 'room-1',
      pet: expect.objectContaining({ id: 'pet-1', name: '小多利' }),
    })
  })
})
```

- [ ] **Step 2: Run the miniapp suite and verify the expected RED failure**

Run `npm test --prefix miniapp -- --run src/services/launchPreparation.test.ts`. Expected: FAIL because `prepareLaunchContext` does not exist.

- [ ] **Step 3: Implement the launch preparation service**

Create `miniapp/src/services/launchPreparation.ts`:

```ts
import type { LaunchContext } from './launchContextApi'
import type { RoomBootstrap } from './petApi'
import type { PetState } from '../domain/types'
import { mapRoomPet } from './petMapper'

export interface PreparedLaunchContext {
  context: LaunchContext
  roomId: string
  pet: PetState | null
}

export async function prepareLaunchContext(
  getContext: () => Promise<LaunchContext>,
  getPet: (roomId: string) => Promise<RoomBootstrap>,
): Promise<PreparedLaunchContext> {
  const context = await getContext()
  const roomId = context.activeRoomId || ''
  const pet = roomId ? (await getPet(roomId)).pet : null
  return { context, roomId, pet: pet ? mapRoomPet(pet) : null }
}
```

- [ ] **Step 4: Run the service suite and verify GREEN**

Run `npm test --prefix miniapp -- --run src/services/launchPreparation.test.ts`. Expected: 3 tests pass.

- [ ] **Step 5: Use the service from `index.tsx` and preserve retry state**

Import `prepareLaunchContext`. Remove the direct `mapRoomPet` import. Refactor `loadContext(activeRoomId?)` to call `prepareLaunchContext(() => launchContextApi.get(activeRoomId, invitationToken), petApi.getRoom)`, then commit `context`, `roomId`, storage, message, and `pet` after it resolves. Keep `setLoading(false)` in `finally`, but remove the catch that converts errors to a normal return; let the caller decide how to present the failure.

Keep `prepareLaunch`'s existing catch so it sets `launchError` and returns false while leaving `launchPhase` as `preparing`. In non-startup room-switch callbacks, call a small local wrapper:

```ts
const loadRoomContext = (nextRoomId: string) => {
  void loadContext(nextRoomId).catch((error) => {
    setMessage(error instanceof Error ? error.message : '读取 Pet10 状态失败')
  })
}
```

Use it in `selectRoom` and the messages-view `onOpenRoom` callback. `prepareLaunch` remains the only startup caller and continues to catch through `Promise.all`.

- [ ] **Step 6: Update the launch feature document**

In `docs/features/miniapp-wechat-launch.md`, document that launch context and active-room pet loading are one preparation transaction: either both complete and the phase becomes `ready`, or the token remains intact and the launch loading view exposes retry. Document that room switching reports its own error without changing the startup phase.

- [ ] **Step 7: Run miniapp focused tests and build**

Run:

```powershell
npm test --prefix miniapp -- --run src/services/launchPreparation.test.ts src/services/launchContextApi.test.ts src/services/launchAssetLoader.test.ts
npm run build:weapp --prefix miniapp
```

Expected: tests pass and the WeChat build exits 0.

- [ ] **Step 8: Clear generated miniapp output and rebuild after the source change**

Delete only `D:\Pet10\miniapp\dist`, then run `npm run build:weapp --prefix miniapp` again. Confirm `miniapp/dist` is regenerated. Do not commit generated output unless it is already tracked by the repository.

- [ ] **Step 9: Commit the miniapp launch change**

```powershell
git add miniapp/src/services/launchPreparation.ts miniapp/src/services/launchPreparation.test.ts miniapp/src/pages/index/index.tsx docs/features/miniapp-wechat-launch.md
git commit -m "修复小程序启动失败传播"
```

### Task 4: Make room bootstrap single-flight and merge realtime messages

**Files:**
- Create: `src/state/useRoomRuntime.test.tsx`
- Modify: `src/state/useRoomRuntime.ts`
- Read: `src/services/messageCollection.ts`, `src/services/socialApi.ts`, `src/services/realtimeClient.ts`
- Update docs: `docs/features/app-navigation.md`, `docs/features/chat.md`

- [ ] **Step 1: Write the failing Hook tests**

Create `src/state/useRoomRuntime.test.tsx` with a controllable bootstrap promise and mocked realtime connection:

```tsx
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoomRuntime } from './useRoomRuntime'
import type { Message } from '../domain/types'

const bootstrapRoom = vi.fn()
let realtimeHandlers: { onMessage: (payload: { roomId: string } & Record<string, unknown>) => void } | undefined
const connection = { socket: undefined, joinRoom: vi.fn(), sendTyping: vi.fn(), emitGame: vi.fn(), disconnect: vi.fn() }

vi.mock('../services/socialApi', () => ({ socialApi: { bootstrapRoom } }))
vi.mock('../services/realtimeClient', () => ({
  connectRealtime: vi.fn((handlers) => {
    realtimeHandlers = handlers
    return connection
  }),
}))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const message = (id: string, sender: Message['sender'] = 'friend'): Message => ({
  id, sender, kind: 'text', text: id, createdAt: `2026-08-23T00:00:0${id}Z`, senderId: sender === 'friend' ? 'friend-1' : undefined,
})

function renderRuntime() {
  let current!: ReturnType<typeof useRoomRuntime>
  const root = createRoot(document.createElement('div'))
  function Harness() { current = useRoomRuntime({ userId: 'user-1' }); return null }
  act(() => root.render(<Harness />))
  return { root, get current() { return current } }
}

describe('useRoomRuntime room bootstrap', () => {
  beforeEach(() => {
    bootstrapRoom.mockReset()
    connection.joinRoom.mockReset()
    realtimeHandlers = undefined
  })

  it('shares one bootstrap promise between concurrent callers and skips later successful loads', async () => {
    let resolve!: (value: { room: { id: string; type: 'pair'; proactiveEnabled: boolean }; pet: null; messages: Message[]; memories: [] }) => void
    bootstrapRoom.mockReturnValue(new Promise((r) => { resolve = r }))
    const runtime = renderRuntime()

    let first!: Promise<void>
    let second!: Promise<void>
    act(() => { first = runtime.current.loadRoom('room-1'); second = runtime.current.loadRoom('room-1') })
    expect(bootstrapRoom).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)

    await act(async () => {
      resolve({ room: { id: 'room-1', type: 'pair', proactiveEnabled: true }, pet: null, messages: [], memories: [] })
      await first
    })
    await act(async () => { await runtime.current.loadRoom('room-1') })
    expect(bootstrapRoom).toHaveBeenCalledTimes(1)
    act(() => runtime.root.unmount())
  })

  it('keeps a realtime message that arrives while bootstrap is in flight', async () => {
    let resolve!: (value: { room: { id: string; type: 'pair'; proactiveEnabled: boolean }; pet: null; messages: Message[]; memories: [] }) => void
    bootstrapRoom.mockReturnValue(new Promise((r) => { resolve = r }))
    const runtime = renderRuntime()
    let load!: Promise<void>
    act(() => { load = runtime.current.loadRoom('room-1') })
    act(() => {
      realtimeHandlers?.onMessage({ roomId: 'room-1', id: 'live-1', senderType: 'user', senderId: 'friend-1', content: 'live', createdAt: '2026-08-23T00:00:03Z' })
    })
    await act(async () => {
      resolve({ room: { id: 'room-1', type: 'pair', proactiveEnabled: true }, pet: null, messages: [message('snapshot-1')], memories: [] })
      await load
    })
    expect(runtime.current.states['room-1'].messages.map(({ id }) => id)).toEqual(['snapshot-1', 'live-1'])
    act(() => runtime.root.unmount())
  })

  it('removes a failed request from the in-flight cache so a later call can retry', async () => {
    bootstrapRoom.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ room: { id: 'room-1', type: 'pair', proactiveEnabled: true }, pet: null, messages: [], memories: [] })
    const runtime = renderRuntime()

    await act(async () => { await runtime.current.loadRoom('room-1') })
    await act(async () => { await runtime.current.loadRoom('room-1') })
    expect(bootstrapRoom).toHaveBeenCalledTimes(2)
    act(() => runtime.root.unmount())
  })
})
```

- [ ] **Step 2: Run the Hook suite and verify the expected RED failure**

Run `npx vitest --run src/state/useRoomRuntime.test.tsx`. Expected: FAIL because concurrent calls currently invoke bootstrap twice, return different promises, overwrite the live message, and failed requests are marked loaded.

- [ ] **Step 3: Add refs and a message merge helper in `useRoomRuntime.ts`**

Add refs inside the Hook:

```ts
const loadedRoomsRef = useRef(new Set<string>())
const loadingRoomsRef = useRef(new Map<string, Promise<void>>())
```

Add a local helper before `loadRoom`:

```ts
function mergeMessages(snapshot: Message[], current: Message[]): Message[] {
  const snapshotIds = new Set(snapshot.map((message) => message.id))
  return [...snapshot, ...current.filter((message) => !snapshotIds.has(message.id))]
}
```

- [ ] **Step 4: Replace `loadRoom` with single-flight lifecycle handling**

Implement `loadRoom` so it:

1. Returns `Promise.resolve()` when `loadedRoomsRef.current.has(roomId)`.
2. Returns the existing promise when `loadingRoomsRef.current.get(roomId)` exists.
3. Sets `loading: true` synchronously with `patchRoom` before starting the request.
4. Creates one promise that calls `socialApi.bootstrapRoom`, then uses a functional state patch to merge `bootstrap.messages` with the current messages, sets `loaded: true`, `loading: false`, pet, and memories, adds the room to `loadedRoomsRef`, and joins realtime.
5. On rejection, clears `loading` without setting `loaded`, rethrows the original error, and removes the promise from `loadingRoomsRef` in `finally` only if it is still the same promise.

Use this concrete shape to avoid a closure race:

```ts
const loadRoom = useCallback((roomId: string) => {
  if (loadedRoomsRef.current.has(roomId)) return Promise.resolve()
  const existing = loadingRoomsRef.current.get(roomId)
  if (existing) return existing

  patchRoom(roomId, { loading: true })
  const request = (async () => {
    const bootstrap = await socialApi.bootstrapRoom(roomId, optionsRef.current.userId ?? '')
    patchRoom(roomId, (previous) => ({
      loaded: true,
      loading: false,
      messages: mergeMessages(bootstrap.messages, previous.messages),
      pet: bootstrap.pet,
      memories: bootstrap.memories,
    }))
    loadedRoomsRef.current.add(roomId)
    realtimeRef.current?.joinRoom(roomId)
  })()
  loadingRoomsRef.current.set(roomId, request)
  void request.catch(() => {
    patchRoom(roomId, { loading: false })
  }).finally(() => {
    if (loadingRoomsRef.current.get(roomId) === request) loadingRoomsRef.current.delete(roomId)
  })
  return request
}, [patchRoom])
```

The rejection observer must not replace the returned promise, so callers can still observe the original rejection while the Hook cleans its own state.

- [ ] **Step 5: Run the Hook suite and verify GREEN**

Run `npx vitest --run src/state/useRoomRuntime.test.tsx`. Expected: 3 tests pass. Then run `npx vitest --run src/state/useRoomRuntime.test.tsx src/services/messageCollection.test.ts`.

- [ ] **Step 6: Update navigation/chat docs**

In `docs/features/app-navigation.md`, state that conversation-list preloading is single-flight per room and successful rooms are not bootstrapped again. In `docs/features/chat.md`, state that messages arriving through realtime while the room snapshot is loading are retained and de-duplicated by message ID.

- [ ] **Step 7: Commit the room runtime change**

```powershell
git add src/state/useRoomRuntime.ts src/state/useRoomRuntime.test.tsx docs/features/app-navigation.md docs/features/chat.md
git commit -m "修复房间启动竞态与重复请求"
```

### Task 5: Integrated verification and review

**Files:**
- No additional production files; verify the three committed changes and current worktree changes without reverting user-owned files.

- [ ] **Step 1: Run all focused tests**

```powershell
npx vitest --run src/services/sessionStartup.test.ts src/state/useRoomRuntime.test.tsx src/services/sessionApi.test.ts
npm test --prefix miniapp -- --run src/services/launchPreparation.test.ts src/services/launchContextApi.test.ts src/services/launchAssetLoader.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run type checks and production builds**

```powershell
npx tsc -b
npm run build:weapp --prefix miniapp
```

Expected: both commands exit 0. If the miniapp build created `miniapp/dist`, clear that directory and rebuild once more as required by the miniapp rules.

- [ ] **Step 3: Run repository verification**

```powershell
npm run verify:full
```

Expected: the repository verification script exits 0. Record any pre-existing warnings separately from failures.

- [ ] **Step 4: Start the review server for the UI-affecting launch flow**

Run `npm run review`. Record the local review URL, inspect the startup/retry path, and report it in the final handoff. No layout change is expected, but the existing review requirement applies to the user-facing startup state.

- [ ] **Step 5: Commit documentation or test-only follow-ups if needed**

Use a Chinese commit message and include only files changed for this reliability goal. Do not commit `miniapp/dist`, local process state, or unrelated user edits.

- [ ] **Step 6: Report evidence and residual risk**

The final report must include the exact commands and pass/fail results, the review URL, the three reliability behaviors implemented, current uncommitted user-owned files, and unverified real-network/WeChat-device scenarios.

