import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const scripts = [
  'deploy/lib/deploy-common.sh',
  'deploy/update-api.sh',
  'deploy/update-all.sh',
  'deploy/verify.sh',
  'deploy/rollback.sh',
]

describe('Lighthouse deployment scripts', () => {
  it('uses safe shell settings and never deletes Docker volumes', async () => {
    for (const path of scripts) {
      const content = await readFile(resolve(root, path), 'utf8')
      expect(content).toContain('set -euo pipefail')
      expect(content).not.toContain('down -v')
      expect(content).not.toContain('docker volume rm')
      expect(content).not.toContain('cat .env.production')
    }
  })

  it('updates the api service without touching other containers', async () => {
    const api = await readFile(resolve(root, 'deploy/update-api.sh'), 'utf8')
    expect(api).toContain('compose up -d --no-deps api')
  })

  it('records the rollback point before changing containers', async () => {
    for (const path of ['deploy/update-api.sh', 'deploy/update-all.sh']) {
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

  it('routes the API domain directly to the api service', async () => {
    const caddy = await readFile(resolve(root, 'deploy/Caddyfile'), 'utf8')
    expect(caddy).toContain('api.pet10kk.com {')
    expect(caddy).toContain('reverse_proxy api:8787')
    expect(caddy).not.toContain('pet10kk.com api.pet10kk.com')
    expect(caddy).not.toContain('redir')
  })

  it('has no web service in the production compose file', async () => {
    const compose = await readFile(resolve(root, 'docker-compose.prod.yml'), 'utf8')
    expect(compose).not.toMatch(/^\s{2}web:/m)
    expect(compose).not.toContain('STATIC_ASSET_BASE_URL')
    expect(compose).toContain('api:')
    expect(compose).toContain('caddy:')
  })

  it('keeps static asset versioning out of the server deployment state', async () => {
    const common = await readFile(resolve(root, 'deploy/lib/deploy-common.sh'), 'utf8')
    expect(common).not.toContain('STATIC_ASSET_BASE_URL')
    expect(common).not.toContain('STATIC_ASSET_VERSION')
    expect(common).not.toContain('COS_SECRET_ID=')
    expect(common).not.toContain('COS_SECRET_KEY=')
    expect(common).toContain('wait_for_url "$base/health"')
  })
})
