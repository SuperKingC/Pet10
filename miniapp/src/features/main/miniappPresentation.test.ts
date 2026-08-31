import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  XIAODUOLI_BLINK_MS,
  XIAODUOLI_DOUBLE_BLINK_MS,
  XIAODUOLI_GLANCE_MS,
  XIAODUOLI_HOP_MS,
  XIAODUOLI_LOOK_MS,
} from '../../domain/xiaoduoliBehavior'

const modalComponentPath = path.resolve(__dirname, '../../components/MiniappModal.tsx')
const modalStylesPath = path.resolve(__dirname, '../../components/MiniappModal.scss')
const pawMenuStylesPath = path.resolve(__dirname, 'MiniappPawMenu.scss')
const pawMenuPath = path.resolve(__dirname, 'MiniappPawMenu.tsx')
const gamesPagePath = path.resolve(__dirname, 'MiniappGamesPage.tsx')
const gamesPageStylesPath = path.resolve(__dirname, 'MiniappGamesPage.scss')
const meViewPath = path.resolve(__dirname, 'MiniappMeView.tsx')
const mbtiPath = path.resolve(__dirname, 'MiniappMbtiTest.tsx')
const avatarEditorPath = path.resolve(__dirname, 'MiniappAvatarEditor.tsx')
const memoryPanelPath = path.resolve(__dirname, 'MiniappMemoryPanel.tsx')
const codewordModalPath = path.resolve(__dirname, 'MiniappCodewordModal.tsx')
const tarotFlowStylesPath = path.resolve(__dirname, '../tarot/MiniappTarotFlow.scss')

