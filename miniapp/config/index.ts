import { defineConfig, type UserConfigExport } from '@tarojs/cli'

const apiBaseUrl = process.env.TARO_API_BASE_URL?.trim() || 'https://api.pet10kk.com'
// 静态资产版本根目录（正式 COS）：塔罗拼 {根}/tarot/...、衣柜套装拼 {根}/wardrobe/...，子路径各功能自持
const assetBaseUrl = process.env.TARO_ASSET_BASE_URL?.trim()
if (!assetBaseUrl) {
  throw new Error(
    'TARO_ASSET_BASE_URL is required, e.g. https://<bucket>.cos.<region>.myqcloud.com/pet10-web/<commitSHA>'
  )
}
// 仅本地开发构建注入（如 http://127.0.0.1:8787，本机 http-server 服务 public/ 模拟 COS）：
// 开发者工具模拟器访问该地址，真机与正式包仍走正式域名；正式构建不设置即完全禁用
const assetDevBaseUrl = process.env.TARO_ASSET_DEV_BASE_URL?.trim() || ''

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
    TARO_ASSET_BASE_URL: JSON.stringify(assetBaseUrl),
    TARO_ASSET_DEV_BASE_URL: JSON.stringify(assetDevBaseUrl),
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
