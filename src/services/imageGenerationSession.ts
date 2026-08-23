const IMAGE_INVITE_STORAGE_KEY = 'pet10_image_invite'

export interface ImageGenerationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function readStoredImageInvite(storage: ImageGenerationStorage = sessionStorage): string {
  return storage.getItem(IMAGE_INVITE_STORAGE_KEY) ?? ''
}

export function storeImageInvite(invite: string, storage: ImageGenerationStorage = sessionStorage): void {
  storage.setItem(IMAGE_INVITE_STORAGE_KEY, invite.trim())
}
