import { Router } from 'express'

// 浏览器可直接打开的 Pet10 工作台（/image-playground）。页面本身不含任何密钥：
// 先进邀请码门禁页（错满 3 次/天当天锁定），验证通过后进入工作台；邀请码只存在页面内存里。
// 提交走 /api/images/tasks（提交即返回，任务在后台并行跑，页面轮询进度）。
const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Pet10 工作台</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 24px auto; padding: 0 16px; line-height: 1.6; color: #1f2937; }
  h1 { font-size: 20px; }
  label { display: block; margin: 14px 0 4px; font-weight: 600; font-size: 14px; }
  textarea, input[type=text], input[type=password], select { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #bbb; border-radius: 6px; font: inherit; background: #fff; color: #1f2937; }
  .row { display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 400; margin-top: 8px; }
  .label-row { display: flex; justify-content: space-between; align-items: center; margin: 14px 0 4px; }
  .label-row label { margin: 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  button { margin-top: 16px; padding: 10px 28px; border: 0; border-radius: 8px; background: #d97706; color: #fff; font-size: 15px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: wait; }
  button.small { margin: 0; padding: 5px 14px; font-size: 13px; background: #6b7280; }
  .hint { color: #6b7280; font-size: 12px; }
  .submit-status { margin-top: 12px; padding: 10px 12px; border-radius: 6px; font-size: 14px; display: none; }
  .submit-status.error { background: #fee2e2; color: #991b1b; }
  .submit-status.info { background: #fef3c7; color: #92400e; }
  .quota { margin-top: 10px; font-size: 13px; color: #374151; }
  .quota b { color: #92400e; }
  #gate { max-width: 380px; margin: 12vh auto 0; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px 26px; }
  #gate h1 { margin: 0 0 6px; font-size: 22px; }
  #gate .hint { margin: 0 0 12px; }
  #gate button { width: 100%; margin-top: 14px; }
  #gate-error { color: #991b1b; font-size: 13px; margin: 10px 0 0; display: none; }
  .task { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
  .task-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; font-size: 13px; }
  .task-kind { font-size: 16px; }
  .task-model { font-weight: 600; }
  .task-status { color: #6b7280; }
  .task-status.done { color: #166534; }
  .task-status.failed { color: #991b1b; }
  .task-result { margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .task-result img, .task-result video { width: 100%; border-radius: 8px; }
  .task-error { color: #991b1b; font-size: 13px; margin-top: 8px; }
  .thumbs { display: flex; gap: 10px; flex-wrap: nowrap; overflow-x: auto; margin-top: 6px; padding-bottom: 4px; }
  .thumb { position: relative; flex: 0 0 auto; }
  .thumb img { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; display: block; }
  .thumb button { position: absolute; top: -7px; right: -7px; width: 20px; height: 20px; border-radius: 50%; border: 0; background: #991b1b; color: #fff; font-size: 12px; line-height: 20px; padding: 0; margin: 0; cursor: pointer; }
  .drop-hint { display: none; position: fixed; inset: 0; background: rgba(217, 119, 6, .12); border: 3px dashed #d97706; z-index: 9; pointer-events: none; }
  body.dragging .drop-hint { display: block; }
</style>
</head>
<body>
<div id="gate">
  <h1>Pet10 工作台</h1>
  <p class="hint">生图 / 生视频内部工作台，请输入邀请码进入（一天内错误 3 次将锁定到明天）。</p>
  <label for="gate-invite">邀请码</label>
  <input type="password" id="gate-invite" autocomplete="off" placeholder="IMAGE_INVITE_CODE">
  <button id="gate-go">进入</button>
  <p id="gate-error"></p>
</div>
<div id="app" style="display:none">
  <h1>Pet10 工作台</h1>
  <p class="hint">提交后任务在后台并行生成，可以一次挂多个任务；模型在本站 <code>/api/images/models</code> 里选择。</p>
  <label for="model">模型</label>
  <select id="model"></select>
  <div class="label-row">
    <label for="prompt">提示词</label>
    <button type="button" class="small" id="optimize">✨ 优化提示词</button>
  </div>
  <textarea id="prompt" rows="3" placeholder="例如：一只小狗在草地上奔跑，水彩风格"></textarea>
  <div id="image-options">
    <div class="grid3">
      <div>
        <label for="aspect">比例</label>
        <select id="aspect">
          <option value="1:1">1:1 正方形</option>
          <option value="2:3">2:3 竖版</option>
          <option value="3:2">3:2 横版</option>
        </select>
      </div>
      <div>
        <label for="imagesize">尺寸</label>
        <select id="imagesize">
          <option value="1K">1K（快）</option>
          <option value="2K" selected>2K（清晰）</option>
        </select>
      </div>
      <div>
        <label for="count">出图数量</label>
        <select id="count">
          <option value="1" selected>1 张</option>
          <option value="2">2 张</option>
          <option value="3">3 张</option>
          <option value="4">4 张</option>
        </select>
      </div>
    </div>
  </div>
  <div id="video-options" style="display:none">
    <div class="grid2">
      <div>
        <label for="resolution">分辨率</label>
        <select id="resolution">
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>
      </div>
      <div>
        <label for="duration">时长</label>
        <select id="duration">
          <option value="5" selected>5 秒</option>
          <option value="10">10 秒</option>
        </select>
      </div>
    </div>
    <label class="row"><input type="checkbox" id="audio"> 生成声音（配乐/音效，费用更高）</label>
    <p class="hint" id="video-aspect-hint">比例说明：给了首帧图时成片比例跟随首帧；纯文生视频为方画幅。10 秒费用约为 5 秒的两倍。</p>
  </div>
  <div id="image-gemini-hint" style="display:none">
    <p class="hint">当前 Gemini 生图模型不支持比例/尺寸参数，按模型默认出图；出图数量仍有效。</p>
  </div>
<div id="refs-wrap">
  <label for="refs">参考图（图片模型最多 5 张，可拖拽进页面或直接粘贴截图；视频模型取第 1 张作首帧图生视频，建议 ≥720px；单张 ≤ 2MB，jpg/png/webp）</label>
  <input type="file" id="refs" accept="image/jpeg,image/png,image/webp" multiple>
  <div class="thumbs" id="thumbs"></div>
</div>
<div class="drop-hint" id="drop-hint"></div>
  <button id="go">提交任务</button>
  <div class="submit-status" id="submit-status"></div>
  <div class="quota" id="quota"></div>
  <div id="tasks"></div>
  <p class="hint">限额：每分钟 3 次提交；图片每天 100 张、视频每天 30 个（按张/个计，出图数量按张扣）。任务成功后会在卡片上显示消耗的金额与 Token。</p>
</div>
<script>
var INVITE = ''
var ERRORS = {
  invalid_invite_code: '邀请码不正确',
  invite_locked: '邀请码错误次数过多，今日已锁定，请明天再试',
  rate_limit_exceeded: '触发限流，请稍后再试',
  invalid_prompt: '提示词为空或超过 4000 字符',
  invalid_model: '模型未启用',
  invalid_aspect_ratio: '不支持的比例（仅 1:1 / 2:3 / 3:2）',
  invalid_image_size: '不支持的尺寸（仅 1K / 2K）',
  invalid_count: '出图数量仅支持 1~4',
  invalid_resolution: '不支持的视频分辨率（仅 720p/1080p）',
  invalid_duration: '不支持的视频时长（仅 5/10 秒）',
  invalid_reference_images: '参考图最多 5 张',
  invalid_reference_image: '参考图格式不支持，只接受 jpg/png/webp',
  invalid_reference_image_size: '参考图超过 2MB',
  task_not_found: '任务不存在或已过期（结果只保留 30 分钟）',
  image_generation_unavailable: '上游生成服务暂不可用，请稍后重试',
  upstream_rejected: '上游拒绝了本次生成',
  upstream_unavailable: '上游暂不可用',
  upstream_invalid_response: '上游响应异常'
}
var modelSelect = document.getElementById('model')
var promptInput = document.getElementById('prompt')
var optimizeBtn = document.getElementById('optimize')
var imageOptions = document.getElementById('image-options')
var imageGeminiHint = document.getElementById('image-gemini-hint')
var videoOptions = document.getElementById('video-options')
var aspectInput = document.getElementById('aspect')
var imageSizeInput = document.getElementById('imagesize')
var countInput = document.getElementById('count')
var resolutionInput = document.getElementById('resolution')
var durationInput = document.getElementById('duration')
var audioInput = document.getElementById('audio')
var refsInput = document.getElementById('refs')
var thumbsEl = document.getElementById('thumbs')
var goBtn = document.getElementById('go')
var submitStatus = document.getElementById('submit-status')
var quotaEl = document.getElementById('quota')
var tasksEl = document.getElementById('tasks')
var gateError = document.getElementById('gate-error')
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
  var isOpenaiImage = Boolean(model && model.kind === 'image' && model.id.indexOf('openai/') === 0)
  var isGeminiImage = Boolean(model && model.kind === 'image' && model.id.indexOf('google/') === 0)
  imageOptions.style.display = isVideo ? 'none' : ''
  imageGeminiHint.style.display = isGeminiImage ? '' : 'none'
  aspectInput.disabled = !isOpenaiImage
  imageSizeInput.disabled = !isOpenaiImage
  videoOptions.style.display = isVideo ? '' : 'none'
}

function refreshQuota() {
  if (!INVITE) return
  fetch('/api/images/quota', { headers: { authorization: 'Bearer ' + INVITE } })
    .then(function (response) { return response.json().catch(function () { return {} }).then(function (payload) { return { ok: response.ok, status: response.status, payload: payload } }) })
    .then(function (result) {
      if (result.status === 403 || result.payload.error === 'invite_locked') { quotaEl.textContent = '今日已锁定（邀请码错误次数过多），请明天再试'; return }
      if (!result.ok) { quotaEl.textContent = '剩余额度：邀请码未生效'; return }
      quotaEl.innerHTML = '剩余额度：本分钟 <b>' + result.payload.minuteRemaining + '/' + result.payload.perMinuteLimit + '</b> 次 · 图片 <b>' + result.payload.imageRemaining + '/' + result.payload.imageDailyLimit + '</b> 张 · 视频 <b>' + result.payload.videoRemaining + '/' + result.payload.videoDailyLimit + '</b> 个'
    })
    .catch(function () { quotaEl.textContent = '剩余额度：查询失败' })
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

// ---------- 门禁 ----------
var gateGo = document.getElementById('gate-go')
var gateInvite = document.getElementById('gate-invite')

function enterWorkspace() {
  var code = gateInvite.value.trim()
  if (!code) {
    gateError.textContent = '请输入邀请码'
    gateError.style.display = 'block'
    return
  }
  gateGo.disabled = true
  gateError.style.display = 'none'
  fetch('/api/images/quota', { headers: { authorization: 'Bearer ' + code } })
    .then(function (response) { return response.json().catch(function () { return {} }).then(function (payload) { return { ok: response.ok, status: response.status, payload: payload } }) })
    .then(function (result) {
      gateGo.disabled = false
      if (result.status === 403 || result.payload.error === 'invite_locked') {
        gateError.textContent = '邀请码错误次数过多，今日已锁定，请明天再试'
        gateError.style.display = 'block'
        return
      }
      if (!result.ok) {
        var left = result.payload.attemptsRemaining
        gateError.textContent = '邀请码不正确' + (left !== undefined ? '，今天还可尝试 ' + left + ' 次' : '')
        gateError.style.display = 'block'
        return
      }
      INVITE = code
      document.getElementById('gate').style.display = 'none'
      document.getElementById('app').style.display = ''
      refreshQuota()
    })
    .catch(function () {
      gateGo.disabled = false
      gateError.textContent = '验证请求失败，请重试'
      gateError.style.display = 'block'
    })
}

gateGo.addEventListener('click', enterWorkspace)
gateInvite.addEventListener('keydown', function (event) { if (event.key === 'Enter') enterWorkspace() })

var MAX_REFS = 5

function renderThumbs() {
  thumbsEl.textContent = ''
  refs.forEach(function (src, index) {
    var wrap = document.createElement('span')
    wrap.className = 'thumb'
    var img = document.createElement('img')
    img.src = src
    img.alt = '参考图' + (index + 1)
    var remove = document.createElement('button')
    remove.type = 'button'
    remove.textContent = '×'
    remove.title = '移除这张参考图'
    remove.addEventListener('click', function () {
      refs.splice(index, 1)
      renderThumbs()
    })
    wrap.appendChild(img)
    wrap.appendChild(remove)
    thumbsEl.appendChild(wrap)
  })
}

function addRefFiles(fileList) {
  var files = Array.prototype.slice.call(fileList).filter(function (file) {
    return /^image\\/(jpeg|png|webp)$/.test(file.type)
  })
  if (files.length === 0) return
  files.forEach(function (file) {
    if (file.size > 2 * 1024 * 1024) { showSubmit('error', '参考图 ' + file.name + ' 超过 2MB'); return }
    var reader = new FileReader()
    reader.onload = function () {
      if (refs.length >= MAX_REFS) { showSubmit('error', '参考图最多 ' + MAX_REFS + ' 张'); return }
      refs.push(String(reader.result))
      renderThumbs()
      showSubmit('info', '已添加参考图 ' + refs.length + '/' + MAX_REFS)
    }
    reader.readAsDataURL(file)
  })
}

refsInput.addEventListener('change', function (event) {
  addRefFiles(event.target.files)
  refsInput.value = ''
})

document.addEventListener('dragover', function (event) {
  event.preventDefault()
  document.body.classList.add('dragging')
})
document.addEventListener('dragleave', function (event) {
  if (event.relatedTarget === null) document.body.classList.remove('dragging')
})
document.addEventListener('drop', function (event) {
  event.preventDefault()
  document.body.classList.remove('dragging')
  addRefFiles(event.dataTransfer.files)
})
document.addEventListener('paste', function (event) {
  var items = event.clipboardData && event.clipboardData.items
  if (!items) return
  var files = []
  for (var i = 0; i < items.length; i++) {
    if (items[i].kind === 'file' && items[i].type.indexOf('image/') === 0) {
      var file = items[i].getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) addRefFiles(files)
})

optimizeBtn.addEventListener('click', function () {
  var prompt = promptInput.value.trim()
  if (!prompt) { showSubmit('error', '提示词为空，先写几个关键词再优化'); return }
  var model = currentModel()
  var isVideo = Boolean(model && model.kind === 'video')
  optimizeBtn.disabled = true
  showSubmit('info', '优化中…')
  fetch('/api/images/optimize', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + INVITE },
    body: JSON.stringify({ prompt: prompt, kind: isVideo ? 'video' : 'image', hasFirstFrame: isVideo && refs.length > 0 })
  }).then(function (response) {
    return response.json().catch(function () { return {} }).then(function (payload) {
      optimizeBtn.disabled = false
      if (!response.ok) { showSubmit('error', '优化失败（HTTP ' + response.status + '）：' + (ERRORS[payload.error] || payload.error || '未知错误')); return }
      promptInput.value = payload.prompt
      showSubmit('info', '已优化提示词，可继续手改后提交')
    })
  }).catch(function (error) {
    optimizeBtn.disabled = false
    showSubmit('error', '优化请求失败：' + (error && error.message ? error.message : '网络错误'))
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
  var items = snapshot.data || []
  items.forEach(function (item) {
    if (snapshot.kind === 'video') {
      var video = document.createElement('video')
      video.controls = true
      video.src = item.b64_json ? 'data:video/mp4;base64,' + item.b64_json : item.url
      target.appendChild(video)
    } else {
      var img = document.createElement('img')
      img.alt = '生成结果'
      img.src = item.b64_json ? 'data:image/png;base64,' + item.b64_json : item.url
      target.appendChild(img)
    }
  })
}

function statusText(snapshot) {
  if (snapshot.status === 'succeeded') {
    var text = '完成，耗时 ' + Math.round((snapshot.durationMs || 0) / 1000) + ' 秒'
    var usage = snapshot.usage
    if (usage) {
      if (usage.cost !== undefined) text += ' · 消耗 $' + usage.cost.toFixed(2)
      if (usage.tokens !== undefined) text += ' · ' + usage.tokens + ' tokens'
    }
    return text
  }
  if (snapshot.status === 'failed') return '失败（' + (ERRORS[snapshot.error] || snapshot.error || '未知错误') + '）'
  return '生成中… 已等待 ' + Math.round((Date.now() - new Date(snapshot.createdAt).getTime()) / 1000) + ' 秒'
}

goBtn.addEventListener('click', function () {
  var prompt = promptInput.value.trim()
  if (!prompt) { showSubmit('error', '请填写提示词'); return }
  var model = currentModel()
  var isVideo = Boolean(model && model.kind === 'video')
  var isGeminiImage = Boolean(model && model.kind === 'image' && model.id.indexOf('google/') === 0)
  var body = { prompt: prompt, model: modelSelect.value }
  if (isVideo) {
    body.resolution = resolutionInput.value
    body.duration = Number(durationInput.value)
    body.audio = audioInput.checked
    if (refs.length > 0) body.referenceImages = [refs[0]]
  } else {
    body.count = Number(countInput.value)
    if (!isGeminiImage) {
      body.aspectRatio = aspectInput.value
      body.imageSize = imageSizeInput.value
    }
    if (refs.length > 0) body.referenceImages = refs
  }
  goBtn.disabled = true
  fetch('/api/images/tasks', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + INVITE },
    body: JSON.stringify(body)
  }).then(function (response) {
    return response.json().catch(function () { return {} }).then(function (payload) {
      goBtn.disabled = false
      refreshQuota()
      if (!response.ok) {
        showSubmit('error', '提交失败（HTTP ' + response.status + '）：' + (ERRORS[payload.error] || payload.error || '未知错误'))
        return
      }
      showSubmit('info', '已提交，任务在后台生成；可以继续提交其他任务')
      var els = createCard(payload)
      running[payload.id] = { els: els, snapshot: payload }
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
  var hasRunning = Object.keys(running).length > 0
  if (hasRunning && INVITE) refreshQuota()
  Object.keys(running).forEach(function (id) {
    var entry = running[id]
    renderRunning(entry.els, entry.snapshot)
    fetch('/api/images/tasks/' + id, { headers: { authorization: 'Bearer ' + INVITE } })
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
