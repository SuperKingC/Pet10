import { useState } from 'react'
import { Button, Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { diaryApi, type MiniappDiary } from '../../services/diaryApi'
import {
  JOURNAL_MOODS,
  JOURNAL_WEATHERS,
  journalDateLabel,
  journalMoodDisplay,
  parseJournalMoodTitle,
} from './journalModel'
import './JournalEditorForm.scss'

const polaroidRun = require('../../assets/journal/polaroid-run.png')
const editorYard = require('../../assets/journal/editor-yard.jpg')

const MAX_PHOTOS = 3
const MAX_PHOTO_CHARS = 300_000

async function photoToDataUrl(src: string): Promise<string> {
  let path = src
  try {
    const compressed = await Taro.compressImage({ src, quality: 60 })
    path = compressed.tempFilePath
  } catch {
    // 压缩失败时使用原图
  }
  const base64 = Taro.getFileSystemManager().readFileSync(path, 'base64') as string
  const dataUrl = `data:image/jpeg;base64,${base64}`
  if (dataUrl.length > MAX_PHOTO_CHARS) throw new Error('图片太大，请换一张或减少照片')
  return dataUrl
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

  const pickMood = async () => {
    const index = await pickSheetIndex(JOURNAL_MOODS.map((item) => `${item.label} ${item.icon}`))
    const next = JOURNAL_MOODS[index]
    if (!next) return
    setMoodId(next.id)
    syncMoodTitle(next.id, weatherId)
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
          <Text className="journal-editor__back" onClick={onClose}>‹</Text>
          <Text className="journal-editor__heading">写日记</Text>
          <Button className="journal-editor__save" disabled={saving} onClick={() => void save()}>
            {saving ? '保存中' : '保存'}
          </Button>
        </View>

        <View className="journal-editor__card">
          <View className="journal-editor__meta">
            <Text className="journal-editor__date">{journalDateLabel(day)}</Text>
            <Text className="journal-editor__mood" onClick={() => void pickMood()}>{moodLine}</Text>
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
            onClick={() => void replacePrimaryPhoto()}
          >
            <Image
              className="journal-editor__polaroid-image"
              src={hasUserPhoto ? photos[0] : polaroidRun}
              mode={hasUserPhoto ? 'aspectFill' : 'aspectFit'}
            />
          </View>
          {photos.length > 1 && (
            <View className="journal-editor__photos">
              {photos.slice(1).map((item, index) => (
                <View key={`${index}-${item.slice(0, 24)}`} className="journal-editor__photo-wrap">
                  <Image className="journal-editor__photo" src={item} mode="aspectFill" />
                  <Text
                    className="journal-editor__photo-remove"
                    onClick={() => setPhotos((current) => current.filter((_photo, i) => i !== index + 1))}
                  >×</Text>
                </View>
              ))}
            </View>
          )}
          <View className="journal-editor__toolbar">
            <View className="journal-editor__tools">
              <View className="journal-editor__tool" onClick={() => void pickWeather()}>
                <Text className="journal-editor__tool-icon journal-editor__tool-icon--weather">☁</Text>
                <Text className="journal-editor__tool-label">天气</Text>
              </View>
              <View className="journal-editor__tool" onClick={() => void pickMood()}>
                <Text className="journal-editor__tool-icon journal-editor__tool-icon--mood">☺</Text>
                <Text className="journal-editor__tool-label">心情</Text>
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
            <Text className="journal-editor__plus" onClick={() => void addPhotos()}>+</Text>
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
