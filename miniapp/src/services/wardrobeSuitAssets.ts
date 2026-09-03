import Taro from '@tarojs/taro'
import {
  createSuitAssetService,
  WARDROBE_ASSET_STORAGE_KEY,
  type SuitAssetDeps
} from './wardrobeAssetLoader'
import { resolveAssetBaseUrl } from './assetBaseUrl'

// 随包文件：原装立绘 + 三件叠穿服装件（网格图标 v2 + 围巾折线切前襟叠加层 v2 + 斜挎包 v4）
const defaultPortrait = require('../assets/xiaoduoli.png')
const hatGarment = require('../assets/wardrobe/outfit-hat-v3.png')
const scarfIcon = require('../assets/wardrobe/outfit-scarf-v2.png')
const scarfCut = require('../assets/wardrobe/outfit-scarf-cut-v2.png')
const bagGarment = require('../assets/wardrobe/outfit-bag-v4.png')

const deps: SuitAssetDeps = {
  bundledImages: {
    default: defaultPortrait,
    'outfit-hat-v3.png': hatGarment,
    'outfit-scarf-v2.png': scarfIcon,
    'outfit-scarf-cut-v2.png': scarfCut,
    'outfit-bag-v4.png': bagGarment
  },
  readIndex: () => Taro.getStorageSync(WARDROBE_ASSET_STORAGE_KEY),
  writeIndex: (index) => Taro.setStorageSync(WARDROBE_ASSET_STORAGE_KEY, index),
  userdataPath: () => Taro.env.USER_DATA_PATH,
  fileExists: (path) =>
    new Promise<boolean>((resolve) => {
      Taro.getFileSystemManager().access({
        path,
        success: () => resolve(true),
        fail: () => resolve(false)
      })
    }),
  saveFile: (tempPath, target) =>
    new Promise<void>((resolve, reject) => {
      Taro.getFileSystemManager().saveFile({
        tempFilePath: tempPath,
        filePath: target,
        success: () => resolve(),
        fail: reject
      })
    }),
  download: (fileName) =>
    new Promise<string>((resolve, reject) => {
      Taro.downloadFile({
        // 衣柜套装挂在资产版本根的 /wardrobe 子路径下，路径由衣柜功能自持（与塔罗解耦）
        url: `${resolveAssetBaseUrl()}/wardrobe/${fileName}`,
        success: (result) =>
          result.statusCode === 200
            ? resolve(result.tempFilePath)
            : reject(new Error(`wardrobe_asset_status_${result.statusCode}`)),
        fail: reject
      })
    })
}

export const suitAssets = createSuitAssetService(deps)
