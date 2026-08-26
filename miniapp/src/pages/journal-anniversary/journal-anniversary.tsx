import { useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { socialApi, type AnniversaryInput, type MiniappAnniversary } from '../../services/socialApi'
import { AnniversaryForm } from '../../features/main/AnniversaryForm'
import { AnniversaryListView } from '../../features/main/AnniversaryListView'
import { localDayKey, resolveMoodRoomId } from '../../features/main/journalModel'
import '../../features/main/journalSubpage.scss'
import '../../features/main/anniversary.scss'

export default function JournalAnniversaryPage() {
  const [roomId, setRoomId] = useState('')
  const [anniversaries, setAnniversaries] = useState<MiniappAnniversary[]>([])
  const [form, setForm] = useState<{ day: string; edit?: MiniappAnniversary; pickDay?: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const today = new Date()
  const currentDay = localDayKey(today.getFullYear(), today.getMonth(), today.getDate())

  Taro.useLoad((options) => {
    const paramRoomId = options?.roomId ? decodeURIComponent(options.roomId) : ''
    if (paramRoomId) {
      setRoomId(paramRoomId)
      return
    }
    void socialApi.listConversations()
      .then((conversations) => setRoomId(resolveMoodRoomId('', conversations)))
      .catch(() => undefined)
  })

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
    <View className="journal-subpage">
      <View className="journal-subpage__header">
        <Text className="journal-subpage__title">纪念日</Text>
        <Text className="journal-subpage__caption">把重要的日子记下来。</Text>
      </View>
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
