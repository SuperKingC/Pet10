import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const viewPath = path.resolve(__dirname, 'MiniappJournalView.tsx')
const viewStylesPath = path.resolve(__dirname, 'MiniappJournalView.scss')

describe('journal today loading presentation', () => {
  it('waits for the week diaries to load before rendering the empty-state copy', () => {
    const component = fs.readFileSync(viewPath, 'utf8')

    // 首次进入（无缓存）时先处于加载态，周日记返回前不得渲染「还没有日记」默认文案
    expect(component).toMatch(/const \[diariesLoading, setDiariesLoading\] = useState\(\(\) =>\s*getCachedWeekDiaries\(initialWeekKeys\.from, initialWeekKeys\.to\) === null\s*\)/)
    expect(component).toMatch(/diariesLoading \? \(\s*<View className="journal-today__loading">/)
    expect(component).toMatch(/\) : \(\s*<>[\s\S]*?还没有日记/)
  })

  it('skips the skeleton and serves cached diaries when the week was loaded before', () => {
    const component = fs.readFileSync(viewPath, 'utf8')

    // tab 切换重挂载时命中周缓存：初始 diaries 直接来自缓存，不再重播骨架动画
    expect(component).toContain('import { getCachedWeekDiaries, setCachedWeekDiaries } from \'./journalWeekCache\'')
    expect(component).toMatch(/const \[diaries, setDiaries\] = useState<MiniappDiary\[\]>\(\(\) => getCachedWeekDiaries\(initialWeekKeys\.from, initialWeekKeys\.to\) \?\? \[\]\)/)
    // 请求成功后写入缓存，供下次挂载直接展示
    expect(component).toContain('setCachedWeekDiaries(weekFrom, weekTo, items)')
    // 有缓存的周刷新时不置 loading，静默替换数据
    expect(component).toMatch(/const cached = getCachedWeekDiaries\(weekFrom, weekTo\)\s*\/\/ 有缓存的周不再播骨架：先展示旧数据，请求返回后静默替换\s*setDiariesLoading\(cached === null\)/)
  })

  it('prefetches the current week after login and clears the cache on logout', () => {
    const component = fs.readFileSync(viewPath, 'utf8')
    const indexPath = path.resolve(__dirname, '../../pages/index/index.tsx')
    const page = fs.readFileSync(indexPath, 'utf8')

    expect(page).toContain('import { clearCachedWeekDiaries, prefetchCurrentWeekDiaries } from \'../../features/main/journalWeekCache\'')
    // 首次登录成功后与已登录冷启动时都后台预取
    expect(page).toMatch(/await authApi\.loginWithWechat\(\)\s*prefetchCurrentWeekDiaries\(\)/)
    expect(page).toMatch(/void prepareLaunch\(\)\s*\/\/ 已登录启动时后台预取本周日记，首次进小记也能直接命中缓存\s*prefetchCurrentWeekDiaries\(\)/)
    // 登出清缓存，防止下个账号读到上个账号的日记
    expect(page).toMatch(/clearAccessToken\(\)\s*clearCachedWeekDiaries\(\)/)
  })

  it('centers the empty-state copy inside the fixed-height stage', () => {
    const component = fs.readFileSync(viewPath, 'utf8')
    const styles = fs.readFileSync(viewStylesPath, 'utf8')

    // snippet 定高 100% 会使 stage 的 align-items 失效，空态必须显式垂直居中
    expect(component).toContain('journal-today__snippet--empty')
    expect(styles).toMatch(/\.journal-today__snippet--empty \{[^}]*justify-content: center;/)
  })

  it('shows shimmer skeleton bars with a reduced-motion fallback while loading', () => {
    const styles = fs.readFileSync(viewStylesPath, 'utf8')

    expect(styles).toMatch(/\.journal-today__loading \{/)
    expect(styles).toMatch(/\.journal-today__skeleton \{[^}]*background-size: 200% 100%;/)
    expect(styles).toMatch(/\.journal-today__skeleton \{[^}]*animation: journal-shimmer 1\.4s linear infinite;/)
    expect(styles).toMatch(/@keyframes journal-shimmer \{ to \{ background-position: -200% 0; \} \}/)
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.journal-today__skeleton \{ animation: none; \}\s*\}/)
  })
})
