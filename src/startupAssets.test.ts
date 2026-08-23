import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_SHELL_IMAGE_URLS } from './startupAssets'

describe('startup artwork', () => {
  it('uses the unified pet image before the app opens', () => {
    const root = resolve(import.meta.dirname, '..')
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')
    const login = readFileSync(resolve(root, 'src/components/LoginScreen.tsx'), 'utf8')
    const asset = resolve(root, 'public/pet/xiaoduoli.png')

    expect(html).toContain('/pet/xiaoduoli.png')
    expect(main).toContain('/pet/xiaoduoli.png')
    expect(login).toContain('/pet/xiaoduoli.png')
    expect(statSync(asset).size).toBeLessThan(1024 * 1024)
  })

  it('bounds installed-app navigation and session startup waits', () => {
    const root = resolve(import.meta.dirname, '..')
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')

    expect(serviceWorker).toContain('NAVIGATION_TIMEOUT_MS')
    expect(serviceWorker).toContain("request.mode === 'navigate'")
    expect(serviceWorker).toContain("request.destination === 'script'")
    expect(main).toContain('SESSION_STARTUP_TIMEOUT_MS')
    expect(main).toContain('controller.abort()')
  })

  it('preloads chat avatar and bottom navigation artwork before the app opens', () => {
    const root = resolve(import.meta.dirname, '..')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')
    const requiredAssets = [
      '/pet/xiaoduoli.png',
      '/nest/room-background.webp',
      '/navigation/tab-bar-background.png',
      '/navigation/nest.png',
      '/navigation/journal.png',
      '/navigation/paw.png',
      '/navigation/messages.png',
      '/navigation/me.png',
      '/me/birthday.png',
      '/me/notification.png',
      '/me/contact.png',
      '/me/about.png',
      '/me/logout.png'
    ]

    for (const asset of requiredAssets) {
      expect(APP_SHELL_IMAGE_URLS).toContain(asset)
    }
    expect(main).toContain('preloadAppShellImages()')
  })

  it('precaches fixed interface artwork for installed PWA launches', () => {
    const root = resolve(import.meta.dirname, '..')
    const serviceWorker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')
    const requiredAssets = [
      '/pet/xiaoduoli.png',
      '/nest/room-background.webp',
      '/navigation/tab-bar-background.png',
      '/navigation/nest.png',
      '/navigation/journal.png',
      '/navigation/paw.png',
      '/navigation/messages.png',
      '/navigation/me.png',
      '/me/birthday.png',
      '/me/notification.png',
      '/me/contact.png',
      '/me/about.png',
      '/me/logout.png'
    ]

    for (const asset of requiredAssets) {
      expect(serviceWorker).toContain(`'${asset}'`)
    }

    expect(serviceWorker).toContain("const CACHE_NAME = 'xiaoduoli-shell-v11'")
    expect(serviceWorker).toContain("new Request(assetUrl, { cache: 'reload' })")
    expect(serviceWorker).toContain("'/navigation/tab-bar-background.png'")
  })
  it('centralizes shell artwork and prepares it on initial and post-login session paths', () => {
    const root = resolve(import.meta.dirname, '..')
    const main = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')

    expect(APP_SHELL_IMAGE_URLS).toContain('/pet/xiaoduoli.png')
    expect(APP_SHELL_IMAGE_URLS).toContain('/navigation/me.png')
    expect(main).toContain("from './startupAssets'")
    expect(main.match(/preloadAppShellImages\(\)/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
