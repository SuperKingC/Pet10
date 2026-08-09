import { useRef, useState } from 'react'
import './ImageGenerationRoom.css'

type ImageResult = { data?: Array<{ url?: string; b64_json?: string }> }
type ReferenceImage = { name: string; dataUrl: string; bytes: number }

const MAX_REFERENCE_BYTES = 2 * 1024 * 1024

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
}

async function prepareReferenceImage(file: File): Promise<ReferenceImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('只支持 JPEG、PNG 或 WebP 图片')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('浏览器无法处理这张图片')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  let quality = 0.9
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrlBytes(dataUrl) > MAX_REFERENCE_BYTES && quality > 0.4) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  const bytes = dataUrlBytes(dataUrl)
  if (bytes > MAX_REFERENCE_BYTES) throw new Error('图片压缩后仍超过 2 MB，请换一张较小的图片')
  return { name: file.name, dataUrl, bytes }
}

async function readImageResponse(response: Response): Promise<ImageResult & { error?: string }> {
  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (!contentType.includes('application/json')) throw new Error(response.status === 404 ? '生图接口尚未部署，请更新并重启 API 服务' : '服务器返回了异常响应，请稍后再试')
  try { return JSON.parse(text) as ImageResult & { error?: string } } catch { throw new Error('服务器返回的数据格式不正确') }
}

export function ImageGenerationRoom() {
  const [invite, setInvite] = useState(() => sessionStorage.getItem('pet10_image_invite') ?? '')
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [result, setResult] = useState<ImageResult>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [references, setReferences] = useState<ReferenceImage[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  async function addReferences(files: FileList | null) {
    if (!files) return
    setError('')
    const available = 2 - references.length
    if (available <= 0) return setError('最多上传 2 张参考图')
    try {
      const prepared = await Promise.all(Array.from(files).slice(0, available).map(prepareReferenceImage))
      setReferences(current => [...current, ...prepared].slice(0, 2))
    } catch (referenceError) {
      setError(referenceError instanceof Error ? referenceError.message : '参考图处理失败')
    }
  }

  async function generate() {
    setError('')
    setResult(undefined)
    if (!invite.trim()) return setError('请输入邀请码')
    if (!prompt.trim()) return setError('请输入图片描述')
    setLoading(true)
    sessionStorage.setItem('pet10_image_invite', invite.trim())
    try {
      const response = await fetch('/api/images/generations', { method: 'POST', headers: { authorization: `Bearer ${invite.trim()}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim(), model: 'openai/gpt-5.4-image-2', size, n: 1, referenceImages: references.map(reference => reference.dataUrl) }) })
      const payload = await readImageResponse(response)
      if (!response.ok) throw new Error(payload.error === 'rate_limit_exceeded' ? '请求太频繁，请稍后再试' : payload.error === 'invalid_invite_code' ? '邀请码不正确' : payload.error?.startsWith('invalid_reference') ? '参考图片不符合要求' : '生成失败，请稍后再试')
      setResult(payload)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败')
    } finally { setLoading(false) }
  }

  const item = result?.data?.[0]
  const src = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '')
  return <main className="image-room"><div className="image-room__intro"><p className="eyebrow">PET10 IMAGE ROOM</p><h1>把想象变成一张图</h1><p>输入邀请码，写下画面，也可以加入参考图片。</p></div><section className="image-room__panel"><label>共享邀请码<input type="password" value={invite} onChange={event => setInvite(event.target.value)} autoComplete="off" /></label><label>图片描述<textarea value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={4000} placeholder="例如：保留参考图主体，把背景改成雨夜街道，电影感摄影" /></label><div className="image-room__references"><div className="image-room__field-title">参考图片 <span>{references.length}/2</span></div><div className="image-room__reference-grid">{references.map((reference, index) => <div className="image-room__reference" key={`${reference.name}-${index}`}><img src={reference.dataUrl} alt={`参考图 ${index + 1}`} /><button type="button" aria-label={`删除参考图 ${index + 1}`} onClick={() => setReferences(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button><small>{(reference.bytes / 1024 / 1024).toFixed(1)} MB</small></div>)}{references.length < 2 && <button className="image-room__add-reference" type="button" onClick={() => fileInput.current?.click()}>＋<span>添加图片</span></button>}</div><input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => { void addReferences(event.target.files); event.target.value = '' }} /></div><label>画布比例<select value={size} onChange={event => setSize(event.target.value)}><option value="1024x1024">正方形 1024 × 1024</option><option value="1024x1536">竖版 1024 × 1536</option><option value="1536x1024">横版 1536 × 1024</option></select></label><button className="image-room__submit" type="button" onClick={() => void generate()} disabled={loading}>{loading ? '正在生成…' : '生成图片'}</button>{error && <p className="image-room__error" role="alert">{error}</p>}</section>{src && <section className="image-room__result"><img src={src} alt={prompt} /><a href={src} download="pet10-generated.png">下载图片</a></section>}</main>
}
