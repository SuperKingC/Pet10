import Taro from '@tarojs/taro'

// 与服务端 sessionRoutes / authRoutes 的 avatarUrl 上限保持一致
export const MAX_AVATAR_CHARS = 700_000

/**
 * 把微信返回的头像临时文件转成 dataURL。
 * 已经是 http(s) 或 dataURL 的地址原样返回。
 */
export async function wechatAvatarToDataUrl(src: string): Promise<string> {
  if (src.startsWith('http') || src.startsWith('data:')) return src

  let path = src
  try {
    path = (await Taro.compressImage({ src, quality: 80 })).tempFilePath
  } catch {
    // 压缩失败时用原图，宁可大一点也不要丢头像
  }

  const base64 = Taro.getFileSystemManager().readFileSync(path, 'base64') as string
  const dataUrl = `data:image/jpeg;base64,${base64}`
  if (dataUrl.length > MAX_AVATAR_CHARS) throw new Error('头像太大，请换一张')
  return dataUrl
}
