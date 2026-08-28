import Taro from '@tarojs/taro'
import {
  LaunchAssetError,
  prepareLaunchAssets as prepareLaunchAssetProgress,
  shouldDecodeLaunchImage,
  type LaunchAsset,
} from './launchAssetProgress'

export { LaunchAssetError }
export type { LaunchAsset }

export const loginAssets: LaunchAsset[] = [
  { id: 'xiaoduoli', label: '小多利', src: require('../assets/xiaoduoli.webp') },
]

export const authenticatedLaunchAssets: LaunchAsset[] = [
  ...loginAssets,
  { id: 'room-background', label: '小窝场景', src: require('../assets/room-background.webp') },
  { id: 'tab-bar-background', label: '导航', src: require('../assets/navigation/tab-bar-background.webp') },
  { id: 'nest', label: '导航', src: require('../assets/navigation/nest.webp') },
  { id: 'journal', label: '导航', src: require('../assets/navigation/journal.webp') },
  { id: 'messages', label: '导航', src: require('../assets/navigation/messages.png') },
  { id: 'me', label: '导航', src: require('../assets/navigation/me.webp') },
  { id: 'paw', label: '导航', src: require('../assets/navigation/paw.png') },
]

function loadImage(src: string) {
  if (!shouldDecodeLaunchImage(src)) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    Taro.getImageInfo({
      src,
      success: () => resolve(),
      fail: reject,
    })
  })
}

export function prepareLaunchAssets(
  assets: LaunchAsset[] = authenticatedLaunchAssets,
  onProgress?: (progress: number) => void,
) {
  return prepareLaunchAssetProgress(assets, onProgress, loadImage)
}