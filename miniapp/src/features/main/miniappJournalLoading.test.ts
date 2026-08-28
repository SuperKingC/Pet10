import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const viewPath = path.resolve(__dirname, 'MiniappJournalView.tsx')
const viewStylesPath = path.resolve(__dirname, 'MiniappJournalView.scss')

describe('journal today loading presentation', () => {
  it('waits for the week diaries to load before rendering the empty-state copy', () => {
    const component = fs.readFileSync(viewPath, 'utf8')

    // 进入小记先处于加载态，周日记返回前不得渲染「还没有日记」默认文案
    expect(component).toContain('const [diariesLoading, setDiariesLoading] = useState(true)')
    expect(component).toMatch(/diariesLoading \? \(\s*<View className="journal-today__loading">/)
    expect(component).toMatch(/\) : \(\s*<>[\s\S]*?还没有日记/)
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
