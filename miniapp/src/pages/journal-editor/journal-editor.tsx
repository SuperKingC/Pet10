import { useState } from 'react'
import { Button, Image, Input, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { diaryApi } from '../../services/diaryApi'
import { takeJournalDraft } from '../../features/main/journalDraft'
import { localDayKey } from '../../features/main/journalModel'
import '../../features/main/journalSubpage.scss'
import './journal-editor.scss'

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

export default function JournalEditorPage() {
  const today = new Date()
  const todayKey = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const [day, setDay] = useState(todayKey)
  const [editId, setEditId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  Taro.useLoad((options) => {
    const paramDay = options?.day && /^\d{4}-\d{2}-\d{2}$/.test(options.day) ? options.day : todayKey
    setDay(paramDay)
    const draft = takeJournalDraft()
    if (options?.id && draft.edit && draft.edit.id === options.id) {
      setEditId(draft.edit.id)
      setTitle(draft.edit.title)
      setBody(draft.edit.body)
      setLocation(draft.edit.location)
      setPhotos(draft.edit.photos)
      setDay(draft.edit.day)
    } else if (draft.photo) {
      setPhotos([draft.photo])
    }
  })

  const addPhotos = async () => {
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

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const photosData: string[] = []
      for (const photo of photos) {
        photosData.push(photo.startsWith('data:') ? photo : await photoToDataUrl(photo))
      }
      const input = {
        title: title.trim().slice(0, 40),
        body: body.trim().slice(0, 1000),
        location: location.trim().slice(0, 40),
        photos: photosData,
      }
      if (editId) {
        await diaryApi.update(editId, input)
      } else {
        await diaryApi.create({ ...input, day })
      }
      Taro.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 600)
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
      setTimeout(() => Taro.navigateBack(), 600)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
      setSaving(false)
    }
  }

  return (
    <View className="journal-subpage">
      <View className="journal-subpage__header">
        <Text className="journal-subpage__title">{editId ? '编辑日记' : '写日记'}</Text>
        <Text className="journal-subpage__caption">{day}</Text>
      </View>
      <View className="journal-editor">
        <Input className="journal-editor__title" value={title} maxlength={40} placeholder="给这天起个标题" onInput={(event) => setTitle(event.detail.value)} />
        <Textarea className="journal-editor__body" value={body} maxlength={1000} placeholder="今天发生了什么？" onInput={(event) => setBody(event.detail.value)} />
        <View className="journal-editor__photos">
          {photos.map((photo, index) => (
            <View key={`${index}-${photo.slice(0, 24)}`} className="journal-editor__photo-wrap">
              <Image className="journal-editor__photo" src={photo} mode="aspectFill" />
              <Button className="journal-editor__photo-remove" onClick={() => setPhotos((current) => current.filter((_item, i) => i !== index))}>×</Button>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Button className="journal-editor__photo-add" onClick={() => void addPhotos()}>+ 添加照片</Button>
          )}
        </View>
        <Input className="journal-editor__location" value={location} maxlength={40} placeholder="地点（可选），例如：阳光公园" onInput={(event) => setLocation(event.detail.value)} />
        <View className="journal-editor__actions">
          {editId && <Button className="journal-editor__btn journal-editor__btn--danger" disabled={saving} onClick={() => void remove()}>删除</Button>}
          <Button className="journal-editor__btn journal-editor__btn--primary" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存'}</Button>
        </View>
      </View>
    </View>
  )
}
