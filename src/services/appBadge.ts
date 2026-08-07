interface BadgingNavigator extends Navigator {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

function badgingNavigator(): BadgingNavigator {
  return navigator as BadgingNavigator
}

export function setAppBadge(count: number) {
  const nav = badgingNavigator()
  if (typeof nav.setAppBadge !== 'function') return
  nav.setAppBadge(count).catch(() => undefined)
}

export function clearAppBadge() {
  const nav = badgingNavigator()
  if (typeof nav.clearAppBadge !== 'function') return
  nav.clearAppBadge().catch(() => undefined)
}
