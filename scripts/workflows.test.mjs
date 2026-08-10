import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('GitHub workflows', () => {
  it('runs complete CI checks without production secrets', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/ci.yml'), 'utf8')
    expect(workflow).toContain('npm run test:all')
    expect(workflow).toContain('npm run build:all')
    expect(workflow).toContain('npm run check:architecture')
    expect(workflow).toContain('npm run check:docs')
    expect(workflow).toContain('npm run check:assets')
    expect(workflow).not.toContain('DEPLOY_SSH_PRIVATE_KEY')
  })

  it('requires the production environment and calls fixed deploy scripts', async () => {
    const workflow = await readFile(resolve(root, '.github/workflows/deploy-production.yml'), 'utf8')
    expect(workflow).toContain('name: production')
    expect(workflow).not.toContain('url: ${{ secrets.')
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).toContain('fetch-depth: 0')
    expect(workflow).toContain('git merge-base --is-ancestor "$REVISION" origin/main')
    expect(workflow).toContain('DEPLOY_SSH_KNOWN_HOSTS')
    expect(workflow).not.toContain('ssh-keyscan')
    expect(workflow).toContain("printf -v remote_command")
    expect(workflow).toContain("./deploy/update-%q.sh")
    expect(workflow).toContain('ssh -p "${DEPLOY_PORT:-22}" "$DEPLOY_USER@$DEPLOY_HOST" "$remote_command"')
    expect(workflow).not.toContain("cd '$DEPLOY_PATH'")
    expect(workflow).not.toContain('docker compose down -v')
  })
})
