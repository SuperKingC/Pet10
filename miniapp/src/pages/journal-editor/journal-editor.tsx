import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { JournalEditorForm } from '../../features/main/JournalEditorForm'
import { takeJournalDraft } from '../../features/main/journalDraft'
import { localDayKey } from '../../features/main/journalModel'
import type { MiniappDiary } from '../../services/diaryApi'
import './journal-editor.scss'

// 独立编辑页没有 props 传 roomId：日记上报每日任务要房间维度，从本地存储补
const activeRoomKey = 'pet10_active_room_id'

export default function JournalEditorPage() {
  const today = new Date()
  const todayKey = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())
  const [day, setDay] = useState(todayKey)
  const [edit, setEdit] = useState<MiniappDiary>()
  const [photo, setPhoto] = useState<string>()
  const [ready, setReady] = useState(false)
  const [roomId] = useState(() => Taro.getStorageSync<string>(activeRoomKey) || '')

  Taro.useLoad((options) => {
    const paramDay = options?.day && /^\d{4}-\d{2}-\d{2}$/.test(options.day) ? options.day : todayKey
    const draft = takeJournalDraft()
    if (options?.id && draft.edit && draft.edit.id === options.id) {
      setEdit(draft.edit)
      setDay(draft.edit.day)
    } else {
      setDay(paramDay)
      if (draft.photo) setPhoto(draft.photo)
    }
    setReady(true)
  })

  const leave = () => {
    Taro.navigateBack()
  }

  if (!ready) return <View className="journal-editor-page" />

  return (
    <JournalEditorForm
      day={day}
      edit={edit}
      photo={photo}
      roomId={roomId}
      onClose={leave}
      onSaved={leave}
    />
  )
}
