export function formatTarotDownloadTitle(progress: number): string {
  return `资源下载中...(${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%)`
}
