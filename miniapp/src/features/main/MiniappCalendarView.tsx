import { Text, View } from '@tarojs/components'
import './MiniappCalendarView.scss'

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function MiniappCalendarView() {
  const today = new Date()
  const days = Array.from({ length: daysInMonth(today) }, (_, index) => index + 1)
  return (
    <View className="miniapp-calendar">
      <View className="miniapp-calendar__header">
        <Text className="miniapp-calendar__title">小记</Text>
        <Text className="miniapp-calendar__caption">记录你们一起度过的每一天。</Text>
      </View>
      <View className="miniapp-calendar__month">
        <Text>{today.getFullYear()}年{today.getMonth() + 1}月</Text>
      </View>
      <View className="miniapp-calendar__grid">
        {days.map((day) => (
          <View key={day} className={day === today.getDate() ? 'miniapp-calendar__day miniapp-calendar__day--today' : 'miniapp-calendar__day'}>
            <Text>{day}</Text>
            <View className="miniapp-calendar__dot" />
          </View>
        ))}
      </View>
      <View className="miniapp-calendar__fortune">
        <Text className="miniapp-calendar__fortune-label">今日运势</Text>
        <Text className="miniapp-calendar__fortune-title">登录后即可查看今天的运势</Text>
      </View>
    </View>
  )
}
