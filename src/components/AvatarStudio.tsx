import { useMemo, useState } from 'react'
import type { AvatarConfig } from '../domain/types'
import { AvatarLayers } from './AvatarView'

const DEFAULT_CONFIG: AvatarConfig = {
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
  background: '#ffe9c7'
}

const SKINS = ['cream', 'peach', 'wheat', 'cocoa', 'milk']
const SKIN_SWATCH: Record<string, string> = {
  cream: '#ffe3c9', peach: '#ffd4b8', wheat: '#eec39a', cocoa: '#c99b72', milk: '#fff0e2'
}
const FACES = ['round', 'square', 'oval']
const FACE_LABEL: Record<string, string> = { round: '圆脸', square: '方脸', oval: '鹅蛋脸' }
const HAIRS = ['none', 'bob', 'short', 'twin', 'curly']
const HAIR_LABEL: Record<string, string> = { none: '光头', bob: '波波头', short: '短刺头', twin: '双丸子', curly: '卷卷毛' }
const HAIR_COLORS = ['#6b4a2f', '#2e2a28', '#e8b64c', '#c96a4a', '#8f7ad9', '#f28ba0']
const BACKGROUNDS = ['#ffe9c7', '#ffd9e0', '#d9ecff', '#ddf3d9', '#f0e2ff', '#fff3c9']
const EYES = ['round', 'happy', 'sleepy', 'wink', 'star']
const EYE_LABEL: Record<string, string> = { round: '圆眼', happy: '弯弯眼', sleepy: '困困眼', wink: '眨眼', star: '星星眼' }
const MOUTHS = ['smile', 'open', 'cat', 'flat']
const MOUTH_LABEL: Record<string, string> = { smile: '微笑', open: '张嘴', cat: '猫嘴', flat: '抿嘴' }
const GLASSES = [null, 'round', 'square', 'sun']
const GLASS_LABEL: Record<string, string> = { none: '不戴', round: '圆框', square: '方框', sun: '墨镜' }
const BEARDS = [null, 'stubble', 'goat']
const BEARD_LABEL: Record<string, string> = { none: '不留', stubble: '胡茬', goat: '山羊胡' }
const HATS = [null, 'bow', 'cap', 'beanie']
const HAT_LABEL: Record<string, string> = { none: '不戴', bow: '蝴蝶结', cap: '棒球帽', beanie: '毛线帽' }
const NECKS = [null, 'bowtie', 'scarf']
const NECK_LABEL: Record<string, string> = { none: '不戴', bowtie: '领结', scarf: '围巾' }
const HELD = [null, 'flower', 'balloon', 'candy']
const HELD_LABEL: Record<string, string> = { none: '空手', flower: '小花', balloon: '气球', candy: '棒棒糖' }

const PRESETS: Array<{ name: string; config: AvatarConfig }> = [
  { name: '草莓奶油', config: { ...DEFAULT_CONFIG, hair: 'bob', hairColor: '#f28ba0', background: '#ffd9e0', blush: true, neck: 'bowtie' } },
  { name: '薄荷苏打', config: { ...DEFAULT_CONFIG, hair: 'short', hairColor: '#2e2a28', background: '#d9ecff', eyes: 'happy', held: 'balloon' } },
  { name: '香芋软糖', config: { ...DEFAULT_CONFIG, hair: 'twin', hairColor: '#8f7ad9', background: '#f0e2ff', mouth: 'cat', hat: 'bow' } },
  { name: '蜂蜜柠檬', config: { ...DEFAULT_CONFIG, hair: 'curly', hairColor: '#e8b64c', background: '#fff3c9', eyes: 'star', held: 'candy' } },
  { name: '海盐蓝莓', config: { ...DEFAULT_CONFIG, hair: 'bob', hairColor: '#4a5f9e', background: '#d9ecff', glasses: 'round', neck: 'scarf' } },
  { name: '抹茶奶绿', config: { ...DEFAULT_CONFIG, hair: 'short', hairColor: '#6b4a2f', background: '#ddf3d9', eyes: 'sleepy', held: 'flower' } }
]

const CATEGORIES = [
  { id: 'body', label: '身体' },
  { id: 'expression', label: '表情' },
  { id: 'glasses', label: '眼镜' },
  { id: 'beard', label: '胡子' },
  { id: 'hat', label: '帽子' },
  { id: 'neck', label: '颈饰' },
  { id: 'held', label: '手持' }
] as const

