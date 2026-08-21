import Taro from '@tarojs/taro'

let queueTail = Promise.resolve()

export function showInfo(content: string, duration = 1000) {
  const current = queueTail.then(async () => {
    Taro.showToast({
      title: content,
      icon: 'none',
      duration,
    })
    await new Promise<void>((resolve) => {
      setTimeout(resolve, duration)
    })
  })

  queueTail = current.catch(() => undefined)
  return current
}
