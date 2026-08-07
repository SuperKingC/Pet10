import type { Message } from '../domain/types'
import { PetAvatar } from './PetAvatar'

interface MessageBubbleProps {
  message: Message
  friendAvatar: string
}

export function MessageBubble({ message, friendAvatar }: MessageBubbleProps) {
  const isMine = message.sender === 'you'
  const isPet = message.sender === 'pet'

  return (
    <article className={`message-row ${isMine ? 'message-row--mine' : ''}`}>
      {!isMine && (
        <div className={`message-avatar ${isPet ? 'message-avatar--pet' : ''}`}>
          {isPet ? <PetAvatar mood="happy" size="small" /> : friendAvatar}
        </div>
      )}
      <div className={`message-bubble ${isMine ? 'message-bubble--mine' : ''} ${isPet ? 'message-bubble--pet' : ''}`}>
        {message.imageUrl && <img className="message-image" src={message.imageUrl} alt="聊天图片" />}
        {message.text && <p>{message.text}</p>}
        <time>{message.createdAt}</time>
      </div>
    </article>
  )
}
