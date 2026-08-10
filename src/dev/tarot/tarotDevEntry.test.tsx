import { describe, expect, it } from 'vitest'
import { getTarotDevStage, isTarotDevStage, TAROT_DEV_STAGES, TarotDevEntry } from './TarotDevEntry'
import { renderToStaticMarkup } from 'react-dom/server'

describe('tarot development entry', () => {
  it('supports every documented stage', () => {
    expect(TAROT_DEV_STAGES).toEqual(['question', 'spread', 'shuffle', 'cut', 'fan', 'reveal', 'reading'])
    expect(getTarotDevStage('?stage=cut')).toBe('cut')
  })

  it('falls back to question for unknown stages', () => {
    expect(getTarotDevStage('?stage=unknown')).toBe('question')
    expect(isTarotDevStage('cut')).toBe(true)
    expect(isTarotDevStage('unknown')).toBe(false)
  })

  it('renders the requested formal stage component', () => {
    const markup = renderToStaticMarkup(<TarotDevEntry search="?stage=cut" />)
    expect(markup).toContain('data-dev-stage="cut"')
    expect(markup).toContain('tarot-cut')
  })
})
