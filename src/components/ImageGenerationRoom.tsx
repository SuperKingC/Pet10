import { useState } from 'react'

type ImageResult = { data?: Array<{ url?: string; b64_json?: string }> }

async function readImageResponse(response: Response): Promise<ImageResult & { error?: string }> {
  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (!contentType.includes('application/json')) {
    throw new Error(response.status === 404
      ? '生图接口尚未部署，请更新并重启 API 服务'
      : '服务器返回了异常响应，请稍后再试')
  }
  try {
    return JSON.parse(text) as ImageResult & { error?: string }
  } catch {
    throw new Error('服务器返回的数据格式不正确')
  }
}

export function ImageGenerationRoom() {
  const [invite, setInvite] = useState(() => sessionStorage.getItem('pet10_image_invite') ?? '')
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('1024x1024')
  const [result, setResult] = useState<ImageResult>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    setError('')
    setResult(undefined)
    if (!invite.trim()) return setError('请输入邀请码')
    if (!prompt.trim()) return setError('请输入图片描述')
    setLoading(true)
    sessionStorage.setItem('pet10_image_invite', invite.trim())
    try {
      const response = await fetch('/api/images/generations', { method: 'POST', headers: { authorization: `Bearer ${invite.trim()}`, 'content-type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim(), model: 'openai/gpt-5.4-image-2', size, n: 1 }) })
      const payload = await readImageResponse(response)
      if (!response.ok) throw new Error(payload.error === 'rate_limit_exceeded' ? '请求太频繁，请稍后再试' : payload.error === 'invalid_invite_code' ? '邀请码不正确' : '生成失败，请稍后再试')
      setResult(payload)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败')
    } finally { setLoading(false) }
  }

  const item = result?.data?.[0]
  const src = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '')
  return <main className="image-room"><div className="image-room__intro"><p className="eyebrow">PET10 IMAGE ROOM</p><h1>把想象变成一张图</h1><p>输入邀请码，写下画面。生成结果只属于这次创作。</p></div><section className="image-room__panel"><label>共享邀请码<input type="password" value={invite} onChange={(event) => setInvite(event.target.value)} autoComplete="off" /></label><label>图片描述<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4000} placeholder="例如：雨后的东京街角，一只橘猫站在透明伞下，电影感摄影" /></label><label>画布比例<select value={size} onChange={(event) => setSize(event.target.value)}><option value="1024x1024">正方形 1024 × 1024</option><option value="1024x1536">竖版 1024 × 1536</option><option value="1536x1024">横版 1536 × 1024</option></select></label><button className="image-room__submit" type="button" onClick={() => void generate()} disabled={loading}>{loading ? '正在生成…' : '生成图片'}</button>{error && <p className="image-room__error" role="alert">{error}</p>}</section>{src && <section className="image-room__result"><img src={src} alt={prompt} /><a href={src} download="pet10-generated.png">下载图片</a></section>}</main>
}
