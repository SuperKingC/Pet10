import { Router } from 'express'

// 浏览器可直接打开的生图测试页（/image-playground）。页面本身不含任何密钥，
// 邀请码由使用者自行填写，仅保存在浏览器 localStorage；API 调用与本站同源。
const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pet10 生图测试台</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 24px auto; padding: 0 16px; line-height: 1.6; color: #1f2937; }
  h1 { font-size: 20px; }
  label { display: block; margin: 14px 0 4px; font-weight: 600; font-size: 14px; }
  textarea, input[type=text], input[type=password], select { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #bbb; border-radius: 6px; font: inherit; background: #fff; color: #1f2937; }
  .row { display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 400; margin-top: 8px; }
  button { margin-top: 16px; padding: 10px 28px; border: 0; border-radius: 8px; background: #d97706; color: #fff; font-size: 15px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: wait; }
  .hint { color: #6b7280; font-size: 12px; }
  .status { margin-top: 16px; padding: 10px 12px; border-radius: 6px; font-size: 14px; display: none; }
  .status.error { background: #fee2e2; color: #991b1b; }
  .status.info { background: #fef3c7; color: #92400e; }
  .result { margin-top: 16px; }
  .result img { max-width: 100%; border-radius: 8px; }
  .thumbs img { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; margin-right: 6px; }
</style>
</head>
<body>
<h1>Pet10 生图测试台</h1>
<p class="hint">直接调用本站 <code>POST /api/images/generations</code>，模型固定 openai/gpt-5.4-image-2。邀请码只保存在你自己的浏览器里。</p>
<label for="invite">邀请码</label>
<input type="password" id="invite" autocomplete="off" placeholder="IMAGE_INVITE_CODE">
<label class="row"><input type="checkbox" id="remember"> 在这台设备上记住邀请码（localStorage）</label>
<label for="prompt">提示词</label>
<textarea id="prompt" rows="3" placeholder="例如：一只小狗在草地上奔跑，水彩风格"></textarea>
<label for="size">尺寸</label>
<select id="size">
  <option value="1024x1024">正方形 1024×1024</option>
  <option value="1024x1536">竖版 1024×1536（2:3）</option>
  <option value="1536x1024">横版 1536×1024（3:2）</option>
</select>
<label for="refs">参考图（可选，最多 2 张，单张 ≤ 2MB，jpg/png/webp）</label>
<input type="file" id="refs" accept="image/jpeg,image/png,image/webp" multiple>
<div class="thumbs" id="thumbs"></div>
<button id="go">生成</button>
<div class="status" id="status"></div>
<div class="result" id="result"></div>
<p class="hint">限额：每分钟 3 次、每天 30 次（邀请码错误的尝试也计入）。生成一张通常需要 1~2 分钟。</p>
<script>
var REMEMBER_KEY = 'image-playground-invite'
var inviteInput = document.getElementById('invite')
var rememberInput = document.getElementById('remember')
var promptInput = document.getElementById('prompt')
var sizeInput = document.getElementById('size')
var refsInput = document.getElementById('refs')
var thumbsEl = document.getElementById('thumbs')
var goBtn = document.getElementById('go')
var statusEl = document.getElementById('status')
var resultEl = document.getElementById('result')
var ERRORS = {
  invalid_invite_code: '邀请码不正确（失败尝试同样计入限额）',
  rate_limit_exceeded: '触发限流：每分钟 3 次 / 每天 30 次，请稍后再试',
  invalid_prompt: '提示词为空或超过 4000 字符',
  invalid_reference_images: '参考图最多 2 张',
  invalid_reference_image: '参考图格式不支持，只接受 jpg/png/webp',
  invalid_reference_image_size: '参考图超过 2MB',
  invalid_model: '不支持的模型',
  invalid_size: '不支持的尺寸',
  invalid_n: '数量只支持 1',
  image_generation_unavailable: '上游生图服务暂不可用，请稍后重试'
}

function show(kind, text) {
  statusEl.className = 'status ' + kind
  statusEl.textContent = text
  statusEl.style.display = 'block'
}

var savedInvite = localStorage.getItem(REMEMBER_KEY)
if (savedInvite) { inviteInput.value = savedInvite; rememberInput.checked = true }

var refs = []
refsInput.addEventListener('change', function (event) {
  refs = []
  thumbsEl.textContent = ''
  var files = Array.prototype.slice.call(event.target.files).slice(0, 2)
  files.forEach(function (file) {
    if (file.size > 2 * 1024 * 1024) { show('error', '参考图 ' + file.name + ' 超过 2MB'); return }
    var reader = new FileReader()
    reader.onload = function () {
      refs.push(String(reader.result))
      var img = document.createElement('img')
      img.src = String(reader.result)
      img.alt = file.name
      thumbsEl.appendChild(img)
    }
    reader.readAsDataURL(file)
  })
})

goBtn.addEventListener('click', function () {
  var invite = inviteInput.value.trim()
  var prompt = promptInput.value.trim()
  resultEl.textContent = ''
  if (rememberInput.checked) localStorage.setItem(REMEMBER_KEY, invite)
  else localStorage.removeItem(REMEMBER_KEY)
  if (!invite) { show('error', '请填写邀请码'); return }
  if (!prompt) { show('error', '请填写提示词'); return }
  goBtn.disabled = true
  var startedAt = Date.now()
  show('info', '生成中…')
  var timer = setInterval(function () {
    show('info', '生成中… 已等待 ' + Math.round((Date.now() - startedAt) / 1000) + ' 秒（通常 1~2 分钟）')
  }, 500)
  fetch('/api/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + invite },
    body: JSON.stringify({ prompt: prompt, size: sizeInput.value, referenceImages: refs.length ? refs : undefined })
  }).then(function (response) {
    return response.json().catch(function () { return {} }).then(function (payload) {
      clearInterval(timer)
      goBtn.disabled = false
      if (!response.ok) {
        var text = ERRORS[payload.error] || payload.error || '未知错误'
        show('error', '失败（HTTP ' + response.status + '）：' + text)
        return
      }
      var image = (payload.data || [])[0]
      if (!image) { show('error', '响应里没有图片'); return }
      var img = document.createElement('img')
      img.src = image.b64_json ? 'data:image/png;base64,' + image.b64_json : image.url
      img.alt = '生成结果'
      resultEl.appendChild(img)
      var seconds = payload.durationMs != null ? Math.round(payload.durationMs / 1000) : null
      show('info', '生成完成' + (seconds ? '，耗时 ' + seconds + ' 秒' : ''))
    })
  }).catch(function (error) {
    clearInterval(timer)
    goBtn.disabled = false
    show('error', '请求失败：' + (error && error.message ? error.message : '网络错误'))
  })
})
</script>
</body>
</html>
`

export function createImagePlaygroundRoutes() {
  const router = Router()
  router.get('/', (_request, response) => {
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.setHeader('x-robots-tag', 'noindex')
    response.send(PAGE)
  })
  return router
}
