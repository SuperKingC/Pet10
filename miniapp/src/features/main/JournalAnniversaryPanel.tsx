import { useEffect, useState } from 'react'
import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { socialApi, type AnniversaryInput, type MiniappAnniversary } from '../../services/socialApi'
import { MiniappBackButton } from '../../components/MiniappBackButton'
import { AnniversaryForm } from './AnniversaryForm'
import { AnniversaryListView } from './AnniversaryListView'
import { localDayKey, resolveMoodRoomId } from './journalModel'
import './anniversary.scss'
import './JournalAnniversaryPanel.scss'

interface JournalAnniversaryPanelProps {
  roomId: string
  /** overlay：独立路由壳层全屏用法（自带返回栏）；inline：小记页内分页嵌入（无返回栏，内容区滚动） */
  variant?: 'overlay' | 'inline'
  onClose?(): void
}

export function JournalAnniversaryPanel({ roomId: pairRoomId, variant = 'overlay', onClose }: JournalAnniversaryPanelProps) {
  const [roomId, setRoomId] = useState(pairRoomId)
  const [anniversaries, setAnniversaries] = useState<MiniappAnniversary[] | null>(null)
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
    setAnniversaries(null)
    void socialApi.listAnniversaries(roomId).then(setAnniversaries).catch(() => setAnniversaries([]))
  }, [roomId])

  const submit = async (input: AnniversaryInput) => {
    if (!roomId || saving) return
    setSaving(true)
    try {
      if (form?.edit) {
        const updated = await socialApi.updateAnniversary(roomId, form.edit.id, input)
        setAnniversaries((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const created = await socialApi.createAnniversary(roomId, input)
        setAnniversaries((current) => [...(current ?? []), created])
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
      setAnniversaries((current) => (current ?? []).filter((item) => item.id !== form.edit?.id))
      setForm(null)
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
    } finally { setSaving(false) }
  }

  const content = form ? (
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
      items={anniversaries ?? []}
      loading={anniversaries === null}
      today={today}
      onAdd={() => setForm({ day: currentDay, pickDay: true })}
      onEdit={(id) => {
        const item = anniversaries?.find((entry) => entry.id === id)
        if (item) setForm({ day: item.day, edit: item })
      }}
    />
  )

  if (variant === 'inline') {
    return (
      <View className="journal-anniv-panel journal-anniv-panel--inline">
        <Text className="journal-anniv-panel__caption">把重要的日子记下来</Text>
        {/* 列表可滚动兜底；设置表单不滚动——表单卡片弹性占满剩余空间，照片预览区自适应伸缩保证一屏全部可见 */}
        {form ? content : <View className="journal-anniv-panel__scroll">{content}</View>}
      </View>
    )
  }

  return (
    <View className="journal-anniv-panel">
      <View className="journal-anniv-panel__top">
        <MiniappBackButton onClick={() => onClose?.()} />
        <Text className="journal-anniv-panel__title">纪念日</Text>
      </View>
      <Text className="journal-anniv-panel__caption">把重要的日子记下来</Text>
      {content}
    </View>
  )
}
