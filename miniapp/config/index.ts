import { defineConfig, type UserConfigExport } from '@tarojs/cli'

const apiBaseUrl = process.env.TARO_API_BASE_URL?.trim() || 'https://api.pet10kk.com'
const tarotAssetBaseUrl = process.env.TARO_TAROT_ASSET_BASE_URL?.trim() || 'https://pet10kk.com'

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
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
  },
})

export default config
