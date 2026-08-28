export const anniversaryIconKeys = ['heart', 'star', 'cake', 'paw', 'balloon'] as const
export type AnniversaryIconKey = typeof anniversaryIconKeys[number]

export const anniversaryIcons: Record<AnniversaryIconKey, string> = {
  heart: require('../../assets/anniversaries/anniv-heart.webp'),
  star: require('../../assets/anniversaries/anniv-star.webp'),
  cake: require('../../assets/anniversaries/anniv-cake.webp'),
  paw: require('../../assets/anniversaries/anniv-paw.webp'),
  balloon: require('../../assets/anniversaries/anniv-balloon.webp'),
}

export const anniversaryIconLabels: Record<AnniversaryIconKey, string> = {
  heart: '爱心', star: '星星', cake: '蛋糕', paw: '爪印', balloon: '气球',
}
