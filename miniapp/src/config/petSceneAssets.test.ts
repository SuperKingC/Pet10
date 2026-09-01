import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

describe('miniapp pet scene assets', () => {
  it('bundles the PWA room background within the miniapp image budget', () => {
    const backgroundPath = resolve(miniappRoot(), 'src/assets/room-background-v5.jpg')
    const componentSource = readFileSync(
      resolve(miniappRoot(), 'src/components/PetStatusCard.tsx'),
      'utf8',
    )

    expect(existsSync(backgroundPath)).toBe(true)
    expect(statSync(backgroundPath).size).toBeLessThanOrEqual(180 * 1024)
    expect(componentSource).toContain("require('../assets/room-background-v5.jpg')")
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
    expect(nestViewSource).toContain('sleeping={petSleeping}')
  })
})
