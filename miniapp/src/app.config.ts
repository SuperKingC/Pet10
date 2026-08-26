export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/invite/invite',
    'pages/pet/pet',
    'pages/room/room',
    'pages/settings/settings',
    'pages/journal-anniversary/journal-anniversary',
    'pages/journal-editor/journal-editor',
  ],
  window: {
    navigationBarTitleText: '小多利宠物伙伴',
    navigationBarBackgroundColor: '#fff8ee',
    navigationBarTextStyle: 'black',
    backgroundColor: '#fff8ee',
  },
  lazyCodeLoading: 'requiredComponents',
})
