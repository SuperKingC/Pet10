import Taro from '@tarojs/taro'
import {
  createSuitAssetService,
  WARDROBE_ASSET_STORAGE_KEY,
  type SuitAssetDeps
} from './wardrobeAssetLoader'

// 随包文件：原装立绘 + 三件叠穿服装件（帽/巾/包 v2，网格图标与叠加图层共用）
const defaultPortrait = require('../assets/xiaoduoli.png')
const hatGarment = require('../assets/wardrobe/outfit-hat-v2.png')
const scarfGarment = require('../assets/wardrobe/outfit-scarf-v2.png')
const bagGarment = require('../assets/wardrobe/outfit-bag-v2.png')

const deps: SuitAssetDeps = {
  bundledImages: {
    default: defaultPortrait,
    'outfit-hat-v2.png': hatGarment,
    'outfit-scarf-v2.png': scarfGarment,
    'outfit-bag-v2.png': bagGarment
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
        url: `${TARO_WARDROBE_ASSET_BASE_URL}/${fileName}`,
        success: (result) =>
          result.statusCode === 200
            ? resolve(result.tempFilePath)
            : reject(new Error(`wardrobe_asset_status_${result.statusCode}`)),
        fail: reject
      })
    })
}

export const suitAssets = createSuitAssetService(deps)
