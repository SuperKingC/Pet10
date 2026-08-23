export const anniversaryIconKeys = ['heart', 'star', 'cake', 'paw', 'balloon'] as const
export type AnniversaryIconKey = typeof anniversaryIconKeys[number]

export const anniversaryIcons: Record<AnniversaryIconKey, string> = {
  heart: require('../../assets/anniversaries/anniv-heart.png'),
  star: require('../../assets/anniversaries/anniv-star.png'),
  cake: require('../../assets/anniversaries/anniv-cake.png'),
  paw: require('../../assets/anniversaries/anniv-paw.png'),
  balloon: require('../../assets/anniversaries/anniv-balloon.png'),
}

export const anniversaryIconLabels: Record<AnniversaryIconKey, string> = {
  heart: '爱心', star: '星星', cake: '蛋糕', paw: '爪印', balloon: '气球',
}
