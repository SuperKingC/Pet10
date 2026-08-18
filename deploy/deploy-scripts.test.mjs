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

  it('keeps production tarot URLs on the versioned static delivery path', async () => {
    const dockerfile = await readFile(resolve(root, 'Dockerfile'), 'utf8')
    const compose = await readFile(resolve(root, 'docker-compose.prod.yml'), 'utf8')

    expect(dockerfile).toContain('ARG VITE_TAROT_ASSET_BASE_URL')
    expect(compose).toContain('VITE_TAROT_ASSET_BASE_URL: ""')
  })

  it('caches immutable assets while revalidating the app shell', async () => {
    const nginx = await readFile(resolve(root, 'deploy/nginx.conf'), 'utf8')

    expect(nginx).toContain('location ^~ /assets/')
    expect(nginx).toContain('Cache-Control "public, max-age=31536000, immutable"')
    expect(nginx).toContain('location ~* ^/(tarot|icons|pet)/')
    expect(nginx).toContain('location = /sw.js')
    expect(nginx).toContain('Cache-Control "no-cache"')
  })

  it('redirects only production runtime assets to the versioned COS origin', async () => {
    const caddy = await readFile(resolve(root, 'deploy/Caddyfile'), 'utf8')

    expect(caddy).toContain('@static_assets {')
    expect(caddy).toContain('path /assets/* /pet/* /icons/* /navigation/* /me/* /tarot/cards/* /tarot/ui/*')
    expect(caddy).toContain('expression `"{$STATIC_ASSET_BASE_URL}" != "" && "{$STATIC_ASSET_VERSION}" != ""`')
    expect(caddy).toContain('redir @static_assets {$STATIC_ASSET_BASE_URL}/{$STATIC_ASSET_VERSION}{uri} 302')
    expect(caddy).not.toContain('/tarot/concepts/*')
    expect(caddy).not.toContain('/api/*')
    expect(caddy).not.toContain('/socket.io/*')
  })

  it('passes the deployed commit version into Caddy for web changes and rollbacks', async () => {
    const compose = await readFile(resolve(root, 'docker-compose.prod.yml'), 'utf8')
    const common = await readFile(resolve(root, 'deploy/lib/deploy-common.sh'), 'utf8')
    const web = await readFile(resolve(root, 'deploy/update-web.sh'), 'utf8')
    const all = await readFile(resolve(root, 'deploy/update-all.sh'), 'utf8')
    const rollback = await readFile(resolve(root, 'deploy/rollback.sh'), 'utf8')

    expect(compose).toContain('STATIC_ASSET_BASE_URL: "${STATIC_ASSET_BASE_URL}"')
    expect(compose).toContain('STATIC_ASSET_VERSION: "${STATIC_ASSET_VERSION}"')
    expect(common).toContain('STATIC_ASSET_VERSION="$TARGET_COMMIT"')
    expect(web).toContain('restart_static_delivery')
    expect(all).toContain('restart_static_delivery')
    expect(rollback).toContain('STATIC_ASSET_VERSION="$ROLLBACK_COMMIT"')
    expect(rollback).toContain('restart_static_delivery')
  })

  it('builds and uploads the approved web revision before remote deployment', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/deploy-production.yml'), 'utf8')

    expect(workflow).toContain('ref: ${{ needs.validate.outputs.sha }}')
    expect(workflow).toContain("if: ${{ inputs.service != 'api' }}")
    expect(workflow).toContain('npm run build')
    expect(workflow).toContain('run: npm run upload:static')
    expect(workflow).toContain('COS_SECRET_ID: ${{ secrets.COS_SECRET_ID }}')
    expect(workflow).toContain([
      '      - name: Upload static assets to COS',
      "        if: ${{ inputs.service != 'api' }}",
      '        env:',
      '          COS_SECRET_ID: ${{ secrets.COS_SECRET_ID }}',
      '          COS_SECRET_KEY: ${{ secrets.COS_SECRET_KEY }}',
      '          COS_BUCKET: ${{ secrets.COS_BUCKET }}',
      '          COS_REGION: ${{ secrets.COS_REGION }}',
      '          STATIC_ASSET_BASE_URL: ${{ secrets.STATIC_ASSET_BASE_URL }}',
      '          STATIC_ASSET_VERSION: ${{ needs.validate.outputs.sha }}'
    ].join('\n'))
    expect(workflow).toContain('STATIC_ASSET_VERSION: ${{ needs.validate.outputs.sha }}')
    expect(workflow).toContain('Verify public COS asset')
    expect(workflow).toContain('$STATIC_ASSET_BASE_URL/$STATIC_ASSET_VERSION/pet/xiaoduoli.png')
    expect(workflow.indexOf('run: npm run upload:static')).toBeLessThan(workflow.indexOf('name: Configure SSH'))
    expect(workflow.indexOf('Verify public COS asset')).toBeLessThan(workflow.indexOf('name: Configure SSH'))
  })

  it('passes the public static origin to the remote deployment without exposing COS credentials', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/deploy-production.yml'), 'utf8')

    expect(workflow).toContain('STATIC_ASSET_BASE_URL: ${{ secrets.STATIC_ASSET_BASE_URL }}')
    expect(workflow).toContain('STATIC_ASSET_BASE_URL=%q DEPLOY_PUBLIC_URL=%q')
    expect(workflow).not.toContain('COS_SECRET_KEY=%q')
    expect(workflow).not.toContain('COS_SECRET_ID=%q')
  })

  it('preserves the public static origin for rollback without storing COS credentials', async () => {
    const common = await readFile(resolve(root, 'deploy/lib/deploy-common.sh'), 'utf8')

    expect(common).toContain('STATIC_ASSET_BASE_URL=$STATIC_ASSET_BASE_URL')
    expect(common).toContain("Rollback: STATIC_ASSET_BASE_URL='$STATIC_ASSET_BASE_URL'")
    expect(common).not.toContain('COS_SECRET_ID=')
    expect(common).not.toContain('COS_SECRET_KEY=')
  })

  it('persists the verified COS origin and commit version for future container restarts', async () => {
    const common = await readFile(resolve(root, 'deploy/lib/deploy-common.sh'), 'utf8')
    const web = await readFile(resolve(root, 'deploy/update-web.sh'), 'utf8')
    const all = await readFile(resolve(root, 'deploy/update-all.sh'), 'utf8')
    const api = await readFile(resolve(root, 'deploy/update-api.sh'), 'utf8')
    const rollback = await readFile(resolve(root, 'deploy/rollback.sh'), 'utf8')

    expect(common).toContain('persist_static_asset_config()')
    expect(common).toContain('/^STATIC_ASSET_BASE_URL=/')
    expect(common).toContain('/^STATIC_ASSET_VERSION=/')
    expect(common).toContain('mv "$temporary_file" "$ENV_FILE"')

    for (const content of [web, all]) {
      expect(content.indexOf('persist_static_asset_config')).toBeGreaterThan(content.indexOf('verify_static_asset_redirect'))
      expect(content.indexOf('persist_static_asset_config')).toBeLessThan(content.indexOf('print_success'))
    }

    expect(rollback.indexOf('persist_static_asset_config')).toBeGreaterThan(rollback.indexOf('verify_static_asset_redirect'))
    expect(api).not.toContain('persist_static_asset_config')
  })

  it('validates static delivery configuration before changing web deployment state', async () => {
    for (const path of ['deploy/update-web.sh', 'deploy/update-all.sh']) {
      const content = await readFile(resolve(root, path), 'utf8')
      expect(content.indexOf('assert_static_asset_config')).toBeGreaterThan(content.indexOf('prepare_deploy'))
      expect(content.indexOf('assert_static_asset_config')).toBeLessThan(content.indexOf('save_deploy_state'))
      expect(content.indexOf('assert_static_asset_config')).toBeLessThan(content.indexOf('compose '))
    }
  })
})
