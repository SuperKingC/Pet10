import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const scripts = [
  'deploy/lib/deploy-common.sh',
  'deploy/update-web.sh',
  'deploy/update-api.sh',
  'deploy/update-all.sh',
  'deploy/verify.sh',
  'deploy/rollback.sh',
]

describe('Lighthouse deployment scripts', () => {
  it('keeps source-only tarot concepts out of Docker builds', async () => {
    const dockerignore = await readFile(resolve(root, '.dockerignore'), 'utf8')
    expect(dockerignore.split(/\r?\n/)).toContain('public/tarot/concepts')
  })

  it('uses safe shell settings and never deletes Docker volumes', async () => {
    for (const path of scripts) {
      const content = await readFile(resolve(root, path), 'utf8')
      expect(content).toContain('set -euo pipefail')
      expect(content).not.toContain('down -v')
      expect(content).not.toContain('docker volume rm')
      expect(content).not.toContain('cat .env.production')
    }
  })

  it('updates frontend and backend independently', async () => {
    const web = await readFile(resolve(root, 'deploy/update-web.sh'), 'utf8')
    const api = await readFile(resolve(root, 'deploy/update-api.sh'), 'utf8')
    expect(web).toContain('compose up -d --no-deps web')
    expect(api).toContain('compose up -d --no-deps api')
  })

  it('records the rollback point before changing containers', async () => {
    for (const path of ['deploy/update-web.sh', 'deploy/update-api.sh', 'deploy/update-all.sh']) {
      const content = await readFile(resolve(root, path), 'utf8')
      expect(content.indexOf('save_deploy_state')).toBeGreaterThan(content.indexOf('prepare_deploy'))
      expect(content.indexOf('save_deploy_state')).toBeLessThan(content.indexOf('compose '))
    }
  })

  it('only rolls back to a revision contained in origin/main', async () => {
    const rollback = await readFile(resolve(root, 'deploy/rollback.sh'), 'utf8')
    expect(rollback).toContain('resolve_target_commit "${1:-$PREVIOUS_COMMIT}"')
    expect(rollback).not.toContain('git cat-file -e')
  })

  it('passes the public tarot asset origin into the frontend build', async () => {
    const dockerfile = await readFile(resolve(root, 'Dockerfile'), 'utf8')
    const compose = await readFile(resolve(root, 'docker-compose.prod.yml'), 'utf8')

    expect(dockerfile).toContain('ARG VITE_TAROT_ASSET_BASE_URL')
    expect(compose).toContain('VITE_TAROT_ASSET_BASE_URL: "${TAROT_ASSET_BASE_URL:-https://pet10-tarot-1300973162.cos.ap-guangzhou.myqcloud.com/pet10-v1}"')
  })

  it('caches immutable assets while revalidating the app shell', async () => {
    const nginx = await readFile(resolve(root, 'deploy/nginx.conf'), 'utf8')

    expect(nginx).toContain('location ^~ /assets/')
    expect(nginx).toContain('Cache-Control "public, max-age=31536000, immutable"')
    expect(nginx).toContain('location ~* ^/(tarot|icons|pet)/')
    expect(nginx).toContain('location = /sw.js')
    expect(nginx).toContain('Cache-Control "no-cache"')
  })
})
