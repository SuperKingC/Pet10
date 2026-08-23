import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { requestImageGeneration, type ImageGenerationResponse as ImageResult } from '../services/imageGenerationApi'
import { readStoredImageInvite, storeImageInvite } from '../services/imageGenerationSession'
import { prepareReferenceImage, type ReferenceImage } from '../services/imageReference'
import './ImageGenerationRoom.css'

function seconds(durationMs: number) {
  return `${(durationMs / 1000).toFixed(1)} 秒`
}

function generationErrorMessage(payload: ImageResult, fallbackDurationMs: number) {
  const duration = seconds(payload.durationMs ?? fallbackDurationMs)
  if (payload.error === 'rate_limit_exceeded') return `请求太频繁，请稍后再试（耗时 ${duration}）`
  if (payload.error === 'invalid_invite_code') return `邀请码不正确（耗时 ${duration}）`
  if (payload.error?.startsWith('invalid_reference')) return `参考图片不符合要求（耗时 ${duration}）`
  const code = payload.upstreamCode === undefined ? '' : `（错误码 ${payload.upstreamCode}）`
  const requestId = payload.requestId ? `，请求 ID：${payload.requestId}` : ''
  return `图片服务失败${code}，耗时 ${duration}${requestId}`
}

export function ImageGenerationRoom() {
  const [invite, setInvite] = useState(readStoredImageInvite)
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [result, setResult] = useState<ImageResult>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [references, setReferences] = useState<ReferenceImage[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  async function addReferenceFiles(files: readonly File[]) {
    setError('')
    const available = 2 - references.length
    if (available <= 0) return setError('最多上传 2 张参考图')
    const images = files.filter(file => file.type.startsWith('image/'))
    if (images.length === 0) return setError('请添加 JPEG、PNG 或 WebP 图片')
    try {
      const prepared = await Promise.all(images.slice(0, available).map(prepareReferenceImage))
      setReferences(current => [...current, ...prepared].slice(0, 2))
      if (images.length > available) setError('最多上传 2 张参考图')
    } catch (referenceError) {
      setError(referenceError instanceof Error ? referenceError.message : '参考图处理失败')
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(event.clipboardData.items)
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null)
    if (images.length === 0) return
    event.preventDefault()
    void addReferenceFiles(images)
  }

  function handleDrag(event: DragEvent<HTMLDivElement>, active: boolean) {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    setDragging(active)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void addReferenceFiles(Array.from(event.dataTransfer.files))
  }

  async function generate() {
    setError('')
    setSuccess('')
    setResult(undefined)
    if (!invite.trim()) return setError('请输入邀请码')
    if (!prompt.trim()) return setError('请输入图片描述')
    setLoading(true)
    storeImageInvite(invite)
    const startedAt = performance.now()
    try {
      const payload = await requestImageGeneration({
        invite: invite.trim(),
        prompt: prompt.trim(),
        size,
        referenceImages: references.map(reference => reference.dataUrl),
      })
      const fallbackDurationMs = Math.round(performance.now() - startedAt)
      if (payload.error) throw new Error(generationErrorMessage(payload, fallbackDurationMs))
      setResult(payload)
      setSuccess(`生成完成，耗时 ${seconds(payload.durationMs ?? fallbackDurationMs)}`)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const item = result?.data?.[0]
  const src = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '')

  return (
    <main className="image-room">
      <div className="image-room__intro">
        <p className="eyebrow">PET10 IMAGE ROOM</p>
        <h1>把想象变成一张图</h1>
        <p>输入邀请码，写下画面，也可以加入参考图片。</p>
      </div>
      <section className="image-room__panel">
        <label>
          共享邀请码
          <input type="password" value={invite} onChange={event => setInvite(event.target.value)} autoComplete="off" />
        </label>
        <label>
          图片描述
          <textarea
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            onPaste={handlePaste}
            maxLength={4000}
            placeholder="例如：保留参考图主体，把背景改成雨夜街道，电影感摄影"
          />
        </label>
        <div
          className={`image-room__references${dragging ? ' image-room__references--dragging' : ''}`}
          onDragEnter={event => handleDrag(event, true)}
          onDragOver={event => handleDrag(event, true)}
          onDragLeave={event => handleDrag(event, false)}
          onDrop={handleDrop}
        >
          <div className="image-room__field-title">
            参考图片 <span>{references.length}/2</span>
          </div>
          <p className="image-room__reference-hint">可点击添加、粘贴到描述框，或拖动图片到这里</p>
          <div className="image-room__reference-grid">
            {references.map((reference, index) => (
              <div className="image-room__reference" key={`${reference.name}-${index}`}>
                <img src={reference.dataUrl} alt={`参考图 ${index + 1}`} />
                <button type="button" aria-label={`删除参考图 ${index + 1}`} onClick={() => setReferences(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
                <small>{(reference.bytes / 1024 / 1024).toFixed(1)} MB</small>
              </div>
            ))}
            {references.length < 2 && (
              <button className="image-room__add-reference" type="button" onClick={() => fileInput.current?.click()}>
                ＋<span>添加图片</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={event => {
              void addReferenceFiles(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
          />
        </div>
        <label>
          画布比例
          <select value={size} onChange={event => setSize(event.target.value)}>
            <option value="1024x1024">正方形 1024 × 1024</option>
            <option value="1024x1536">竖版 1024 × 1536</option>
            <option value="1536x1024">横版 1536 × 1024</option>
          </select>
        </label>
        <button className="image-room__submit" type="button" onClick={() => void generate()} disabled={loading}>{loading ? '正在生成…' : '生成图片'}</button>
        {error && <p className="image-room__error" role="alert">{error}</p>}
        {success && <p className="image-room__success" role="status">{success}</p>}
      </section>
      {src && (
        <section className="image-room__result">
          <img src={src} alt={prompt} />
          <a href={src} download="pet10-generated.png">下载图片</a>
        </section>
      )}
    </main>
  )
}
