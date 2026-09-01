import { useCallback, useEffect, useState } from 'react'
import { Image, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { photoWallApi } from '../../services/photoWallApi'
import { compressImageToDataUrl } from '../../services/imageCompression'
import { MiniappOutfitPortrait } from './MiniappOutfitPortrait'
import {
  isAutoCard,
  normalizePhotoCaption,
  originBadge,
  photoDayText,
  splitPhotoColumns,
  type PhotoWallItem
} from '../../domain/photoWallModel'
import './MiniappPhotoWallPanel.scss'

const emptyIllustration = require('../../assets/decor/photo-wall-empty-v1.png')
const lightsString = require('../../assets/decor/photo-wall-lights-v1.png')
const pinDecor = [
  require('../../assets/decor/photo-wall-pin-red-v1.png'),
  require('../../assets/decor/photo-wall-pin-yellow-v1.png'),
  require('../../assets/decor/photo-wall-pin-blue-v1.png')
]
const tapeDecor = [
  require('../../assets/decor/photo-wall-tape-dots-v1.png'),
  require('../../assets/decor/photo-wall-tape-stripes-v1.png'),
  require('../../assets/decor/photo-wall-tape-green-v1.png')
]
const TAPE_VARIANTS = ['dots', 'stripes', 'green'] as const

interface MiniappPhotoWallPanelProps {
  roomId: string
  onClose(): void
}

const PHOTO_WIDTHS = [1080, 900, 720]

// 拍立得软木墙：手动照贴框展示，自动纪念卡（升级/暗号/默契）按模板渲染。
// 照片为 dataURL，previewImage 不支持，大图用自绘覆盖层。
export function MiniappPhotoWallPanel({ roomId, onClose }: MiniappPhotoWallPanelProps) {
  const [photos, setPhotos] = useState<PhotoWallItem[] | null>(null)
  const [composePath, setComposePath] = useState<string | null>(null)
  const [composeCaption, setComposeCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<PhotoWallItem | null>(null)
  const [captionDraft, setCaptionDraft] = useState('')
  const [editingCaption, setEditingCaption] = useState(false)

  const refresh = useCallback(() => {
    if (!roomId) return
    void photoWallApi.list(roomId)
      .then((result) => setPhotos(result.photos))
      .catch(() => setPhotos([]))
  }, [roomId])

  useEffect(() => {
    setPhotos(null)
    refresh()
  }, [refresh])

  const choosePhoto = () => {
    void Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (result) => {
        const path = result.tempFiles[0]?.tempFilePath
        if (path) {
          setComposePath(path)
          setComposeCaption('')
        }
      }
    })
  }

  const upload = async () => {
    if (!roomId || !composePath || uploading) return
    setUploading(true)
    try {
      const dataUrl = await compressImageToDataUrl(composePath, {
        widths: PHOTO_WIDTHS,
        maxChars: 300_000,
        oversizeMessage: '照片太大啦，换一张试试'
      })
      await photoWallApi.create(roomId, { photo: dataUrl, caption: normalizePhotoCaption(composeCaption) })
      Taro.showToast({ title: '贴上墙啦！', icon: 'none' })
      setComposePath(null)
      setComposeCaption('')
      refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message.includes('太大') ? message : '贴墙失败，再试一次', icon: 'none' })
    } finally {
      setUploading(false)
    }
  }

  const openPreview = (item: PhotoWallItem) => {
    setPreview(item)
    setCaptionDraft(item.caption)
    setEditingCaption(false)
  }

  const saveCaption = async () => {
    if (!roomId || !preview) return
    try {
      const caption = normalizePhotoCaption(captionDraft)
      await photoWallApi.updateCaption(roomId, preview.id, caption)
      setPreview({ ...preview, caption })
      setEditingCaption(false)
      refresh()
    } catch {
      Taro.showToast({ title: '没改成功，再试试', icon: 'none' })
    }
  }

  const removePhoto = (item: PhotoWallItem) => {
    void Taro.showModal({
      title: '撕下这张照片？',
      content: '从照片墙上撤下就找不回来啦',
      confirmText: '撕下',
      cancelText: '留着',
      success: (result) => {
        if (!result.confirm || !roomId) return
        void photoWallApi.remove(roomId, item.id)
          .then(() => {
            setPreview(null)
            refresh()
          })
          .catch(() => Taro.showToast({ title: '没撕下来，再试试', icon: 'none' }))
      }
    })
  }

  const columns = splitPhotoColumns(photos ?? [])

  const renderCard = (item: PhotoWallItem, index: number) => {
    const badge = originBadge(item.origin)
    const showMatchSuit = item.origin === 'match_outfit' && Boolean(item.refKey)
    return (
      <View
        className={`photo-wall-card${index % 2 === 0 ? ' photo-wall-card--tilt-left' : ' photo-wall-card--tilt-right'}`}
        key={item.id}
        style={{ animationDelay: `${Math.min(index * 80, 480)}ms` }}
        hoverClass="photo-wall-card--press"
        hoverStayTime={120}
        onClick={() => openPreview(item)}
      >
        {index % 2 === 0 ? (
          <Image className="photo-wall-card__pin" src={pinDecor[index % 3]} />
        ) : (
          <Image
            className={`photo-wall-card__tape photo-wall-card__tape--${TAPE_VARIANTS[index % 3]}`}
            src={tapeDecor[index % 3]}
          />
        )}
        {badge && <Text className="photo-wall-card__badge">{badge}</Text>}
        {isAutoCard(item) ? (
          <View className="photo-wall-card__template">
            {showMatchSuit && (
              <View className="photo-wall-card__template-suit">
                <MiniappOutfitPortrait suitKey={item.refKey} />
              </View>
            )}
            <Text className="photo-wall-card__template-emoji">
              {item.origin === 'levelup' ? '🎉' : item.origin === 'codeword_streak' ? '🔑' : item.origin === 'anniversary' ? '📅' : '💕'}
            </Text>
          </View>
        ) : (
          <Image className="photo-wall-card__photo" src={item.photo} mode="aspectFill" />
        )}
        {item.caption && <Text className="photo-wall-card__caption">{item.caption}</Text>}
        <Text className="photo-wall-card__date">{photoDayText(item.takenDay ?? item.createdAt)}</Text>
      </View>
    )
  }

  return (
    <View className="photo-wall-panel">
      <View className="photo-wall-panel__top">
        <MiniappBackButton onClick={onClose} />
        <Text className="photo-wall-panel__title">照片墙</Text>
        <View hoverClass="photo-wall-panel__upload--press" hoverStayTime={120} className="photo-wall-panel__upload" onClick={choosePhoto}>
          <Text>＋ 贴照片</Text>
        </View>
      </View>
      <View className="photo-wall-panel__sub">
        <Text className="photo-wall-panel__caption">你们的共同回忆贴在软木墙上，双方都能贴、能改、能撕。</Text>
        {photos !== null && photos.length > 0 && (
          <View className="photo-wall-panel__count-chip">
            <Text>{photos.length} 张回忆</Text>
          </View>
        )}
      </View>
      <View className="photo-wall-lights">
        <Image className="photo-wall-lights__string" src={lightsString} mode="widthFix" />
      </View>

      {composePath && (
        <View className="photo-wall-compose">
          <Image className="photo-wall-compose__thumb" src={composePath} mode="aspectFill" />
          <View className="photo-wall-compose__body">
            <Input
              className="photo-wall-compose__input"
              value={composeCaption}
              maxlength={40}
              placeholder="写点说明（可留空）"
              placeholderClass="photo-wall-compose__placeholder"
              onInput={(event) => setComposeCaption(event.detail.value)}
            />
            <View className="photo-wall-compose__actions">
              <View className="photo-wall-compose__cancel" onClick={() => setComposePath(null)}><Text>重选</Text></View>
              <View
                className={`photo-wall-compose__submit${uploading ? ' photo-wall-compose__submit--busy' : ''}`}
                onClick={() => void upload()}
              >
                <Text>{uploading ? '贴墙中…' : '贴上墙'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <View className="photo-wall-grid">
        {photos === null && <View className="photo-wall-grid__skeleton" />}
        {photos !== null && photos.length === 0 && (
          <View className="photo-wall-grid__empty">
            <Image className="photo-wall-grid__empty-art" src={emptyIllustration} mode="aspectFit" />
            <Text className="photo-wall-grid__empty-title">墙还空着</Text>
            <Text className="photo-wall-grid__empty-copy">贴上第一张合照，或等小多利的升级纪念卡、你们的默契穿搭卡自动上墙。</Text>
          </View>
        )}
        {photos !== null && photos.length > 0 && columns.map((column, columnIndex) => (
          <View className="photo-wall-grid__column" key={columnIndex}>
            {column.map((item, itemIndex) => renderCard(item, itemIndex + columnIndex))}
          </View>
        ))}
      </View>

      {preview && (
        <View className="photo-wall-preview" onClick={() => setPreview(null)}>
          <View className="photo-wall-preview__body" onClick={(event) => event.stopPropagation()}>
            {isAutoCard(preview) ? (
              <View className="photo-wall-preview__template">
                <Text className="photo-wall-preview__template-emoji">
                  {preview.origin === 'levelup' ? '🎉' : preview.origin === 'codeword_streak' ? '🔑' : '💕'}
                </Text>
                {preview.origin === 'match_outfit' && preview.refKey && (
                  <View className="photo-wall-preview__template-suit">
                    <MiniappOutfitPortrait suitKey={preview.refKey} />
                  </View>
                )}
              </View>
            ) : (
              <Image className="photo-wall-preview__photo" src={preview.photo} mode="aspectFit" />
            )}
            {editingCaption ? (
              <View className="photo-wall-preview__edit">
                <Input
                  className="photo-wall-preview__input"
                  value={captionDraft}
                  maxlength={40}
                  placeholder="写点说明"
                  onInput={(event) => setCaptionDraft(event.detail.value)}
                />
                <View className="photo-wall-preview__edit-save" onClick={() => void saveCaption()}><Text>保存</Text></View>
              </View>
            ) : (
              <Text className="photo-wall-preview__caption" onClick={() => setEditingCaption(true)}>
                {preview.caption || '点这里写句说明…'}
              </Text>
            )}
            <Text className="photo-wall-preview__meta">
              {originBadge(preview.origin) || '📷 手动'}{preview.userName ? ` · ${preview.userName}` : ''} · {photoDayText(preview.takenDay ?? preview.createdAt)}
            </Text>
            <View className="photo-wall-preview__actions">
              <View className="photo-wall-preview__action" onClick={() => setEditingCaption(true)}><Text>改说明</Text></View>
              <View className="photo-wall-preview__action photo-wall-preview__action--danger" onClick={() => removePhoto(preview)}><Text>撕下</Text></View>
              <View className="photo-wall-preview__action" onClick={() => setPreview(null)}><Text>关闭</Text></View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
