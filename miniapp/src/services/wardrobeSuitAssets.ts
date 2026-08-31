import Taro from '@tarojs/taro'
import {
  createSuitAssetService,
  WARDROBE_ASSET_STORAGE_KEY,
  type SuitAssetDeps
} from './wardrobeAssetLoader'

// 随包套装：原装小多利 + 围巾（包体红线内只内置这两张，其余走 COS 按需下载）
const defaultPortrait = require('../assets/xiaoduoli.png')
const scarfSuit = require('../assets/wardrobe/scarf-v1.png')

const deps: SuitAssetDeps = {
  bundledImages: { default: defaultPortrait, scarf: scarfSuit },
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
  download: (url) =>
    new Promise<string>((resolve, reject) => {
      Taro.downloadFile({
        url: `${TARO_WARDROBE_ASSET_BASE_URL}/${url}`,
        success: (result) =>
          result.statusCode === 200
            ? resolve(result.tempFilePath)
            : reject(new Error(`wardrobe_asset_status_${result.statusCode}`)),
        fail: reject
      })
    })
}

export const suitAssets = createSuitAssetService(deps)
