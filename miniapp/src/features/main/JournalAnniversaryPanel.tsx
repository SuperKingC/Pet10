import { useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { socialApi, type AnniversaryInput, type MiniappAnniversary } from '../../services/socialApi'
import { AnniversaryForm } from './AnniversaryForm'
import { AnniversaryListView } from './AnniversaryListView'
import { localDayKey, resolveMoodRoomId } from './journalModel'
import './anniversary.scss'
import './JournalAnniversaryPanel.scss'

interface JournalAnniversaryPanelProps {
  roomId: string
  onClose(): void
}

export function JournalAnniversaryPanel({ roomId: pairRoomId, onClose }: JournalAnniversaryPanelProps) {
  const [roomId, setRoomId] = useState(pairRoomId)
  const [anniversaries, setAnniversaries] = useState<MiniappAnniversary[]>([])
  const [form, setForm] = useState<{ day: string; edit?: MiniappAnniversary; pickDay?: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const today = new Date()
  const currentDay = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())

  useEffect(() => {
    if (pairRoomId) {
      setRoomId(pairRoomId)
      return
    }
    let cancelled = false
    void socialApi.listConversations()
      .then((conversations) => {
        if (!cancelled) setRoomId(resolveMoodRoomId('', conversations))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [pairRoomId])

  useEffect(() => {
    if (!roomId) return
    void socialApi.listAnniversaries(roomId).then(setAnniversaries).catch(() => setAnniversaries([]))
  }, [roomId])

  const submit = async (input: AnniversaryInput) => {
    if (!roomId || saving) return
    setSaving(true)
    try {
      if (form?.edit) {
        const updated = await socialApi.updateAnniversary(roomId, form.edit.id, input)
        setAnniversaries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await socialApi.createAnniversary(roomId, input)
        setAnniversaries((current) => [...current, created])
      }
      setForm(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' })
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!roomId || !form?.edit || saving) return
    setSaving(true)
    try {
      await socialApi.deleteAnniversary(roomId, form.edit.id)
      setAnniversaries((current) => current.filter((item) => item.id !== form.edit?.id))
      setForm(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    } finally { setSaving(false) }
  }

  return (
    <View className="journal-anniv-panel">
      <View className="journal-anniv-panel__top">
        <Text className="journal-anniv-panel__back" onClick={onClose}>返回</Text>
        <Text className="journal-anniv-panel__title">纪念日</Text>
      </View>
      <Text className="journal-anniv-panel__caption">把重要的日子记下来。</Text>
      {form ? (
        <AnniversaryForm
          defaultDay={form.day}
          withDatePicker={form.pickDay}
          initial={form.edit}
          saving={saving}
          onSubmit={(input) => void submit(input)}
          onCancel={() => setForm(null)}
          onDelete={form.edit ? () => void remove() : undefined}
        />
      ) : (
        <AnniversaryListView
          items={anniversaries}
          today={today}
          onAdd={() => setForm({ day: currentDay, pickDay: true })}
          onEdit={(id) => {
            const item = anniversaries.find((entry) => entry.id === id)
            if (item) setForm({ day: item.day, edit: item })
          }}
        />
      )}
    </View>
  )
}
