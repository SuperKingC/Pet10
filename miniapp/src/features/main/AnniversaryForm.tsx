import { useState } from 'react'
import { Button, Image, Input, Picker, Text, View } from '@tarojs/components'
import type { AnniversaryInput, AnniversaryRepeat } from '../../services/socialApi'
import { anniversaryIconKeys, anniversaryIconLabels, anniversaryIcons, type AnniversaryIconKey } from './anniversaryAssets'
import './MiniappCalendarView.scss'

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

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed.slice(0, 20), icon, note: note.trim().slice(0, 50), day, repeatRule })
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
      <View className="anniv-form__icons">
        {anniversaryIconKeys.map((key) => (
          <Button key={key} className={`anniv-form__icon-item${icon === key ? ' anniv-form__icon-item--active' : ''}`} onClick={() => setIcon(key)}>
            <Image className="anniv-form__icon-img" src={anniversaryIcons[key]} mode="aspectFit" />
            <Text className="anniv-form__icon-label">{anniversaryIconLabels[key]}</Text>
          </Button>
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
