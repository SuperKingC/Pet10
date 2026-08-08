export function mountFortuneHistory(onBack: () => void): () => void {
  window.history.pushState({ pet10Fortune: true }, '')
  const handlePopState = () => onBack()
  window.addEventListener('popstate', handlePopState)
  return () => {
    window.removeEventListener('popstate', handlePopState)
    if (window.history.state?.pet10Fortune) window.history.replaceState(null, '')
  }
}
