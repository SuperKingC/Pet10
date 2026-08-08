export type TabKey = 'messages' | 'nest' | 'calendar' | 'me'

interface TabBarProps {
  active: TabKey
  onChange(tab: TabKey): void
  messageBadge: number
  nestBadge?: boolean
}

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'messages', label: '消息', icon: '💬' },
  { key: 'nest', label: '小窝', icon: '🏠' },
  { key: 'calendar', label: '日常', icon: '📅' },
  { key: 'me', label: '我的', icon: '🐾' }
]

export function TabBar({ active, onChange, messageBadge, nestBadge = false }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="主导航">
      {TABS.map((tab) => {
        const badge = tab.key === 'messages' ? messageBadge : tab.key === 'nest' && nestBadge ? 1 : 0
        return (
          <button
            key={tab.key}
            className={`tab-bar__item ${active === tab.key ? 'tab-bar__item--active' : ''}`}
            onClick={() => onChange(tab.key)}
            aria-current={active === tab.key ? 'page' : undefined}
          >
            <span className="tab-bar__icon" aria-hidden="true">
              {tab.icon}
              {badge > 0 && <em className="tab-bar__badge">{tab.key === 'nest' ? '' : badge > 99 ? '99+' : badge}</em>}
            </span>
            <span className="tab-bar__label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
