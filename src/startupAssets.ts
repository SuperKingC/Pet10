import { preloadImage } from './services/imageResourceLoader'

export const APP_SHELL_IMAGE_URLS = [
  '/pet/xiaoduoli.png',
  '/nest/room-background.webp',
  '/navigation/tab-bar-background.png',
  '/navigation/nest.png',
  '/navigation/journal.png',
  '/navigation/paw.png',
  '/navigation/messages.png',
  '/navigation/me.png',
  '/me/birthday.png',
  '/me/notification.png',
  '/me/contact.png',
  '/me/about.png',
  '/me/logout.png',
] as const

export function preloadAppShellImages(loader: (url: string) => void = preloadImage): void {
  for (const url of APP_SHELL_IMAGE_URLS) loader(url)
}