describe('miniapp ui presentation rules', () => {
  it('provides a shared centered modal with an image close button in the top-right corner', () => {
    const component = fs.readFileSync(modalComponentPath, 'utf8')
    const styles = fs.readFileSync(modalStylesPath, 'utf8')

    expect(component).toContain('MiniappModal')
    expect(component).toContain('miniapp-modal__close')
    expect(component).toContain('modal-close-v2.png')
    expect(styles).toContain('.miniapp-modal {')
    expect(styles).toContain('align-items: center;')
    expect(styles).toContain('.miniapp-modal__close {')
    expect(styles).toContain('top: 22rpx;')
    expect(styles).toContain('right: 22rpx;')
    expect(styles).not.toMatch(/\.miniapp-modal__panel[^{]*\{[^}]*inset: auto 0 0/)
  })

  it('keeps the paw print quick menu as the only allowed bottom drawer', () => {
    const styles = fs.readFileSync(pawMenuStylesPath, 'utf8')

    expect(styles).toMatch(/\.miniapp-paw-menu__sheet/)
  })

  it('presents MBTI, contact, about and avatar editing through the shared modal', () => {
    expect(fs.readFileSync(mbtiPath, 'utf8')).toContain('<MiniappModal')
    const meView = fs.readFileSync(meViewPath, 'utf8')
    expect(meView).toContain('<MiniappModal')
    expect(meView).toContain('联系我们')
    expect(meView).toContain('关于小多利')
    expect(meView).toContain('setAboutOpen(true)')
    expect(meView).toContain('仅此一只')
    expect(meView).toContain('老实巴交')
    expect(meView).toContain('等妈妈回家')
    expect(meView).toContain('miniapp-about__version')
    expect(fs.readFileSync(avatarEditorPath, 'utf8')).toContain('<MiniappModal')
    expect(fs.readFileSync(memoryPanelPath, 'utf8')).toContain('<MiniappModal')
  })

  it('right-aligns the about modal version line', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, 'MiniappMeView.scss'), 'utf8')
    expect(styles).toContain('.miniapp-about__version {')
    expect(styles).toMatch(/\.miniapp-about__version \{[^}]*text-align: right;/)
  })

  it('opens the games hub as a full page with gobang and a coming-soon hint', () => {
    const gamesPage = fs.readFileSync(gamesPagePath, 'utf8')
    const gamesPageStyles = fs.readFileSync(gamesPageStylesPath, 'utf8')
    const indexPage = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.tsx'), 'utf8')

    // 游戏中心是整页，不再使用居中弹窗容器
    expect(gamesPage).not.toContain('<MiniappModal')
    expect(gamesPage).toContain('一起玩小游戏')
    expect(gamesPage).toContain('五子棋')
    expect(gamesPage).toContain('gobang.png')
    expect(gamesPage).toContain('敬请期待')
    expect(gamesPageStyles).toMatch(/\.miniapp-games-page \{[^}]*position: fixed;/)
    expect(gamesPageStyles).toMatch(/\.miniapp-games-page \{[^}]*z-index: 32;/)
    // 打开游戏页时从上往下逐列入场：标题落入、卡片错帧上浮
    expect(gamesPageStyles).toMatch(/@keyframes games-header-in \{[^}]*translateY\(-36rpx\)/)
    expect(gamesPageStyles).toMatch(/@keyframes games-card-in \{[^}]*translateY\(76rpx\) scale\(\.92\)/)
    expect(gamesPageStyles).toMatch(/\.miniapp-games-page__card:nth-child\(1\) \{[^}]*animation-delay: \.14s;/)
    expect(gamesPageStyles).toMatch(/\.miniapp-games-page__card:nth-child\(2\) \{[^}]*animation-delay: \.26s;/)
    expect(gamesPageStyles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(indexPage).toContain('<MiniappGamesPage')
    expect(indexPage).not.toContain('MiniappGamesModal')
  })

  it('shows codeword, game and tarot icon entries in the paw menu and removes the footprint map entry', () => {
    const menu = fs.readFileSync(pawMenuPath, 'utf8')
    const styles = fs.readFileSync(pawMenuStylesPath, 'utf8')

    expect(menu).toContain('codeword.png')
    expect(menu).toContain('game.png')
    expect(menu).toContain('tarot.png')
    expect(menu).toContain('onOpenCodeword(): void')
    expect(menu).toContain('onOpenGames(): void')
    expect(menu).not.toContain('足迹地图')
    expect(menu).not.toContain('onOpenMap')
    expect(menu).not.toContain('entry-caption')
    // 图标底座改为高级质感方形，一行最多四格、从左到右排布；不再提供关闭按钮
    expect(menu).not.toContain('miniapp-paw-menu__close')
    expect(styles).toMatch(/\.miniapp-paw-menu__entries \{[^}]*grid-template-columns: repeat\(4, 1fr\);/)
    expect(styles).toMatch(/\.miniapp-paw-menu__entries \{[^}]*justify-items: center;/)
    expect(styles).toMatch(/\.miniapp-paw-menu__entry-base \{[^}]*border-radius: 30rpx;/)
    expect(styles).not.toMatch(/\.miniapp-paw-menu__entry-base \{[^}]*border-radius: 50%;/)
  })

  it('enhances the paw menu entrance with a full spring slide and staggered entries', () => {
    const styles = fs.readFileSync(pawMenuStylesPath, 'utf8')

    expect(styles).toMatch(/@keyframes paw-sheet-in \{[^}]*translateY\(100%\)/)
    expect(styles).toMatch(/animation: paw-sheet-in \.46s cubic-bezier\(\.3, 1\.44, \.48, 1\) backwards;/)
    expect(styles).toMatch(/@keyframes paw-entry-pop \{[^}]*translateY\(88rpx\) scale\(\.6\)/)
    expect(styles).toMatch(/\.miniapp-paw-menu__entry:nth-child\(2\) \{[^}]*animation-delay: \.07s;/)
    expect(styles).toMatch(/\.miniapp-paw-menu__entry:nth-child\(4\) \{[^}]*animation-delay: \.21s;/)
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('keeps the paw menu root mounted while closed to avoid full-page rerender flashes', () => {
    const menu = fs.readFileSync(pawMenuPath, 'utf8')
    const styles = fs.readFileSync(pawMenuStylesPath, 'utf8')

    expect(menu).not.toContain('if (!open) return null')
    expect(menu).toContain('miniapp-paw-menu--hidden')
    expect(menu).toContain('CLOSE_ANIMATION_MS')
    expect(styles).toMatch(/\.miniapp-paw-menu--hidden\s*\{[^}]*display:\s*none;/)
  })

  it('uses a hand-painted MBTI icon in the personal settings list', () => {
    const meView = fs.readFileSync(meViewPath, 'utf8')

    expect(meView).toContain('mbti.png')
    expect(meView).not.toContain('miniapp-me__mbti-icon')
  })

  it('presents the daily codeword through the shared centered modal', () => {
    const modal = fs.readFileSync(codewordModalPath, 'utf8')

    expect(modal).toContain('<MiniappModal')
    expect(modal).toContain('每日暗号')
    expect(modal).toContain('answerCodeword')
  })

  it('keeps tarot history as a centered themed panel instead of a bottom drawer', () => {
    const styles = fs.readFileSync(tarotFlowStylesPath, 'utf8')

    expect(styles).toContain('.miniapp-tarot-history__panel')
    expect(styles).not.toContain('miniapp-tarot-history__sheet')
  })

  it('uses the letter-paper nine-slice tiles for the nest empty-friend letter card', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappNestLetter.tsx'), 'utf8')
    const styles = fs.readFileSync(path.resolve(__dirname, 'MiniappNestLetter.scss'), 'utf8')
    const nestView = fs.readFileSync(path.resolve(__dirname, 'MiniappNestView.tsx'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')

    expect(nestView).toContain('<MiniappNestLetter')
    // 页头介绍文案已整体去掉，只剩标题
    expect(nestView).not.toContain('miniapp-page-caption')
    expect(component).toContain('letter-paper-tl-v4.png')
    expect(component).toContain('letter-paper-mc-v4.png')
    expect(component).toContain('letter-paper-br-v4.png')
    expect(component).not.toContain('letter-paper.png\'')
    expect(component).toContain('<XiaoduoliBoxScene')
    expect(component).not.toContain('empty-puppy.png')
    expect(component).not.toContain('empty-dog-bed.png')
    expect(component).not.toContain('empty-dog-house.png')
    expect(component).not.toContain('empty-plant-large.png')
    expect(component).not.toContain('empty-toy-ball.png')
    expect(component).not.toContain('mode="widthFix"')
    expect(component).toContain('nest-letter__paper')
    expect(component).toContain('给还没来的家人：')
    expect(styles).toContain('.nest-letter__paper')
    expect(styles).toContain('grid-template-columns')
    expect(styles).toContain('grid-template-rows')
    expect(styles).toContain('&--br { grid-area: 3 / 3; }')
    expect(styles).not.toContain('.nest-letter__plant')
    expect(styles).toContain('.nest-letter__body')
    expect(manifest).toContain('nest/letter-paper-tl-v4.png')
    expect(manifest).toContain('nest/letter-paper-br-v4.png')
    expect(manifest).not.toContain('nest/letter-paper.png"')
    expect(manifest).not.toContain('nest/empty-puppy.png')
    expect(manifest).not.toContain('nest/empty-plant-large.png')
  })

  it('presents the journal tab with sliced puppy photos and photo-replace actions', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappJournalView.tsx'), 'utf8')
    const styles = fs.readFileSync(path.resolve(__dirname, 'MiniappJournalView.scss'), 'utf8')
    const editor = fs.readFileSync(path.resolve(__dirname, '../../pages/journal-editor/journal-editor.tsx'), 'utf8')
    const editorStyles = fs.readFileSync(path.resolve(__dirname, '../../pages/journal-editor/journal-editor.scss'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')

    expect(component).toContain('polaroid-sit-v2.png')
    expect(component).not.toContain('polaroid-run')
    expect(component).toContain('action-write-v2.png')
    expect(component).toContain('action-photo-v2.png')
    expect(component).toContain('journalDisplayPhotos')
    expect(component).toContain('replaceTodayPhoto')
    // 今日卡上传照片填满白框不留空白（aspectFill），默认邮票 aspectFit；完整照片走大图预览
    expect(component).toContain("mode={featuredPhoto.isDefault ? 'aspectFit' : 'aspectFill'}")
    // 今日运势只属于「日记」tab：纪念日 tab 不显示，不占用公共区域
    expect(component).toContain("{journalTab === 'diary' && (")
    expect(component).toContain('拍照记录')
    expect(component).toContain('查看 >')
    expect(component).toContain('<JournalAnniversaryPanel')
    // 「纪念日」是页内分页 tab（点击原地刷新内容区），不再打开全屏覆盖层
    expect(component).toContain("journalTab === 'anniversary'")
    expect(component).toContain('variant="inline"')
    expect(component).not.toContain('journal-anniv-overlay')
    expect(component).not.toContain('toggleLike')
    expect(component).not.toContain('onShareTitleChange')
    expect(component).not.toContain('openType="share"')
    expect(component).not.toContain('journal-anniversary/journal-anniversary')
    expect(styles).toContain('.journal-today__polaroid')
    expect(styles).toMatch(/\.journal-today__polaroid \{[^}]*width: 280rpx/)
    // 上传照片白框与坐姿邮票屏上可见投影等大（232 内衬 + 10/10/22 边衬，-6° 倾斜后投影 273×242）
    expect(styles).toMatch(/\.journal-today__polaroid:not\(\.journal-today__polaroid--default\) \{[^}]*width: 232rpx/)
    expect(styles).toMatch(/\.journal-today__polaroid:not\(\.journal-today__polaroid--default\) \{[^}]*height: 185rpx/)
    expect(styles).toContain('.miniapp-journal__week-card')
    expect(styles).toMatch(/\.miniapp-journal \{[^}]*background: #fff8ee/)
    expect(styles).not.toContain('linear-gradient(180deg, #fffdf7')
    expect(styles).toMatch(/\.miniapp-journal__week-card \{[^}]*padding: 24rpx 18rpx 16rpx/)
    expect(styles).toMatch(/\.miniapp-journal \{[^}]*--journal-gap: 32rpx/)
    // 小记根节点改为固定全屏层，页面文档流高度归零、真机整页不可拖动
    expect(styles).toMatch(/\.miniapp-journal \{[^}]*position: fixed;/)
    expect(styles).toMatch(/\.miniapp-journal \{[^}]*inset: 0;/)
    expect(styles).toMatch(/\.miniapp-journal \{[^}]*padding: 4px 28px 226px;/)
    expect(styles).toMatch(/\.miniapp-journal__title \{[^}]*text-align: left;/)
    expect(styles).toMatch(/\.miniapp-journal__tabs \{[^}]*justify-content: center;/)
    expect(styles).toMatch(/\.journal-today__action-art \{[^}]*width: 112rpx/)
    expect(styles).toMatch(/\.journal-today \{[^}]*padding: 24rpx 22rpx 18rpx/)
    expect(styles).toMatch(/\.journal-today__stage \{[^}]*height: 292rpx/)
    expect(styles).not.toMatch(/\.journal-today \{[^}]*flex: 1/)
    expect(styles).toMatch(/\.miniapp-journal__fortune \{[^}]*padding: 22rpx 24rpx/)
    expect(styles).toMatch(/\.miniapp-journal__fortune \{[^}]*margin-bottom: 24rpx/)
    expect(styles).not.toMatch(/\.miniapp-journal__fortune \{[^}]*margin-top: auto/)
    expect(component).not.toContain('scrollY')
    expect(styles).toMatch(/\.journal-today__text \{[^}]*-webkit-line-clamp: 6/)
    expect(styles).toMatch(/\.journal-today__title \{[^}]*-webkit-line-clamp: 1/)
    expect(styles).toMatch(/\.journal-today__snippet \{[^}]*overflow: hidden/)
    expect(styles).toContain('word-break: break-all')
    expect(component).toContain('<JournalEditorForm')
    expect(component).not.toContain('journal-editor/journal-editor')
    expect(fs.readFileSync(path.resolve(__dirname, '../../pages/journal-editor/journal-editor.config.ts'), 'utf8')).toContain('#fff8ee')
    expect(editor).toContain('JournalEditorForm')
    const form = fs.readFileSync(path.resolve(__dirname, 'JournalEditorForm.tsx'), 'utf8')
    const formStyles = fs.readFileSync(path.resolve(__dirname, 'JournalEditorForm.scss'), 'utf8')
    expect(form).toContain('replacePrimaryPhoto')
    expect(form).toContain('editor-yard.jpg')
    expect(form).toContain('moods/mood-1-v7.png')
    expect(form).toContain('moods/mood-2-v7.png')
    expect(form).toContain('moods/mood-3-v7.png')
    expect(form).toContain('moods/mood-4-v7.png')
    expect(form).toContain('journal-editor__moods')
    expect(form).toContain('chooseMood')
    expect(form).not.toContain('pickMood')
    expect(form).toContain('写日记')
    expect(form).toContain('天气')
    expect(form).toContain('心情')
    expect(form).toContain('相册')
    expect(form).toContain('地点')
    expect(form).not.toContain('puppy-cushion.png')
    expect(formStyles).toContain('.journal-editor__yard')
    expect(formStyles).toContain('.journal-editor__card')
    expect(formStyles).toContain('.journal-editor__nav')
    expect(formStyles).toContain('.journal-editor__toolbar')
    expect(formStyles).toContain('.journal-editor__moods')
    expect(formStyles).toMatch(/\.journal-editor-overlay \{[^}]*overflow: hidden/)
    expect(formStyles).toMatch(/\.journal-editor__body \{[^}]*flex: 1/)
    expect(formStyles).toMatch(/\.journal-editor-page \{[^}]*padding: 0 28rpx 330rpx/)
    expect(formStyles).toMatch(/\.journal-editor__yard \{[^}]*bottom: -85rpx/)
    expect(formStyles).toMatch(/\.journal-editor__mood-image \{[^}]*width: 120rpx/)
    // 上传照片白框与奔跑邮票屏上可见投影等大（239 内衬 + 14/14/20 边衬，+6° 倾斜后投影 293×284）
    expect(formStyles).toMatch(/\.journal-editor__polaroid \{[^}]*width: 300rpx/)
    expect(formStyles).toMatch(/\.journal-editor__polaroid--user \{[^}]*width: 239rpx/)
    expect(formStyles).toMatch(/\.journal-editor__polaroid--user \{[^}]*height: 224rpx/)
    // 写日记主图/缩略图填满裁切展示不留空白（点主图/缩略图仍有全屏预览看完整照片）
    expect(form).toContain("mode={hasUserPhoto ? 'aspectFill' : 'aspectFit'}")
    expect(form).toContain('<Image className="journal-editor__photo" src={item} mode="aspectFill" />')
    // 上传超限时降宽度不降质量：720 仍超限的极繁照片继续回退 540/420
    expect(form).toContain('PHOTO_WIDTHS = [1080, 900, 720, 540, 420]')
    expect(form).toContain('点这里放今天的照片')
    expect(form).toContain('previewImage')
    expect(form).toContain('查看大图')
    expect(form).toContain('stopPropagation')
    expect(form).not.toContain('journal-editor__plus')
    expect(editorStyles).toContain('background: #fff8ee')
    expect(editorStyles).not.toContain('puppy-cushion')
    expect(manifest).toContain('journal/polaroid-run-v2.png')
    expect(manifest).toContain('journal/polaroid-sit-v2.png')
    expect(manifest).toContain('journal/action-photo-v2.png')
    expect(manifest).toContain('journal/action-write-v2.png')
    expect(manifest).toContain('journal/editor-yard.jpg')
    expect(manifest).toContain('moods/mood-1-v7.png')
    expect(manifest).toContain('moods/mood-2-v7.png')
    expect(manifest).toContain('moods/mood-3-v7.png')
    expect(manifest).toContain('moods/mood-4-v7.png')
  })

  it('presents the message tab empty state with an invite illustration and add-friend action', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.tsx'), 'utf8')
    const pageSource = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.tsx'), 'utf8')
    const styles = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.scss'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')

    expect(component).toContain('messages-empty-v2.png')
    expect(component).not.toContain('messages-plant.png')
    expect(component).toContain('hasFriendConversations')
    expect(component).toContain('添加好友并通过后，这里会显示你们的聊天。')
    // 空态卡只保留插画与文案，添加好友入口由顶部质感卡承担（不再重复放按钮）
    expect(component).not.toContain('去添加好友')
    expect(component).toContain('miniapp-messages__action-badge--add')
    expect(component).toContain('miniapp-messages__action-badge--circle')
    // 弹窗与圈层在页面根层级渲染（盖过 tab 栏），消息页只上报开关
    expect(component).toContain("onOverlayChange('addFriend')")
    expect(component).toContain("onOverlayChange('circle')")
    expect(pageSource).toContain('<MiniappAddFriendModal')
    expect(pageSource).toContain('<MiniappCirclePage')
    expect(pageSource).toContain('<MiniappCoRaiseConfirmModal')
    expect(pageSource).toContain("overlay === 'addFriend'")
    expect(pageSource).toContain("overlay === 'circle'")
    expect(component).toContain("mode=\"widthFix\"")
    expect(styles).not.toContain('.miniapp-messages__plant')
    expect(styles).toContain('.miniapp-messages__empty-card')
    expect(styles).toContain('.miniapp-messages__empty-illustration')
    expect(styles).toMatch(/\.miniapp-messages__empty-illustration \{[^}]*width:\s*360px;/)
    expect(styles).toMatch(/\.miniapp-messages__empty-illustration \{[^}]*margin-bottom:\s*20px;/)
    expect(styles).not.toContain('.miniapp-messages__empty-action')
    expect(styles).toMatch(/\.miniapp-messages__action-badge--add \{[^}]*linear-gradient/)
    expect(styles).toMatch(/\.miniapp-messages__action \{[^}]*box-shadow:[^;]*inset/)
    expect(manifest).toContain('messages-empty-v2.png')
    expect(manifest).not.toContain('messages-plant.png')
  })

  it('seeds the message tab from the conversation cache so it skips the empty flash', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.tsx'), 'utf8')
    const cache = fs.readFileSync(path.resolve(__dirname, 'conversationListCache.ts'), 'utf8')
    const indexPage = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.tsx'), 'utf8')

    // tab 重挂载时先读缓存直出会话列表，请求经缓存包装（写入缓存），登出时清缓存防串号
    expect(component).toContain("fetchCachedConversations() ?? []")
    expect(component).toContain("fetchCachedConversations() !== null")
    expect(component).toContain('fetchConversationsWithCache()')
    expect(component).not.toContain('socialApi.listConversations()')
    expect(cache).toContain('export function getCachedConversations')
    expect(cache).toContain('export function clearCachedConversations')
    expect(indexPage).toContain('clearCachedConversations()')
  })

  it('shows the full puppy head in every circular pet avatar frame', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.tsx'), 'utf8')
    const circlePage = fs.readFileSync(path.resolve(__dirname, 'MiniappCirclePage.tsx'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')
    const avatarStat = fs.statSync(path.resolve(__dirname, '../../assets/xiaoduoli-avatar-v2.png'))

    // 圆形头像框（aspectFill 居中裁切）统一用头部裁切版：全身竖图裁中间落在胸口、脑袋偏下
    expect(component).toContain("require('../../assets/xiaoduoli-avatar-v2.png')")
    expect(circlePage).toContain("require('../../assets/xiaoduoli-avatar-v2.png')")
    // 整狗展示场景（状态卡/登录加载/五子棋/箱中站立）仍用全身图（状态卡经衣柜立绘组件取默认全身图）
    expect(fs.readFileSync(path.resolve(__dirname, '../../components/PetStatusCard.tsx'), 'utf8'))
      .toContain('MiniappOutfitPortrait')
    expect(fs.readFileSync(path.resolve(__dirname, '../../services/wardrobeSuitAssets.ts'), 'utf8'))
      .toContain("require('../assets/xiaoduoli.png')")
    expect(fs.readFileSync(path.resolve(__dirname, 'XiaoduoliBoxScene.tsx'), 'utf8'))
      .toContain("require('../../assets/xiaoduoli.png')")
    expect(manifest).toContain('xiaoduoli-avatar-v2.png')
    expect(avatarStat.size).toBeLessThan(80 * 1024)
  })

  it('labels friend senders in shared rooms and keeps a single room entry list', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.tsx'), 'utf8')
    const indexPage = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.tsx'), 'utf8')

    expect(component).toContain('getMessagePresentation')
    expect(component).toContain('viewerId')
    expect(component).toContain('friendName')
    // 有好友时不再渲染与会话列表重复的“共享房间”入口
    expect(component).not.toContain('共享房间')
    expect(indexPage).toContain('viewerId={context?.user.id')
  })

  it('drops the pet quick-reply button from the chat composer and legacy room page', () => {
    const component = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.tsx'), 'utf8')
    const roomPage = fs.readFileSync(path.resolve(__dirname, '../../pages/room/room.tsx'), 'utf8')

    // 聊天输入区与旧房间页都不再提供「叫小多利说句话」快捷按钮
    expect(component).not.toContain('叫小多利说句话')
    expect(component).not.toContain('miniapp-chat__quick')
    expect(component).not.toContain('requestPetReply')
    expect(roomPage).not.toContain('叫小多利说句话')
    expect(roomPage).not.toContain('requestPetReply')
  })

  it('drops the tab page captions and keeps inner card captions period-free', () => {
    const nestView = fs.readFileSync(path.resolve(__dirname, 'MiniappNestView.tsx'), 'utf8')
    const journalView = fs.readFileSync(path.resolve(__dirname, 'MiniappJournalView.tsx'), 'utf8')
    const meView = fs.readFileSync(path.resolve(__dirname, 'MiniappMeView.tsx'), 'utf8')
    const anniversaryPanel = fs.readFileSync(path.resolve(__dirname, 'JournalAnniversaryPanel.tsx'), 'utf8')

    // tab 页标题下的介绍文案已全部移除（见 miniappMainLayout 同名约定）
    expect(nestView).not.toContain('记录你们和小多利的共同生活')
    expect(nestView).not.toContain('记录你和小多利的共同生活')
    expect(journalView).not.toContain('记录和小多利的每一天')
    expect(meView).not.toContain('管理你的资料和偏好')
    expect(anniversaryPanel).toContain('把重要的日子记下来')
    expect(anniversaryPanel).not.toContain('记下来。')
  })

  it('nudges the tab label above its resting position', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, '../../components/MiniappTabBar.scss'), 'utf8')

    expect(styles).toMatch(/\.miniapp-tab \{[\s\S]*?padding: 2rpx 0 0;/)
    expect(styles).toMatch(/\.miniapp-tab \{[\s\S]*?\.miniapp-tab__icon[\s\S]*?margin-bottom: -4rpx;/)
  })

  it('aligns the bottom clearance of every fixed tab layer at 238px', () => {
    const messagesStyles = fs.readFileSync(path.resolve(__dirname, 'MiniappMessagesView.scss'), 'utf8')
    const meStyles = fs.readFileSync(path.resolve(__dirname, 'MiniappMeView.scss'), 'utf8')
    const nestStyles = fs.readFileSync(path.resolve(__dirname, 'MiniappNestView.scss'), 'utf8')

    // 消息/我的/锁定信件层的底部净空统一 238px（与小记 226px + 12px 一致），不再紧贴底栏
    expect(messagesStyles).toMatch(/\.miniapp-messages \{[^}]*padding: 0 34px 238px;/)
    expect(meStyles).toMatch(/\.miniapp-me \{[^}]*padding: 0 46px 238px;/)
    expect(nestStyles).toMatch(/\.nest-lock-layer \{[^}]*padding: 4px 32px 238px;/)
  })

  it('tightens the nest letter footer spacing toward the invite button', () => {
    const letterStyles = fs.readFileSync(path.resolve(__dirname, 'MiniappNestLetter.scss'), 'utf8')
    const indexStyles = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.scss'), 'utf8')

    // 信封提示与信纸、与邀请按钮之间的间距各收窄一点
    expect(letterStyles).toMatch(/\.nest-letter \{[^}]*gap: 0;/)
    expect(letterStyles).toMatch(/\.nest-letter__preview \{[^}]*margin-top: 12rpx;/)
    expect(indexStyles).toMatch(/\.share-button \{[^}]*margin-top: 20px;/)
  })

  it('adds and removes test friends from the hidden gm tools entry', () => {
    const meView = fs.readFileSync(meViewPath, 'utf8')

    expect(meView).toContain('gmApi.addFriends')
    expect(meView).toContain('gmApi.removeFriends')
    expect(meView).toContain('删除测试好友')
    expect(meView).toContain('onDataChanged?.()')
  })

  it('shows a locked box scene and unlock button after a friend accepts the invitation', () => {
    const nestView = fs.readFileSync(path.resolve(__dirname, 'MiniappNestView.tsx'), 'utf8')
    const scene = fs.readFileSync(path.resolve(__dirname, 'XiaoduoliBoxScene.tsx'), 'utf8')
    const styles = fs.readFileSync(path.resolve(__dirname, 'XiaoduoliBoxScene.scss'), 'utf8')
    const indexPage = fs.readFileSync(path.resolve(__dirname, '../../pages/index/index.tsx'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')

    expect(nestView).toContain('<MiniappNestLetter')
    // 锁定/空状态信件场景渲染进固定全屏层，避免真机整页滚动
    expect(nestView).toContain('shouldLockNestPageScroll(sceneMode)')
    expect(nestView).toContain('nest-lock-layer')
    // 小窝顶部不再展示好友名芯片行
    expect(nestView).not.toContain('miniapp-nest__rooms')
    expect(nestView).not.toContain('miniapp-room-chip')
    expect(nestView).not.toContain('onSelectRoom')
    expect(indexPage).toContain('getNestActionButton')
    expect(indexPage).toContain("nestAction.kind === 'unlock'")
    expect(scene).not.toContain('UNLOCK_BUTTON_LABEL')
    expect(scene).not.toContain('room-background.jpg')
    expect(scene).toContain('xiaoduoli-box.png')
    expect(scene).toContain('xiaoduoli-body.png')
    expect(scene).toContain('xiaoduoli-eyes.png')
    expect(scene).toContain('useXiaoduoliIdleBehavior')
    expect(scene).not.toContain('xiaoduoli-peek.png')
    expect(scene).not.toContain('xiaoduoli-box-idle.png')
    expect(scene).not.toContain('xiaoduoli-box-front.png')
    expect(scene).not.toContain('xiaoduoli-box-body.png')
    expect(scene).not.toContain('xiaoduoli-idle-00.png')
    expect(scene).not.toContain('getBoxIdleFrameIndex')
    expect(scene).toContain('createUnlockEffects')
    expect(styles).toContain('@keyframes xiaoduoli-breathe')
    expect(styles).toContain('@keyframes xiaoduoli-bob')
    expect(styles).toContain('@keyframes xiaoduoli-hop')
    expect(styles).toContain('@keyframes xiaoduoli-jump')
    expect(styles).toContain('@keyframes xiaoduoli-ribbon')
    expect(styles).not.toContain('@keyframes xiaoduoli-peek')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(manifest).toContain('nest/xiaoduoli-box.png')
    expect(manifest).toContain('nest/xiaoduoli-body.png')
    expect(manifest).toContain('nest/xiaoduoli-eyes.png')
    expect(manifest).not.toContain('nest/xiaoduoli-peek.png')
    expect(manifest).toContain('design-assets/nest/xiaoduoli-peek-source.png')
    expect(manifest).not.toContain('nest/xiaoduoli-box-idle.png')
    expect(manifest).not.toContain('nest/xiaoduoli-box-front.png')
    expect(manifest).not.toContain('nest/xiaoduoli-idle-00.png')
  })

  it('backdrops the locked box scene with the night-street illustration', () => {
    const scene = fs.readFileSync(path.resolve(__dirname, 'XiaoduoliBoxScene.tsx'), 'utf8')
    const styles = fs.readFileSync(path.resolve(__dirname, 'XiaoduoliBoxScene.scss'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')
    const streetAssetPath = path.resolve(__dirname, '../../assets/nest/xiaoduoli-street-v13.png')
    const singleAssetBudget = 180 * 1024

    expect(scene).toContain('xiaoduoli-street-v13.png')
    expect(scene).toContain('xiaoduoli-box__street')
    expect(scene).toMatch(/xiaoduoli-box__street" src=\{streetImage\} mode="aspectFill"/)
    expect(styles).toMatch(/\.xiaoduoli-box__street \{[^}]*z-index: 0;/)
    expect(manifest).toContain('nest/xiaoduoli-street-v13.png')
    expect(manifest).toContain('design-assets/nest/xiaoduoli-street-source.png')
    expect(fs.statSync(streetAssetPath).size).toBeLessThan(singleAssetBudget)
  })

  it('drives the idle performance from the shared behavior timeline durations', () => {
    const styles = fs.readFileSync(path.resolve(__dirname, 'XiaoduoliBoxScene.scss'), 'utf8')
    const hook = fs.readFileSync(path.resolve(__dirname, 'useXiaoduoliIdleBehavior.ts'), 'utf8')

    expect(hook).toContain('nextXiaoduoliStep')
    expect(styles).toContain(`xiaoduoli-eye-squash ${XIAODUOLI_BLINK_MS}ms ease-in-out both;`)
    expect(styles).toContain(`xiaoduoli-eye-squash ${XIAODUOLI_DOUBLE_BLINK_MS / 2}ms ease-in-out both 2;`)
    expect(styles).toContain(`xiaoduoli-glance-left ${XIAODUOLI_GLANCE_MS}ms ease-in-out both;`)
    expect(styles).toContain(`xiaoduoli-glance-right ${XIAODUOLI_GLANCE_MS}ms ease-in-out both;`)
    expect(styles).toContain(`xiaoduoli-look-left ${XIAODUOLI_LOOK_MS}ms ease-in-out both;`)
    expect(styles).toContain(`xiaoduoli-look-right ${XIAODUOLI_LOOK_MS}ms ease-in-out both;`)
    expect(styles).toContain(`xiaoduoli-hop ${XIAODUOLI_HOP_MS}ms ease-in-out both;`)
    expect(styles).toContain("@import './xiaoduoli-box-parts.generated.scss'")
    expect(styles).toMatch(/\.xiaoduoli-box__underlay,[^}]*\.xiaoduoli-box__eyes,[^}]*\.xiaoduoli-box__pupils \{[^}]*left: 0;/s)
    expect(styles).toMatch(/\.xiaoduoli-box__underlay,[^}]*\.xiaoduoli-box__eyes,[^}]*\.xiaoduoli-box__pupils \{[^}]*width: 192rpx;/s)
    expect(styles).toContain('translateX(-1.3%)')
    expect(styles).toContain('translateX(1.3%)')
    expect(styles).toMatch(/\.xiaoduoli-box__puppet \{[^}]*width: 192rpx;/)
  })

  it('builds the box-scene eye rig layers from the original peek artwork', () => {
    const report = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../tools/xiaoduoli-parts.report.json'), 'utf8'),
    )
    const generatedScss = fs.readFileSync(path.resolve(__dirname, 'xiaoduoli-box-parts.generated.scss'), 'utf8')
    const manifest = fs.readFileSync(path.resolve(__dirname, '../../../../docs/assets/asset-manifest.json'), 'utf8')
    const singleAssetBudget = 180 * 1024

    expect(report.source).toContain('xiaoduoli-peek-source.png')
    expect(report.canvas).toEqual({ width: 446, height: 314 })
    expect(report.parts.body.bytes).toBeLessThan(singleAssetBudget)
    expect(report.parts.eyes.bytes).toBeLessThan(singleAssetBudget)
    expect(report.parts.pupils.bytes).toBeLessThan(singleAssetBudget)
    expect(report.parts.underlay.bytes).toBeLessThan(singleAssetBudget)
    expect(generatedScss).toContain(`transform-origin: 50% ${report.generated.pupilsOriginYPct}%;`)
    expect(manifest).toContain('nest/xiaoduoli-pupils.png')
    expect(manifest).toContain('nest/xiaoduoli-underlay.png')
  })
})
