import { useState } from 'react'
import { Button, Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { diaryApi, type MiniappDiary } from '../../services/diaryApi'
import { compressImageToDataUrl } from '../../services/imageCompression'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import {
  JOURNAL_MOODS,
  JOURNAL_WEATHERS,
  journalDateLabel,
  journalMoodDisplay,
  parseJournalMoodTitle,
} from './journalModel'
import './JournalEditorForm.scss'

const polaroidRun = require('../../assets/journal/polaroid-run-v2.png')
const editorYard = require('../../assets/journal/editor-yard.jpg')

const moodImages: Record<string, string> = {
  happy: require('../../assets/moods/mood-3-v6.png'),
  calm: require('../../assets/moods/mood-2-v6.png'),
  sad: require('../../assets/moods/mood-1-v6.png'),
  excited: require('../../assets/moods/mood-4-v6.png'),
}

const MAX_PHOTOS = 3
// 与服务端 diaryRoutes photoSchema 的 300_000 上限一致
const MAX_PHOTO_CHARS = 300_000
// 拍立得展示宽度约 390pt@3x≈1170px，1080px 起档；超限时降宽度而不是降质量
const PHOTO_WIDTHS = [1080, 900, 720]

function photoToDataUrl(src: string): Promise<string> {
  return compressImageToDataUrl(src, {
    widths: PHOTO_WIDTHS,
    maxChars: MAX_PHOTO_CHARS,
    oversizeMessage: '图片太大，请换一张或减少照片',
  })
}

async function pickSheetIndex(labels: string[]): Promise<number> {
  try {
    const result = await Taro.showActionSheet({ itemList: labels })
    return result.tapIndex
  } catch {
    return -1
  }
}

interface JournalEditorFormProps {
  day: string
  edit?: MiniappDiary
  photo?: string
  onClose(): void
  onSaved(): void
}

export function JournalEditorForm({ day, edit, photo, onClose, onSaved }: JournalEditorFormProps) {
  const parsedMood = parseJournalMoodTitle(edit?.title ?? '')
  const [title, setTitle] = useState(edit?.title ?? '')
  const [body, setBody] = useState(edit?.body ?? '')
  const [location, setLocation] = useState(edit?.location ?? '')
  const [moodId, setMoodId] = useState(parsedMood.moodId)
  const [weatherId, setWeatherId] = useState(parsedMood.weatherId)
  const [locationOpen, setLocationOpen] = useState(Boolean(edit?.location))
  const [photos, setPhotos] = useState<string[]>(() => {
    if (photo) return [photo, ...(edit?.photos ?? []).filter((item) => item !== photo)].slice(0, MAX_PHOTOS)
    return edit?.photos ?? []
  })
  const [saving, setSaving] = useState(false)
  const hasUserPhoto = photos.length > 0
  const editId = edit?.id ?? ''
  const moodLine = journalMoodDisplay(moodId, weatherId)
  const weather = JOURNAL_WEATHERS.find((item) => item.id === weatherId) ?? JOURNAL_WEATHERS[0]

  const syncMoodTitle = (nextMoodId: string, nextWeatherId: string) => {
    const nextTitle = journalMoodDisplay(nextMoodId, nextWeatherId)
    if (!title.trim() || parseJournalMoodTitle(title).isMoodTitle) setTitle(nextTitle)
  }

  const addPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Taro.showToast({ title: `最多 ${MAX_PHOTOS} 张照片`, icon: 'none' })
      return
    }
    try {
      const result = await Taro.chooseMedia({
        count: MAX_PHOTOS - photos.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      const picked = result.tempFiles.map((file) => file.tempFilePath).filter(Boolean)
      if (picked.length) setPhotos((current) => [...current, ...picked].slice(0, MAX_PHOTOS))
    } catch {
      // 用户取消选择
    }
  }

  const previewPhotos = (index: number) => {
    Taro.previewImage({ urls: photos, current: photos[index] }).catch(() => {
      // 用户取消或预览失败
    })
  }

  const openPrimarySheet = async () => {
    const index = await pickSheetIndex(['查看大图', '更换照片'])
    if (index === 0) previewPhotos(0)
    else if (index === 1) void replacePrimaryPhoto()
  }

  const replacePrimaryPhoto = async () => {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      const path = result.tempFiles[0]?.tempFilePath
      if (!path) return
      setPhotos((current) => [path, ...current.filter((item) => item !== path)].slice(0, MAX_PHOTOS))
    } catch {
      // 用户取消选择
    }
  }

  const pickWeather = async () => {
    const index = await pickSheetIndex(JOURNAL_WEATHERS.map((item) => `${item.label} ${item.icon}`))
    const next = JOURNAL_WEATHERS[index]
    if (!next) return
    setWeatherId(next.id)
    syncMoodTitle(moodId, next.id)
  }

  const chooseMood = (nextMoodId: string) => {
    setMoodId(nextMoodId)
    syncMoodTitle(nextMoodId, weatherId)
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const photosData: string[] = []
      for (const item of photos) {
        photosData.push(item.startsWith('data:') ? item : await photoToDataUrl(item))
      }
      const nextTitle = title.trim() || moodLine
      const input = {
        title: nextTitle.slice(0, 40),
        body: body.trim().slice(0, 1000),
        location: location.trim().slice(0, 40),
        photos: photosData,
      }
      if (editId) await diaryApi.update(editId, input)
      else await diaryApi.create({ ...input, day })
      Taro.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => onSaved(), 400)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editId || saving) return
    setSaving(true)
    try {
      await diaryApi.remove(editId)
      Taro.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => onSaved(), 400)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
      setSaving(false)
    }
  }

  return (
    <View className="journal-editor-page">
      <Image className="journal-editor__yard" src={editorYard} mode="widthFix" />
      <View className="journal-editor">
        <View className="journal-editor__nav">
          <MiniappBackButton onClick={onClose} />
          <Text className="journal-editor__heading">写日记</Text>
          <Button className="journal-editor__save" disabled={saving} onClick={() => void save()}>
            {saving ? '保存中' : '保存'}
          </Button>
        </View>

        <View className="journal-editor__card">
          <View className="journal-editor__meta">
            <Text className="journal-editor__date">{journalDateLabel(day)}</Text>
          </View>
          <View className="journal-editor__moods">
            <Text className="journal-editor__moods-title">心情</Text>
            {JOURNAL_MOODS.map((mood) => (
              <View
                key={mood.id}
                className={moodId === mood.id ? 'journal-editor__mood-option journal-editor__mood-option--active' : 'journal-editor__mood-option'}
                onClick={() => chooseMood(mood.id)}
              >
                <Image className="journal-editor__mood-image" src={moodImages[mood.id]} mode="aspectFit" />
                <Text className="journal-editor__mood-label">{mood.label}</Text>
              </View>
            ))}
          </View>
          <Textarea
            className="journal-editor__body"
            value={body}
            maxlength={1000}
            placeholder="今天发生了什么？"
            onInput={(event) => setBody(event.detail.value)}
          />
          <View
            className={hasUserPhoto ? 'journal-editor__polaroid journal-editor__polaroid--user' : 'journal-editor__polaroid'}
            onClick={() => (hasUserPhoto ? void openPrimarySheet() : void replacePrimaryPhoto())}
          >
            <Image
              className="journal-editor__polaroid-image"
              src={hasUserPhoto ? photos[0] : polaroidRun}
              mode={hasUserPhoto ? 'aspectFill' : 'aspectFit'}
            />
            {!hasUserPhoto && <Text className="journal-editor__polaroid-hint">点这里放今天的照片</Text>}
          </View>
          {photos.length > 1 && (
            <View className="journal-editor__photos">
              {photos.slice(1).map((item, index) => (
                <View key={`${index}-${item.slice(0, 24)}`} className="journal-editor__photo-wrap" onClick={() => previewPhotos(index + 1)}>
                  <Image className="journal-editor__photo" src={item} mode="aspectFill" />
                  <Text
                    className="journal-editor__photo-remove"
                    onClick={(event) => {
                      event.stopPropagation()
                      setPhotos((current) => current.filter((_photo, i) => i !== index + 1))
                    }}
                  >×</Text>
                </View>
              ))}
            </View>
          )}
          <View className="journal-editor__toolbar">
            <View className="journal-editor__tools">
              <View className="journal-editor__tool" onClick={() => void pickWeather()}>
                <Text className="journal-editor__tool-icon">{weather.icon}</Text>
                <Text className="journal-editor__tool-label">天气</Text>
              </View>
              <View className="journal-editor__tool" onClick={() => void addPhotos()}>
                <Text className="journal-editor__tool-icon journal-editor__tool-icon--album">🖼</Text>
                <Text className="journal-editor__tool-label">相册</Text>
              </View>
              <View className="journal-editor__tool" onClick={() => setLocationOpen((open) => !open)}>
                <Text className="journal-editor__tool-icon journal-editor__tool-icon--pin">📍</Text>
                <Text className="journal-editor__tool-label">地点</Text>
              </View>
            </View>
          </View>
          {locationOpen && (
            <Input
              className="journal-editor__location"
              value={location}
              maxlength={40}
              placeholder="写下地点（可选）"
              onInput={(event) => setLocation(event.detail.value)}
            />
          )}
        </View>

        {editId && (
          <Text className="journal-editor__delete" onClick={() => void remove()}>删除这篇日记</Text>
        )}
      </View>
    </View>
  )
}
