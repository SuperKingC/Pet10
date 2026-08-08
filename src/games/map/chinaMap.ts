/**
 * 足迹地图：卡通手绘中国轮廓 + 16 个点位
 * 坐标基于 viewBox 0 0 360 310，手绘风无需精确地理边界
 */

export interface MapSpot {
  id: number
  name: string
  icon: string
  x: number
  y: number
  /** 标签锚点方向（默认下方） */
  labelDy?: number
}

export const MAP_SPOT_COUNT = 16

export const MAP_SPOTS: MapSpot[] = [
  { id: 1, name: '哈尔滨', icon: '❄️', x: 293, y: 48 },
  { id: 2, name: '北京', icon: '🏯', x: 243, y: 96 },
  { id: 3, name: '内蒙古草原', icon: '🐎', x: 196, y: 72, labelDy: -18 },
  { id: 4, name: '乌鲁木齐', icon: '🍇', x: 58, y: 78 },
  { id: 5, name: '敦煌', icon: '🐫', x: 118, y: 112 },
  { id: 6, name: '拉萨', icon: '🏔️', x: 96, y: 172 },
  { id: 7, name: '西安', icon: '🏺', x: 193, y: 138 },
  { id: 8, name: '成都', icon: '🐼', x: 160, y: 172 },
  { id: 9, name: '重庆', icon: '🍲', x: 187, y: 189 },
  { id: 10, name: '武汉', icon: '🌉', x: 228, y: 168 },
  { id: 11, name: '杭州', icon: '🛶', x: 268, y: 183 },
  { id: 12, name: '上海', icon: '🌆', x: 287, y: 168 },
  { id: 13, name: '昆明', icon: '🌸', x: 154, y: 228 },
  { id: 14, name: '厦门', icon: '🌊', x: 253, y: 222 },
  { id: 15, name: '广州', icon: '🌺', x: 222, y: 238 },
  { id: 16, name: '三亚', icon: '🏖️', x: 196, y: 283, labelDy: -20 }
]

/** 卡通中国轮廓（手绘风，非精确边界） */
export const CHINA_OUTLINE = [
  'M 40 95',
  'C 52 62, 92 44, 128 50',
  'C 156 40, 182 56, 204 46',
  'C 232 30, 268 28, 294 44',
  'C 322 54, 332 76, 314 92',
  'C 300 102, 286 96, 276 106',
  'C 286 120, 278 134, 262 140',
  'C 278 148, 288 158, 298 168',
  'C 304 184, 292 200, 276 212',
  'C 268 228, 258 240, 244 250',
  'C 234 262, 220 264, 212 276',
  'C 204 292, 190 294, 186 280',
  'C 180 262, 168 252, 152 242',
  'C 132 236, 118 216, 100 202',
  'C 74 196, 54 180, 44 160',
  'C 28 144, 28 118, 40 95',
  'Z'
].join(' ')
