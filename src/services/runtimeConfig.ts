export const runtimeConfig = {
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, ''),
  demoRoomId: import.meta.env.VITE_DEMO_ROOM_ID || 'room-demo'
}
