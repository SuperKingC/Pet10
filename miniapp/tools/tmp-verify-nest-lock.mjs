// 临时验证脚本：小窝锁定/空状态信件场景应渲染进 .nest-lock-layer 固定层，
// 且页面主容器高度不再超过窗口高度（真机/模拟器均不可整页滚动）。
import fs from 'node:fs'
import automator from 'miniprogram-automator'

const ws = process.argv[2] || 'ws://localhost:9420'
const mini = await automator.connect({ wsEndpoint: ws })

try {
  await mini.reLaunch('/pages/index/index')
  await new Promise((resolve) => setTimeout(resolve, 6000))

  const page = await mini.currentPage()
  if (!page || !page.path.includes('pages/index/index')) {
    throw new Error(`unexpected page: ${page && page.path}`)
  }

  const sys = await mini.systemInfo()
  const lockLayer = await page.$('.nest-lock-layer')
  const letter = await page.$('.nest-letter')
  const petCard = await page.$('.pet-status-card')
  const loading = await page.$('.miniapp-nest__loading')
  const home = await page.$('.home-page')
  const homeSize = home ? await home.size() : null
  const lockSize = lockLayer ? await lockLayer.size() : null

  const mode = lockLayer
    ? 'locked/empty (lock layer)'
    : petCard
      ? 'active (flow)'
      : loading
        ? 'loading (flow)'
        : 'unknown'

  const report = {
    windowWidth: sys.windowWidth,
    windowHeight: sys.windowHeight,
    mode,
    lockLayerPresent: Boolean(lockLayer),
    lockLayerSize: lockSize,
    letterPresent: Boolean(letter),
    letterInsideLockLayer: Boolean(lockLayer && letter),
    homePageSize: homeSize,
    pageOverflowPx: homeSize ? Number((homeSize.height - sys.windowHeight).toFixed(1)) : null,
  }

  fs.writeFileSync('tools/tmp-nest-lock-verify.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))

  const shot = process.argv[3]
  if (shot) await mini.screenshot(shot)
} finally {
  await mini.disconnect()
}
