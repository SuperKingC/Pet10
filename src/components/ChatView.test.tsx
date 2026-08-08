import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ChatView } from './ChatView'

describe('chat view own avatar', () => {
  it('renders the current user avatar to the right of their message', () => {
    const markup = renderToStaticMarkup(
      <ChatView
        conversation={{ roomId: 'room', type: 'pair', title: 'Friend', avatarUrl: null, proactiveEnabled: true, updatedAt: new Date().toISOString() }}
        currentUser={{ id: 'me', email: 'me@example.com', username: 'me', displayName: 'Me' }}
        runtime={{
          loaded: true,
          messages: [{ id: 'mine', sender: 'you', kind: 'text', text: 'hello', createdAt: '10:00' }],
          pet: null,
          memories: [],
          petTyping: false,
          friendTyping: false
        }}
        onBack={vi.fn()}
        onSend={vi.fn()}
        onTyping={vi.fn()}
        onUploadImage={vi.fn()}
      />
    )

    expect(markup).toContain('chat-row__avatar--mine')
    expect(markup).toContain('aria-label="Me"')
    expect(markup.indexOf('hello')).toBeLessThan(markup.indexOf('chat-row__avatar--mine'))
  })
})