type CategoryId = (typeof CATEGORIES)[number]['id']

function randomOf<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function randomConfig(): AvatarConfig {
  return {
    skin: randomOf(SKINS),
    face: randomOf(FACES),
    hair: randomOf(HAIRS),
    hairColor: randomOf(HAIR_COLORS),
    eyes: randomOf(EYES),
    mouth: randomOf(MOUTHS),
    blush: Math.random() > 0.4,
    glasses: randomOf(GLASSES),
    beard: Math.random() > 0.85 ? randomOf(BEARDS.filter((item) => item)) : null,
    hat: randomOf([null, null, 'bow', 'cap', 'beanie']),
    neck: randomOf([null, null, 'bowtie', 'scarf']),
    held: randomOf([null, null, 'flower', 'balloon', 'candy']),
    background: randomOf(BACKGROUNDS)
  }
}

function MiniPreview({ config }: { config: AvatarConfig }) {
  return (
    <svg viewBox="0 0 120 120" width={52} height={52} style={{ borderRadius: '50%', display: 'block' }}>
      <AvatarLayers config={config} />
    </svg>
  )
}

export function AvatarStudio({ initialConfig, onSave, onUploadPhoto, onClose }: {
  initialConfig?: AvatarConfig | null
  onSave: (config: AvatarConfig) => Promise<void> | void
  onUploadPhoto?: () => void
  onClose: () => void
}) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig ?? DEFAULT_CONFIG)
  const [category, setCategory] = useState<CategoryId>('body')
  const [saving, setSaving] = useState(false)
  const previewVariant = useMemo(() => config, [config])

  const patch = (partial: Partial<AvatarConfig>) => setConfig((current) => ({ ...current, ...partial }))

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave(config)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="avatar-studio" role="dialog" aria-label="捏脸工作室">
      <header className="avatar-studio__header">
        <button type="button" className="avatar-studio__close" onClick={onClose}>返回</button>
        <h2>我的形象</h2>
        <button type="button" className="avatar-studio__random" onClick={() => setConfig(randomConfig())}>🎲 随机</button>
      </header>

      <div className="avatar-studio__preview">
        <svg viewBox="0 0 120 120" width={180} height={180} style={{ borderRadius: '50%' }}>
          <AvatarLayers config={previewVariant} />
        </svg>
      </div>

      <div className="avatar-studio__presets">
        {PRESETS.map((preset) => (
          <button key={preset.name} type="button" className="avatar-studio__preset" onClick={() => setConfig({ ...preset.config })}>
            <MiniPreview config={preset.config} />
            <span>{preset.name}</span>
          </button>
        ))}
      </div>

      <nav className="avatar-studio__tabs">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`avatar-studio__tab${category === item.id ? ' avatar-studio__tab--active' : ''}`}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="avatar-studio__options">
        {category === 'body' && (
          <>
            <p className="avatar-studio__group-label">肤色</p>
            <div className="avatar-studio__row">
              {SKINS.map((skin) => (
                <button
                  key={skin}
                  type="button"
                  className={`avatar-studio__swatch${config.skin === skin ? ' avatar-studio__swatch--active' : ''}`}
                  style={{ background: SKIN_SWATCH[skin] }}
                  onClick={() => patch({ skin })}
                  aria-label={`肤色 ${skin}`}
                />
              ))}
            </div>
            <p className="avatar-studio__group-label">脸型</p>
            <div className="avatar-studio__row">
              {FACES.map((face) => (
                <button key={face} type="button" className={`avatar-studio__option${config.face === face ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ face })}>
                  <MiniPreview config={{ ...config, face }} />
                  <span>{FACE_LABEL[face]}</span>
                </button>
              ))}
            </div>
            <p className="avatar-studio__group-label">发型</p>
            <div className="avatar-studio__row">
              {HAIRS.map((hair) => (
                <button key={hair} type="button" className={`avatar-studio__option${config.hair === hair ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ hair })}>
                  <MiniPreview config={{ ...config, hair }} />
                  <span>{HAIR_LABEL[hair]}</span>
                </button>
              ))}
            </div>
            <p className="avatar-studio__group-label">发色</p>
            <div className="avatar-studio__row">
              {HAIR_COLORS.map((hairColor) => (
                <button
                  key={hairColor}
                  type="button"
                  className={`avatar-studio__swatch${config.hairColor === hairColor ? ' avatar-studio__swatch--active' : ''}`}
                  style={{ background: hairColor }}
                  onClick={() => patch({ hairColor })}
                  aria-label={`发色 ${hairColor}`}
                />
              ))}
            </div>
            <p className="avatar-studio__group-label">背景</p>
            <div className="avatar-studio__row">
              {BACKGROUNDS.map((background) => (
                <button
                  key={background}
                  type="button"
                  className={`avatar-studio__swatch${config.background === background ? ' avatar-studio__swatch--active' : ''}`}
                  style={{ background }}
                  onClick={() => patch({ background })}
                  aria-label={`背景 ${background}`}
                />
              ))}
            </div>
          </>
        )}
        {category === 'expression' && (
          <>
            <p className="avatar-studio__group-label">眼睛</p>
            <div className="avatar-studio__row">
              {EYES.map((eyes) => (
                <button key={eyes} type="button" className={`avatar-studio__option${config.eyes === eyes ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ eyes })}>
                  <MiniPreview config={{ ...config, eyes }} />
                  <span>{EYE_LABEL[eyes]}</span>
                </button>
              ))}
            </div>
            <p className="avatar-studio__group-label">嘴巴</p>
            <div className="avatar-studio__row">
              {MOUTHS.map((mouth) => (
                <button key={mouth} type="button" className={`avatar-studio__option${config.mouth === mouth ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ mouth })}>
                  <MiniPreview config={{ ...config, mouth }} />
                  <span>{MOUTH_LABEL[mouth]}</span>
                </button>
              ))}
            </div>
            <p className="avatar-studio__group-label">腮红</p>
            <div className="avatar-studio__row">
              {[true, false].map((blush) => (
                <button key={String(blush)} type="button" className={`avatar-studio__option${config.blush === blush ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ blush })}>
                  <MiniPreview config={{ ...config, blush }} />
                  <span>{blush ? '要腮红' : '不要'}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {category === 'glasses' && (
          <div className="avatar-studio__row">
            {GLASSES.map((glasses) => (
              <button key={glasses ?? 'none'} type="button" className={`avatar-studio__option${config.glasses === glasses ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ glasses })}>
                <MiniPreview config={{ ...config, glasses }} />
                <span>{GLASS_LABEL[glasses ?? 'none']}</span>
              </button>
            ))}
          </div>
        )}
        {category === 'beard' && (
          <div className="avatar-studio__row">
            {BEARDS.map((beard) => (
              <button key={beard ?? 'none'} type="button" className={`avatar-studio__option${config.beard === beard ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ beard })}>
                <MiniPreview config={{ ...config, beard }} />
                <span>{BEARD_LABEL[beard ?? 'none']}</span>
              </button>
            ))}
          </div>
        )}
        {category === 'hat' && (
          <div className="avatar-studio__row">
            {HATS.map((hat) => (
              <button key={hat ?? 'none'} type="button" className={`avatar-studio__option${config.hat === hat ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ hat })}>
                <MiniPreview config={{ ...config, hat }} />
                <span>{HAT_LABEL[hat ?? 'none']}</span>
              </button>
            ))}
          </div>
        )}
        {category === 'neck' && (
          <div className="avatar-studio__row">
            {NECKS.map((neck) => (
              <button key={neck ?? 'none'} type="button" className={`avatar-studio__option${config.neck === neck ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ neck })}>
                <MiniPreview config={{ ...config, neck }} />
                <span>{NECK_LABEL[neck ?? 'none']}</span>
              </button>
            ))}
          </div>
        )}
        {category === 'held' && (
          <div className="avatar-studio__row">
            {HELD.map((held) => (
              <button key={held ?? 'none'} type="button" className={`avatar-studio__option${config.held === held ? ' avatar-studio__option--active' : ''}`} onClick={() => patch({ held })}>
                <MiniPreview config={{ ...config, held }} />
                <span>{HELD_LABEL[held ?? 'none']}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <footer className="avatar-studio__footer">
        {onUploadPhoto && (
          <button type="button" className="avatar-studio__upload" onClick={onUploadPhoto}>上传照片</button>
        )}
        <button type="button" className="avatar-studio__save" onClick={() => void handleSave()} disabled={saving}>
          {saving ? '保存中…' : '保存形象'}
        </button>
      </footer>
    </div>
  )
}
