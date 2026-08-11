export type TabKey = 'messages' | 'nest' | 'calendar' | 'me'

interface TabBarProps {
  active: TabKey
  onChange(tab: TabKey): void
  onTogglePawMenu(): void
  messageBadge: number
  nestBadge?: boolean
  pawMenuOpen?: boolean
}

const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'nest', label: '小窝', icon: '/navigation/nest.png' },
  { key: 'calendar', label: '小记', icon: '/navigation/journal.png' },
  { key: 'messages', label: '消息', icon: '/navigation/messages.png' },
  { key: 'me', label: '我的', icon: '/navigation/me.png' }
]

export function TabBar({
  active,
  onChange,
  onTogglePawMenu,
  messageBadge,
  nestBadge = false,
  pawMenuOpen = false
}: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="主导航">
      {TABS.slice(0, 2).map((tab) => {
        const badge = tab.key === 'messages' ? messageBadge : tab.key === 'nest' && nestBadge ? 1 : 0
        return (
          <button
            key={tab.key}
            className={`tab-bar__item ${!pawMenuOpen && active === tab.key ? 'tab-bar__item--active' : ''}`}
            onClick={() => onChange(tab.key)}
            aria-current={active === tab.key ? 'page' : undefined}
          >
            <span className="tab-bar__icon" aria-hidden="true">
              <img src={tab.icon} alt="" width="48" height="48" />
              {badge > 0 && <em className="tab-bar__badge">{tab.key === 'nest' ? '' : badge > 99 ? '99+' : badge}</em>}
            </span>
            <span className="tab-bar__label">{tab.label}</span>
          </button>
        )
      })}
      <button
        className={`tab-bar__item tab-bar__item--paw ${pawMenuOpen ? 'tab-bar__item--paw-open' : ''}`}
        onClick={onTogglePawMenu}
        aria-label="打开快捷功能"
        aria-expanded={pawMenuOpen}
      >
        <span className="tab-bar__paw-icon" aria-hidden="true">
          <img src="/navigation/paw.png" alt="" width="64" height="64" />
        </span>
      </button>
      {TABS.slice(2).map((tab) => {
        const badge = tab.key === 'messages' ? messageBadge : 0
        return (
          <button
            key={tab.key}
            className={`tab-bar__item ${!pawMenuOpen && active === tab.key ? 'tab-bar__item--active' : ''}`}
            onClick={() => onChange(tab.key)}
            aria-current={active === tab.key ? 'page' : undefined}
          >
            <span className="tab-bar__icon" aria-hidden="true">
              <img src={tab.icon} alt="" width="48" height="48" />
              {badge > 0 && <em className="tab-bar__badge">{badge > 99 ? '99+' : badge}</em>}
            </span>
            <span className="tab-bar__label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
