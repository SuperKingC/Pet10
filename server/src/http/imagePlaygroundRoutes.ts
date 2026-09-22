import { Router } from 'express'

// 浏览器可直接打开的生图/生视频测试页（/image-playground）。页面本身不含任何密钥，
// 邀请码由使用者自行填写，仅保存在浏览器 localStorage；API 调用与本站同源。
// 提交走 /api/images/tasks（提交即返回，任务在后台并行跑，页面轮询进度）。
const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pet10 生图测试台</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; line-height: 1.6; color: #1f2937; }
  h1 { font-size: 20px; }
  label { display: block; margin: 14px 0 4px; font-weight: 600; font-size: 14px; }
  textarea, input[type=text], input[type=password], select { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #bbb; border-radius: 6px; font: inherit; background: #fff; color: #1f2937; }
  .row { display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 400; margin-top: 8px; }
  button { margin-top: 16px; padding: 10px 28px; border: 0; border-radius: 8px; background: #d97706; color: #fff; font-size: 15px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: wait; }
  .hint { color: #6b7280; font-size: 12px; }
  .submit-status { margin-top: 12px; padding: 10px 12px; border-radius: 6px; font-size: 14px; display: none; }
  .submit-status.error { background: #fee2e2; color: #991b1b; }
  .submit-status.info { background: #fef3c7; color: #92400e; }
  .task { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
  .task-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-size: 13px; }
  .task-kind { font-size: 16px; }
  .task-model { font-weight: 600; }
  .task-status { color: #6b7280; }
  .task-status.done { color: #166534; }
  .task-status.failed { color: #991b1b; }
  .task-result { margin-top: 10px; }
  .task-result img, .task-result video { max-width: 100%; border-radius: 8px; }
  .task-error { color: #991b1b; font-size: 13px; margin-top: 8px; }
  .thumbs img { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; margin-right: 6px; }
</style>
</head>
<body>
<h1>Pet10 生图测试台</h1>
<p class="hint">提交后任务在后台并行生成，可以一次挂多个任务；模型在本站 <code>/api/images/models</code> 里选择。邀请码只保存在你自己的浏览器里。</p>
<label for="invite">邀请码</label>
<input type="password" id="invite" autocomplete="off" placeholder="IMAGE_INVITE_CODE">
<label class="row"><input type="checkbox" id="remember"> 在这台设备上记住邀请码（localStorage）</label>
<label for="model">模型</label>
<select id="model"></select>
<label for="prompt">提示词</label>
<textarea id="prompt" rows="3" placeholder="例如：一只小狗在草地上奔跑，水彩风格"></textarea>
<div id="size-wrap">
  <label for="size">尺寸</label>
  <select id="size">
    <option value="1024x1024">正方形 1024×1024</option>
    <option value="1024x1536">竖版 1024×1536（2:3）</option>
    <option value="1536x1024">横版 1536×1024（3:2）</option>
  </select>
</div>
<div id="seconds-wrap" style="display:none">
  <label for="seconds">视频时长</label>
  <select id="seconds">
    <option value="4">4 秒</option>
    <option value="8">8 秒</option>
    <option value="12">12 秒</option>
  </select>
</div>
<div id="refs-wrap">
  <label for="refs">参考图（可选，最多 2 张，单张 ≤ 2MB，jpg/png/webp）</label>
  <input type="file" id="refs" accept="image/jpeg,image/png,image/webp" multiple>
  <div class="thumbs" id="thumbs"></div>
</div>
<button id="go">提交任务</button>
<div class="submit-status" id="submit-status"></div>
<div id="tasks"></div>
<p class="hint">限额：每分钟 1 次提交、每天 5 次（邀请码错误等失败尝试同样计入）。图片约 1~3 分钟，视频视上游而定。</p>
<script>
var REMEMBER_KEY = 'image-playground-invite'
var ERRORS = {
  invalid_invite_code: '邀请码不正确（失败尝试同样计入限额）',
  rate_limit_exceeded: '触发限流：每分钟 1 次提交 / 每天 5 次，请稍后再试',
  invalid_prompt: '提示词为空或超过 4000 字符',
  invalid_model: '模型未启用',
  invalid_size: '不支持的尺寸',
  invalid_seconds: '不支持的视频时长（仅 4/8/12 秒）',
  invalid_reference_images: '参考图最多 2 张',
  invalid_reference_image: '参考图格式不支持，只接受 jpg/png/webp',
  invalid_reference_image_size: '参考图超过 2MB',
  task_not_found: '任务不存在或已过期（结果只保留 30 分钟）',
  image_generation_unavailable: '上游生成服务暂不可用，请稍后重试',
  upstream_rejected: '上游拒绝了本次生成',
  upstream_unavailable: '上游暂不可用',
  upstream_invalid_response: '上游响应异常'
}
var inviteInput = document.getElementById('invite')
var rememberInput = document.getElementById('remember')
var modelSelect = document.getElementById('model')
var promptInput = document.getElementById('prompt')
var sizeWrap = document.getElementById('size-wrap')
var secondsWrap = document.getElementById('seconds-wrap')
var refsWrap = document.getElementById('refs-wrap')
var refsInput = document.getElementById('refs')
var thumbsEl = document.getElementById('thumbs')
var goBtn = document.getElementById('go')
var submitStatus = document.getElementById('submit-status')
var tasksEl = document.getElementById('tasks')
var MODELS = []
var running = {}
var refs = []

function showSubmit(kind, text) {
  submitStatus.className = 'submit-status ' + kind
  submitStatus.textContent = text
  submitStatus.style.display = 'block'
}

function currentModel() {
  for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === modelSelect.value) return MODELS[i]
  return null
}

function renderKindFields() {
  var model = currentModel()
  var isVideo = Boolean(model && model.kind === 'video')
  sizeWrap.style.display = isVideo ? 'none' : ''
  secondsWrap.style.display = isVideo ? '' : 'none'
  refsWrap.style.display = isVideo ? 'none' : ''
}

fetch('/api/images/models').then(function (r) { return r.json() }).then(function (payload) {
  MODELS = payload.models || []
  modelSelect.textContent = ''
  MODELS.forEach(function (model) {
    var option = document.createElement('option')
    option.value = model.id
    option.textContent = (model.kind === 'video' ? '[视频] ' : '') + model.label
    modelSelect.appendChild(option)
  })
  renderKindFields()
}).catch(function () {
  modelSelect.textContent = ''
  var option = document.createElement('option')
  option.textContent = '模型目录加载失败'
  modelSelect.appendChild(option)
})

modelSelect.addEventListener('change', renderKindFields)

var savedInvite = localStorage.getItem(REMEMBER_KEY)
if (savedInvite) { inviteInput.value = savedInvite; rememberInput.checked = true }

refsInput.addEventListener('change', function (event) {
  refs = []
  thumbsEl.textContent = ''
  var files = Array.prototype.slice.call(event.target.files).slice(0, 2)
  files.forEach(function (file) {
    if (file.size > 2 * 1024 * 1024) { showSubmit('error', '参考图 ' + file.name + ' 超过 2MB'); return }
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

function createCard(snapshot) {
  var card = document.createElement('div')
  card.className = 'task'
  var head = document.createElement('div')
  head.className = 'task-head'
  var kind = document.createElement('span')
  kind.className = 'task-kind'
  kind.textContent = snapshot.kind === 'video' ? '🎬' : '🖼️'
  var model = document.createElement('span')
  model.className = 'task-model'
  model.textContent = snapshot.model
  var status = document.createElement('span')
  status.className = 'task-status'
  head.appendChild(kind); head.appendChild(model); head.appendChild(status)
  var result = document.createElement('div')
  result.className = 'task-result'
  var errorLine = document.createElement('div')
  errorLine.className = 'task-error'
  card.appendChild(head); card.appendChild(result); card.appendChild(errorLine)
  tasksEl.insertBefore(card, tasksEl.firstChild)
  return { card: card, status: status, result: result, errorLine: errorLine }
}

function renderResult(target, snapshot) {
  var image = (snapshot.data || [])[0]
  if (!image) return
  if (snapshot.kind === 'video') {
    var video = document.createElement('video')
    video.controls = true
    video.src = image.b64_json ? 'data:video/mp4;base64,' + image.b64_json : image.url
    target.appendChild(video)
  } else {
    var img = document.createElement('img')
    img.alt = '生成结果'
    img.src = image.b64_json ? 'data:image/png;base64,' + image.b64_json : image.url
    target.appendChild(img)
  }
}

function statusText(snapshot) {
  if (snapshot.status === 'succeeded') return '完成，耗时 ' + Math.round((snapshot.durationMs || 0) / 1000) + ' 秒'
  if (snapshot.status === 'failed') return '失败（' + (ERRORS[snapshot.error] || snapshot.error || '未知错误') + '）'
  return '生成中… 已等待 ' + Math.round((Date.now() - new Date(snapshot.createdAt).getTime()) / 1000) + ' 秒'
}

goBtn.addEventListener('click', function () {
  var invite = inviteInput.value.trim()
  var prompt = promptInput.value.trim()
  if (rememberInput.checked) localStorage.setItem(REMEMBER_KEY, invite)
  else localStorage.removeItem(REMEMBER_KEY)
  if (!invite) { showSubmit('error', '请填写邀请码'); return }
  if (!prompt) { showSubmit('error', '请填写提示词'); return }
  var model = currentModel()
  var isVideo = Boolean(model && model.kind === 'video')
  var body = { prompt: prompt, model: modelSelect.value }
  if (isVideo) body.seconds = Number(document.getElementById('seconds').value)
  else {
    body.size = document.getElementById('size').value
    if (refs.length > 0) body.referenceImages = refs
  }
  goBtn.disabled = true
  fetch('/api/images/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + invite },
    body: JSON.stringify(body)
  }).then(function (response) {
    return response.json().catch(function () { return {} }).then(function (payload) {
      goBtn.disabled = false
      if (!response.ok) {
        showSubmit('error', '提交失败（HTTP ' + response.status + '）：' + (ERRORS[payload.error] || payload.error || '未知错误'))
        return
      }
      showSubmit('info', '已提交，任务在后台生成；可以继续提交其他任务')
      var els = createCard(payload)
      running[payload.id] = { els: els, snapshot: payload, invite: invite }
      renderRunning(els, payload)
    })
  }).catch(function (error) {
    goBtn.disabled = false
    showSubmit('error', '请求失败：' + (error && error.message ? error.message : '网络错误'))
  })
})

function renderRunning(els, snapshot) {
  els.status.textContent = statusText(snapshot)
  els.status.className = 'task-status' + (snapshot.status === 'succeeded' ? ' done' : snapshot.status === 'failed' ? ' failed' : '')
}

setInterval(function () {
  Object.keys(running).forEach(function (id) {
    var entry = running[id]
    renderRunning(entry.els, entry.snapshot)
    fetch('/api/images/tasks/' + id, { headers: { authorization: 'Bearer ' + entry.invite } })
      .then(function (response) {
        return response.json().catch(function () { return {} }).then(function (payload) {
          if (!response.ok) {
            entry.els.status.className = 'task-status failed'
            entry.els.status.textContent = response.status === 404
              ? '结果已过期（结果只保留 30 分钟）'
              : '查询失败：' + (ERRORS[payload.error] || payload.error || '未知错误')
            delete running[id]
            return
          }
          entry.snapshot = payload
          renderRunning(entry.els, entry.snapshot)
          if (payload.status === 'succeeded') {
            renderResult(entry.els.result, payload)
            delete running[id]
          } else if (payload.status === 'failed') {
            delete running[id]
          }
        })
      })
      .catch(function () { /* 网络抖动，下一轮再试 */ })
  })
}, 3000)
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
