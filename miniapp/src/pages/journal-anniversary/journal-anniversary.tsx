import { JournalAnniversaryPanel } from '../../features/main/JournalAnniversaryPanel'
import Taro from '@tarojs/taro'
import './journal-anniversary.scss'

export default function JournalAnniversaryPage() {
  const roomId = decodeURIComponent(Taro.getCurrentInstance().router?.params?.roomId || '')
  return (
    <JournalAnniversaryPanel
      roomId={roomId}
      onClose={() => Taro.navigateBack()}
    />
  )
}
