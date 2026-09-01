// 一键把 miniapp/dist 的最新构建推送到已登录微信开发者工具的手机上（自动预览）。
// 等价于开发者工具「预览 → 自动预览」，机器人或本地开发者可直接调用：
//   node scripts/miniapp-preview-local.mjs            # 跳过构建，假定 dist 已最新
//   node scripts/miniapp-preview-local.mjs --build    # 先清缓存并重新构建再预览
// 预览推送依赖：微信开发者工具已安装且微信已登录；IDE HTTP 服务端口已在
// 「设置 → 安全设置」开启。静态资产地址通过 TARO_ASSET_BASE_URL 提供；本地开发可另设
// TARO_ASSET_DEV_BASE_URL（如 http://127.0.0.1:8787），开发者工具模拟器走本机地址，真机走正式域名。
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

export function resolveWechatCliPath(platform = process.platform, env = process.env) {
  if (platform !== 'win32') return null
  const candidates = [
    env.WECHAT_DEVTOOLS_CLI,
    'D:\\Tencent\\微信web开发者工具\\cli.bat',
    'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p)) ?? null
}

export function buildPreviewPlan({
  projectRoot = process.cwd(),
  build = false,
  platform = process.platform,
  env = process.env,
} = {}) {
  const repoRoot = resolve(projectRoot)
  const miniappRoot = resolve(repoRoot, 'miniapp')
  const distRoot = resolve(miniappRoot, 'dist')
  const cliPath = resolveWechatCliPath(platform, env)
  const steps = []

  if (build) {
    steps.push({
      name: 'clean-dist',
      run() {
        rmSync(distRoot, { recursive: true, force: true })
        return { ok: true }
      },
    })
    steps.push({
      name: 'build',
      run() {
        const result = spawnSync('npm', ['run', 'build:weapp'], {
          cwd: miniappRoot,
          env,
          shell: platform === 'win32',
          encoding: 'utf8',
        })
        return result.status === 0
          ? { ok: true }
          : { ok: false, reason: `build:weapp 失败（exit ${result.status}）`, detail: result.stderr || result.stdout }
      },
    })
  }

  steps.push({
    name: 'check-dist',
    run() {
      return existsSync(resolve(distRoot, 'app.json'))
        ? { ok: true }
        : { ok: false, reason: 'miniapp/dist/app.json 不存在，请先构建（--build 或 npm run build:weapp）' }
    },
  })

  steps.push({
    name: 'auto-preview',
    run() {
      if (!cliPath) {
        return { ok: false, reason: '未找到微信开发者工具 CLI（可用 WECHAT_DEVTOOLS_CLI 指定 cli.bat 路径）' }
      }
      const infoOutput = resolve(repoRoot, 'tmp', `auto-preview-info-${Date.now()}.json`)
      const args = ['auto-preview', '--project', miniappRoot, '--info-output', infoOutput]
      const result = spawnSync(cliPath, args, { cwd: repoRoot, env, shell: platform === 'win32', encoding: 'utf8' })
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
      if (result.status === 0 && !/login\s*:false|需要登录/.test(output)) {
        return { ok: true, infoOutput }
      }
      const reason = /login\s*:false|需要登录|not\s*login/i.test(output)
        ? '微信开发者工具未登录，请打开工具完成微信扫码登录'
        : output.trim().split('\n').slice(-5).join('\n') || `auto-preview 失败（exit ${result.status}）`
      return { ok: false, reason }
    },
  })

  return { cliPath, distRoot, steps }
}

export async function runMiniappPreviewLocal(options = {}) {
  const plan = buildPreviewPlan(options)
  const results = []
  for (const step of plan.steps) {
    const result = step.run()
    results.push({ name: step.name, ...result })
    if (!result.ok) return { ok: false, failedAt: step.name, results, cliPath: plan.cliPath }
  }
  return { ok: true, results, cliPath: plan.cliPath }
}

function parseArgs(argv) {
  return { build: argv.includes('--build') }
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename ?? '')
if (isDirectRun) {
  const { build } = parseArgs(process.argv.slice(2))
  const outcome = await runMiniappPreviewLocal({ build })
  console.log(outcome.ok ? '✔ 已推送到手机（自动预览）' : `✘ 预览失败于 ${outcome.failedAt}: ${outcome.results.at(-1)?.reason ?? ''}`)
  process.exitCode = outcome.ok ? 0 : 1
}
