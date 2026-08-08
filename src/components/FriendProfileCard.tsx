import { zodiacFromBirthday, type UserProfile } from '../domain/types'

interface FriendProfileCardProps {
  user: UserProfile
  onClose(): void
}

/** 点头像弹出的对方资料卡：头像/昵称/ID/星座/MBTI */
export function FriendProfileCard({ user, onClose }: FriendProfileCardProps) {
  const zodiac = zodiacFromBirthday(user.birthday)
  return (
    <div className="profile-card-overlay" onClick={onClose}>
      <div className="profile-card" onClick={(event) => event.stopPropagation()}>
        <button className="profile-card__close" onClick={onClose} aria-label="关闭">×</button>
        <div className="profile-card__avatar">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.displayName} />
            : <span>{user.displayName.slice(0, 1)}</span>}
        </div>
        <h3 className="profile-card__name">{user.displayName}</h3>
        <p className="profile-card__id">
          ID：{user.username}
          <button
            className="profile-card__copy"
            onClick={() => void navigator.clipboard?.writeText(user.username)}
          >复制</button>
        </p>
        <div className="profile-card__badges">
          {zodiac && <span className="profile-card__badge">{zodiac.icon} {zodiac.name}</span>}
          {user.mbti && <span className="profile-card__badge profile-card__badge--mbti">{user.mbti}</span>}
          {!zodiac && !user.mbti && <span className="profile-card__empty">TA 还没有填写星座和 MBTI</span>}
        </div>
      </div>
    </div>
  )
}
