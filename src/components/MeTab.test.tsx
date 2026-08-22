import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { UserProfile } from '../domain/types'
import { MeTab } from './MeTab'

const user: UserProfile = {
  id: 'user-1',
  email: 'duoli@example.com',
  username: 'duoli',
  displayName: '小多利',
  publicCode: '12345678',
  birthday: '2020-08-11',
}

describe('MeTab', () => {
  it('renders the five profile list entries with illustrated image assets instead of emoji', () => {
    const markup = renderToStaticMarkup(
      <MeTab
        user={user}
        onProfileUpdated={vi.fn()}
        onOpenAvatar={vi.fn()}
        onOpenMbti={vi.fn()}
        onLogout={vi.fn()}
      />,
    )
    const container = document.createElement('div')
    container.innerHTML = markup

    expect(
      [...container.querySelectorAll<HTMLImageElement>('.me-list__icon')].map((image) => image.getAttribute('src')),
    ).toEqual([
      '/me/birthday.png',
      '/me/notification.png',
      '/me/contact.png',
      '/me/about.png',
      '/me/logout.png',
    ])
    expect(container.querySelectorAll('.me-list__icon[alt=""]')).toHaveLength(5)
    expect(container.querySelector('.me-list')?.textContent).not.toMatch(/[🎂🔔💌🐾🚪]/u)
  })

  it('opens the contact entry as a modal trigger instead of a mailto link', () => {
    const markup = renderToStaticMarkup(
      <MeTab
        user={user}
        onProfileUpdated={vi.fn()}
        onOpenAvatar={vi.fn()}
        onOpenMbti={vi.fn()}
        onLogout={vi.fn()}
      />,
    )
    const container = document.createElement('div')
    container.innerHTML = markup

    const contactItem = [...container.querySelectorAll('.me-list__item')].find((item) => item.textContent?.includes('联系我们'))
    expect(contactItem).toBeDefined()
    expect(contactItem?.tagName).toBe('BUTTON')
    expect(contactItem?.getAttribute('href')).toBeNull()
    expect(markup).not.toContain('mailto:')
  })
})
