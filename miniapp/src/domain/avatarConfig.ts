export interface MiniappAvatarConfig {
  skin: string
  face: string
  hair: string
  hairColor: string
  eyes: string
  mouth: string
  blush: boolean
  glasses: string | null
  beard: string | null
  hat: string | null
  neck: string | null
  held: string | null
  background: string
}

export const defaultAvatarConfig: MiniappAvatarConfig = {
  skin: 'cream',
  face: 'round',
  hair: 'bob',
  hairColor: '#6b4a2f',
  eyes: 'round',
  mouth: 'smile',
  blush: true,
  glasses: null,
  beard: null,
  hat: null,
  neck: null,
  held: null,
  background: '#ffe9c7',
}

export function parseAvatarConfig(raw?: string | null): MiniappAvatarConfig {
  if (!raw) return defaultAvatarConfig
  try {
    return { ...defaultAvatarConfig, ...JSON.parse(raw) }
  } catch {
    return defaultAvatarConfig
  }
}
