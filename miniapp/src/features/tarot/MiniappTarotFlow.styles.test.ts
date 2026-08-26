import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesPath = path.resolve(__dirname, 'MiniappTarotFlow.scss')
const shuffleStagePath = path.resolve(__dirname, 'MiniappTarotShuffleStage.tsx')

describe('miniapp tarot WXSS compatibility', () => {
  it('does not emit universal selectors unsupported by the WeChat WXSS compiler', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*/)
    expect(styles).not.toMatch(/\.miniapp-tarot\s+\*::/)
  })

  it('renders a visible state-driven arcane shuffle ritual', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(shuffleStage).toContain('useState(false)')
    expect(shuffleStage).toContain('setIsShuffling(true)')
    expect(shuffleStage).toContain('setIsShuffling(false)')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-deck--active')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-deck--complete')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-orbit--outer')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-rune')
    expect(shuffleStage).toContain('miniapp-tarot__shuffle-burst')
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-spin')
    expect(styles).toContain('@keyframes miniapp-tarot-rune-charge')
    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-burst')
  })

  it('uses an expanded, layered shuffle motion with wider card trajectories', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    // layer-rotation loop: cards fly out and land one visible layer deeper each pass
    expect(styles).toContain('miniapp-tarot-shuffle-left 5.6s')
    expect(styles).toContain('miniapp-tarot-shuffle-right 5.6s')
    expect(styles).toContain('translateX(-138%)')
    expect(styles).toContain('translateX(38%)')
    expect(styles).toContain('--z1')
    expect(styles).toContain('z-index: var(--z2)')
    expect(styles).toContain('z-index: 30')
    // pile step is thick enough to expose the layering edges
    expect(styles).toContain('* 5}rpx')
    // every card owns a unique phase (.56s apart) so no two cards fly in lockstep
    expect(styles).toContain('--shuffle-delay')
    expect(styles).toContain('animation-delay: var(--shuffle-delay)')
    // floating deck drift while holding
    expect(styles).toContain('@keyframes miniapp-tarot-deck-hover')
    // arcane circle redesign: soft aura + invisible circular orbits with light motes + dashed rune ring
    expect(styles).toContain('@keyframes miniapp-tarot-mist-glow')
    expect(styles).toContain('@keyframes miniapp-tarot-orbit-spin')
    expect(styles).toContain('@keyframes miniapp-tarot-rune-spin')
    expect(styles).toContain('border: 2rpx dashed rgba(255, 222, 137, .75)')
    // rune circle is bigger than the card (226x356) so the arcane ring wraps the pile
    expect(styles).toContain('width: 430rpx')
    expect(styles).toContain('border-radius: 24rpx')
    expect(styles).toContain('width: 310rpx')
    expect(styles).not.toContain('width: 600rpx')
    // effects centered on the taller stepped pile, deck box tall enough to clear the bar
    expect(styles).toContain('top: 218rpx')
    expect(styles).toContain('height: 430rpx')
    // rune star pulses gently (no square box-shadow glow)
    expect(styles).toContain('scale(1.12)')
  })

  it('shares one vertical rhythm across ritual stages and keeps text clear of the flying deck', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(shuffleStage).toContain('miniapp-tarot__stage--shuffle')
    // shuffle / cut / fan / reveal all reuse the same base ritual layout,
    // so title position and gaps stay consistent across every stage
    expect(styles).toMatch(/\.miniapp-tarot__stage--ritual,[\s\S]*?\.miniapp-tarot__stage--fan,[\s\S]*?\.miniapp-tarot__stage--reveal \{[\s\S]*?padding-top: 24rpx/)
    // equal-grow spacers above/below the card area center it between the
    // fixed title and the docked controls (auto margins pooled all free
    // space at the stage bottom in the WeChat renderer)
    expect(shuffleStage).toContain('miniapp-tarot__spacer')
    expect(styles).toMatch(/\.miniapp-tarot__spacer \{[\s\S]*?flex: 1 1 0/)
    expect(styles).toMatch(/\.miniapp-tarot__spacer \{[\s\S]*?min-height: 48rpx/)
    // trajectory stays below the title line
    expect(styles).toContain('translateY(-46rpx) rotate(-17deg)')
    expect(styles).not.toContain('translateY(-72rpx)')
  })

  it('restacks the deck as one pile with a top-first reorder once shuffling completes', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const shuffleStage = fs.readFileSync(shuffleStagePath, 'utf8')

    expect(styles).toContain('@keyframes miniapp-tarot-shuffle-settle')
    // cards lift high, swing aside, then return to the single stacked position
    expect(styles).toContain('translateY(-110rpx) rotate(-6deg)')
    expect(styles).toContain('z-index: 30')
    // top card flies first: card 10 has no delay, deeper cards wait longer
    expect(styles).toContain('.miniapp-tarot__shuffle-deck--complete .miniapp-tarot__deck-card')
    expect(styles).toContain('(10 - $index) * 0.06')
    expect(styles).not.toContain('--settle-x')
    // complete state pauses while the user keeps holding, so the active loop wins
    expect(shuffleStage).toContain('progress >= 100 && !isShuffling')
  })

  it('cuts one centered deck: top packet lifts aside and restacks below', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const cutStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotCutStage.tsx'), 'utf8')

    // the cut column shares the unified ritual rhythm (fixed title, auto-centered deck)
    expect(cutStage).toContain('miniapp-tarot__stage--cut')
    expect(cutStage).toContain('miniapp-tarot__stage--ritual')

    // both halves rest stacked as a single centered pile
    expect(styles).toContain('margin-left: -115rpx')
    // the current top packet lifts up-right while the bottom packet stays
    expect(styles).toContain('translate(150rpx, -84rpx) rotate(7deg)')
    // which half lifts follows cut parity, so the old bottom packet ends on top
    expect(styles).toContain('.miniapp-tarot__cut-deck--swapped.miniapp-tarot__cut-deck--cutting')
    // quick lift, springy landing
    expect(styles).toContain('transition-duration: .3s')
    expect(styles).toContain('cubic-bezier(.34, 1.28, .4, 1)')
    // arcane flash pulse while the cut happens
    expect(styles).toContain('@keyframes miniapp-tarot-cut-flash')
    // lifted packet glows with a purple aura while airborne
    expect(styles).toContain('drop-shadow(0 16rpx 22rpx rgba(126, 47, 221, .5)) brightness(1.1)')
    // stardust rises as the cut lands
    expect(styles).toContain('@keyframes miniapp-tarot-cut-spark')
  })

  it('advances straight to shuffling by tapping a spread deck, fading the whole scene out', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const spreadStagePath = path.resolve(__dirname, 'MiniappTarotSpreadStage.tsx')
    const spreadStage = fs.readFileSync(spreadStagePath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    // no bottom "next" button remains in the spread stage
    expect(spreadStage).not.toContain('下一步 · 洗牌')
    expect(spreadStage).not.toContain('onContinue')
    // tapping a deck selects it and advances in one gesture
    expect(spreadStage).toContain('onSelect(option.key)')
    expect(flowSource).toContain('selectSpread')
    // an opaque dark curtain covers the swap so the main page never flashes through
    expect(flowSource).toContain('miniapp-tarot__fade')
    expect(styles).toContain('.miniapp-tarot__fade')
    expect(styles).toMatch(/\.miniapp-tarot__fade \{[\s\S]*?transition: opacity/)
    expect(styles).toMatch(/\.miniapp-tarot--leaving \.miniapp-tarot__fade \{[\s\S]*?opacity: 1/)
    // the sanctuary background stays clearly visible with a subdued dark veil
    expect(styles).toMatch(/\.miniapp-tarot__background \{[\s\S]*?opacity: \.62/)
    expect(styles).toContain('rgba(9, 5, 17, .8) 64%')
  })

  it('deals the fan in with staggered rise-and-settle motion and a centered column', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const fanStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFanStage.tsx'), 'utf8')

    // fan pose lives in CSS vars so keyframes can reuse it; only the flying card gets an inline --fly-x
    expect(fanStage).not.toContain('rotate(${offset')
    expect(fanStage).toContain('--fly-x')
    expect(styles).toContain('--fx')
    expect(styles).toContain('translateX(var(--fx)) translateY(var(--fy)) rotate(var(--fr))')
    // staggered deal-in: cards rise from the deck position below and settle into the fan
    expect(styles).toContain('@keyframes miniapp-tarot-fan-deal')
    expect(styles).toContain('--deal')
    expect(styles).toContain('animation-delay: var(--deal)')
    // flight arcs straight into the picked slot being filled, no ghost card left in the fan
    expect(styles).toContain('var(--fly-x, 0rpx)')
    // at handoff kill every animation so dropping --flying never restarts fan-deal from the deck
    expect(styles).toMatch(/fan-card--picked \{[\s\S]*?animation: none/)
    expect(styles).toMatch(/fan-card--picked \{[\s\S]*?transition: none/)
    // picked slot pops in with a golden flash
    expect(styles).toContain('@keyframes miniapp-tarot-slot-pop')
    // the spacer pair centers the slot row + fan group in the shared rhythm
    expect(styles).toMatch(/\.miniapp-tarot__fan \{[\s\S]*?margin: -12rpx 0 0/)
  })

  it('fills every card face, flattens after the flip, and keeps label boxes apart', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const cardSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotCard.tsx'), 'utf8')

    // artworks with a baked-in cream frame get a slight zoom so the face bleeds fully
    expect(styles).toMatch(/\.miniapp-tarot-card__art \{[\s\S]*?transform: scale\(1\.07\)/)
    expect(styles).toContain('rotate(180deg) scale(1.07)')
    // once the flip settles the 3D context is dropped for crisp rasterization
    expect(cardSource).toContain('miniapp-tarot-card--settled')
    expect(styles).toMatch(/--settled \.miniapp-tarot-card__body \{[\s\S]*?transform-style: flat/)
    expect(styles).toMatch(/--settled \.miniapp-tarot-card__front \{[\s\S]*?transform: none/)
    // label boxes are narrow enough to stay separated and sit clear of the card
    expect(styles).toMatch(/\.miniapp-tarot-card__labels \{[\s\S]*?top: calc\(100% \+ 24rpx\)/)
    expect(styles).toMatch(/\.miniapp-tarot-card__labels \{[\s\S]*?width: 180rpx/)
    expect(styles).toMatch(/\.miniapp-tarot__reveal-slot \{[\s\S]*?padding: 0 0 120rpx/)
  })

  it('keeps every shuffle animation disabled under reduced motion', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')

    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('animation-duration: .01ms !important')
    expect(styles).toContain('transition-duration: .01ms !important')
  })

  it('gates the tarot flow behind a resource download overlay with progress', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')

    expect(flowSource).toContain('preloadTarotResources')
    expect(flowSource).toContain('resourcesLoaded')
    expect(flowSource).toContain('loadProgress')
    expect(flowSource).toContain('miniapp-tarot__loading')
    expect(styles).toContain('.miniapp-tarot__loading {')
    expect(styles).toContain('.miniapp-tarot__loading_ring')
    expect(styles).toContain('@keyframes tarot-loading-spin')
  })

  it('scales single-card spreads up and wires the result share to friend invitations', () => {
    const styles = fs.readFileSync(stylesPath, 'utf8')
    const readingStage = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotReadingStage.tsx'), 'utf8')
    const flowSource = fs.readFileSync(path.resolve(__dirname, 'MiniappTarotFlow.tsx'), 'utf8')
    const indexSource = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.tsx'), 'utf8')

    // single-card spreads get clearly larger slots and fan cards
    expect(styles).toMatch(/picked-row--1 \.miniapp-tarot__picked-slot \{[\s\S]*?width: 176rpx/)
    expect(styles).toMatch(/picked-row--1 \.miniapp-tarot__picked-slot \{[\s\S]*?height: 276rpx/)
    expect(styles).toMatch(/fan--1 \.miniapp-tarot__fan-card \{[\s\S]*?width: 140rpx/)

    // without a bound friend the result page offers a WeChat share invite
    expect(readingStage).toContain('openType="share"')
    expect(readingStage).toContain('分享塔罗结果 · 邀请好友')
    expect(readingStage).not.toContain('绑定好友后可分享')
    // the flow registers a tarot-flavored share title while the reading shows
    expect(flowSource).toContain('buildTarotShareTitle')
    expect(flowSource).toContain('onShareTitleChange')
    // the page-level share handler prefers the tarot title over the invite path
    expect(indexSource).toContain('tarotShareTitle')
    expect(indexSource).toMatch(/if \(tarotShareTitle\)/)
  })
})
