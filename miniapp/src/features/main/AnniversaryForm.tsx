import { useState } from 'react'
import { Button, Image, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { AnniversaryInput, AnniversaryRepeat } from '../../services/socialApi'
import { compressImageToDataUrl } from '../../services/imageCompression'
import { anniversaryIconKeys, anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import './anniversary.scss'

// 与服务端 socialRoutes anniversaryPhotoSchema 的 300_000 上限一致
const MAX_PHOTO_CHARS = 300_000
// 照片背景卡展示宽度约 650rpx≈390pt@3x，1080px 起档；超限降宽度不降质量
const PHOTO_WIDTHS = [1080, 900, 720]

function photoToDataUrl(src: string): Promise<string> {
  return compressImageToDataUrl(src, {
    widths: PHOTO_WIDTHS,
    maxChars: MAX_PHOTO_CHARS,
    oversizeMessage: '图片太大，请换一张',
  })
}

interface AnniversaryFormProps {
  defaultDay: string
  withDatePicker?: boolean
  initial?: AnniversaryInput
  saving: boolean
  onSubmit(input: AnniversaryInput): void
  onCancel(): void
  onDelete?: () => void
}

export function AnniversaryForm({ defaultDay, withDatePicker, initial, saving, onSubmit, onCancel, onDelete }: AnniversaryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [icon, setIcon] = useState<AnniversaryIconKey>((initial?.icon as AnniversaryIconKey) ?? 'heart')
  const [note, setNote] = useState(initial?.note ?? '')
  const [day, setDay] = useState(initial?.day ?? defaultDay)
  const [repeatRule, setRepeatRule] = useState<AnniversaryRepeat>(initial?.repeatRule ?? 'yearly')
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const pickPhoto = async () => {
    if (photoBusy) return
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      const path = result.tempFiles[0]?.tempFilePath
      if (!path) return
      setPhotoBusy(true)
      setPhoto(await photoToDataUrl(path))
    } catch (error) {
      if (error instanceof Error && error.message) Taro.showToast({ title: error.message, icon: 'none' })
    } finally {
      setPhotoBusy(false)
    }
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed.slice(0, 20), icon, note: note.trim().slice(0, 50), day, repeatRule, photo })
  }

  return (
    <View className="anniv-form">
      <Text className="anniv-form__title">{initial ? '编辑纪念日' : '设置纪念日'}</Text>
      {withDatePicker && (
        <Picker mode="date" value={day} onChange={(event) => setDay(event.detail.value)}>
          <View className="anniv-form__field"><Text className="anniv-form__label">日期</Text><Text className="anniv-form__value">{day}</Text></View>
        </Picker>
      )}
      {!withDatePicker && <View className="anniv-form__field"><Text className="anniv-form__label">日期</Text><Text className="anniv-form__value">{day}</Text></View>}
      <View className="anniv-form__field">
        <Text className="anniv-form__label">名称</Text>
        <Input className="anniv-form__input" value={name} maxlength={20} placeholder="例如：恋爱纪念日" onInput={(event) => setName(event.detail.value)} />
      </View>
      <View className="anniv-form__photo" onClick={() => void pickPhoto()}>
        {photo ? (
          <View className="anniv-form__photo-preview">
            <Image className="anniv-form__photo-img" src={photo} mode="aspectFill" />
            <Text className="anniv-form__photo-hint anniv-form__photo-hint--overlay">点击更换照片</Text>
          </View>
        ) : (
          <View className={`anniv-form__photo-empty${photoBusy ? ' anniv-form__photo-empty--busy' : ''}`}>
            <Text className="anniv-form__photo-plus">＋</Text>
            <Text className="anniv-form__photo-hint">{photoBusy ? '处理中…' : '上传照片作背景（可选）'}</Text>
          </View>
        )}
      </View>
      <View className="anniv-form__icons">
        {anniversaryIconKeys.map((key) => (
          <View key={key} className={`anniv-form__icon-item${icon === key ? ' anniv-form__icon-item--active' : ''}`} onClick={() => setIcon(key)}>
            <Image className="anniv-form__icon-img" src={anniversaryIcons[key]} mode="aspectFit" />
          </View>
        ))}
      </View>
      <View className="anniv-form__field">
        <Text className="anniv-form__label">说明（可选）</Text>
        <Input className="anniv-form__input" value={note} maxlength={50} placeholder="写点什么…" onInput={(event) => setNote(event.detail.value)} />
      </View>
      <View className="anniv-form__repeat">
        <Button className={repeatRule === 'yearly' ? 'anniv-form__repeat-item--active' : 'anniv-form__repeat-item'} onClick={() => setRepeatRule('yearly')}>每年重复</Button>
        <Button className={repeatRule === 'none' ? 'anniv-form__repeat-item--active' : 'anniv-form__repeat-item'} onClick={() => setRepeatRule('none')}>不重复</Button>
      </View>
      <View className="anniv-form__actions">
        <Button className="anniv-form__btn anniv-form__btn--ghost" onClick={onCancel}>取消</Button>
        {onDelete && <Button className="anniv-form__btn anniv-form__btn--danger" disabled={saving} onClick={onDelete}>删除</Button>}
        <Button className="anniv-form__btn anniv-form__btn--primary" disabled={saving || !name.trim()} onClick={submit}>{saving ? '保存中…' : '保存'}</Button>
      </View>
    </View>
  )
}
