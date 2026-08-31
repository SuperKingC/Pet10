import { defineConfig, type UserConfigExport } from '@tarojs/cli'

const apiBaseUrl = process.env.TARO_API_BASE_URL?.trim() || 'https://api.pet10kk.com'
const tarotAssetBaseUrl = process.env.TARO_TAROT_ASSET_BASE_URL?.trim()
if (!tarotAssetBaseUrl) {
  throw new Error(
    'TARO_TAROT_ASSET_BASE_URL is required, e.g. https://<bucket>.cos.<region>.myqcloud.com/pet10-web/<commitSHA>'
  )
}
// 衣柜套装按需下载目录：默认挂在塔罗静态资源同版本目录下（public/wardrobe 随 upload:static 发布）
const wardrobeAssetBaseUrl =
  process.env.TARO_WARDROBE_ASSET_BASE_URL?.trim() || `${tarotAssetBaseUrl.replace(/\/$/, '')}/wardrobe`

const config: UserConfigExport = defineConfig({
  projectName: 'pet10-miniapp',
  date: '2026-08-18',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  defineConstants: {
    TARO_API_BASE_URL: JSON.stringify(apiBaseUrl),
    TARO_TAROT_ASSET_BASE_URL: JSON.stringify(tarotAssetBaseUrl),
    TARO_WARDROBE_ASSET_BASE_URL: JSON.stringify(wardrobeAssetBaseUrl),
  },
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
      cssModules: {
        enable: false,
      },
    },
    webpackChain(chain) {
      chain.output.publicPath('/')
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
  },
})

export default config
