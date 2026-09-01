import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp pet scene assets', () => {
  it('bundles the PWA room background within the miniapp image budget', () => {
    const backgroundPath = resolve(miniappRoot(), 'src/assets/room-background-v11.jpg')
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )

    expect(existsSync(backgroundPath)).toBe(true)
    expect(statSync(backgroundPath).size).toBeLessThanOrEqual(180 * 1024)
    expect(componentSource).toContain("require('../assets/room-background-v11.jpg')")
  })

  it('renders the flow portrait with explicit box size instead of widthFix so it never flashes', () => {
    // widthFix 图在兄弟节点 setData 时被微信重测量：开关名片、切回小窝立绘都会闪一下；
    // 立绘主体必须显式宽高（flowHeight 240/366）+ aspectFill
    const portraitSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappOutfitPortrait.tsx'), 'utf8')
    const statusCardSource = readFileSync(resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'), 'utf8')
    const wardrobeSource = readFileSync(resolve(miniappRoot(), 'src/features/main/MiniappWardrobePanel.tsx'), 'utf8')

    expect(portraitSource).toMatch(/outfit-portrait__image--flow" src=\{baseDisplay\} mode="aspectFill"/)
    expect(portraitSource).not.toMatch(/image--flow" src=\{baseDisplay\} mode="widthFix"/)
    expect(portraitSource).toContain('flowHeight')
    expect(statusCardSource).toContain('flowHeight={240}')
    expect(wardrobeSource).toContain('flowHeight={366}')
  })

  it('sleep pose ships via COS static assets and the nest scene wires the sleep act', () => {
    const sleepPosePath = resolve(miniappRoot(), '../public/wardrobe/xiaoduoli-sleep-v1.png')
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )
    const nestViewSource = readFileSync(
      resolve(miniappRoot(), 'src/features/main/MiniappNestView.tsx'),
      'utf8',
    )

    expect(existsSync(sleepPosePath)).toBe(true)
    expect(statSync(sleepPosePath).size).toBeLessThanOrEqual(180 * 1024)
    expect(componentSource).toContain("suitAssets.ensureFile(SLEEP_POSE_FILE)")
    expect(componentSource).toContain('pet-avatar-sleep')
    expect(nestViewSource).toContain('act={petAct.act}')
  })

  it('walk frames and doll ship via COS static assets for the wander/fetch acts', () => {
    const files = ['xiaoduoli-walk-a-v1.png', 'xiaoduoli-walk-b-v1.png', 'xiaoduoli-doll-v1.png']
    for (const fileName of files) {
      const assetPath = resolve(miniappRoot(), `../public/wardrobe/${fileName}`)
      expect(existsSync(assetPath), fileName).toBe(true)
      expect(statSync(assetPath).size, fileName).toBeLessThanOrEqual(180 * 1024)
    }
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )

    expect(componentSource).toContain('WALK_FRAME_A_FILE')
    expect(componentSource).toContain('WALK_FRAME_B_FILE')
    expect(componentSource).toContain('DOLL_FILE')
    expect(componentSource).toContain('pet-move-stage')
    expect(componentSource).toContain('pet-move-doll')
  })
})
