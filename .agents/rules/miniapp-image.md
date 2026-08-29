# Miniapp Image Rules（小程序图片压缩规则）

这份规则覆盖两类不同的图片，不要混用方法：**运行时用户照片**（选图后上传）与**包内静态资源**（随构建分发）。

## 运行时用户照片：先降分辨率，再保质量

模糊的根因几乎总是「只压质量、不降分辨率」，以及同一条链路里重复多次有损压缩。

### 压缩链路（固定）

1. 选图：`chooseMedia` 保持 `sizeType: ['compressed']`（微信原生温和压缩，只此一次预处理）。
2. 落库前：只做**一次**有损压缩，统一走 `miniapp/src/services/imageCompression.ts` 的 `compressImageToDataUrl`：
   - 质量固定 `quality: 80`，**禁止低于 75**（再低肉眼可见色块）。
   - 必须传 `compressedWidth`，按实际展示宽度取档：日记照片 `[1080, 900, 720]`，头像 `[640, 480, 360]`。
3. 超出服务端 dataURL 上限（照片 300_000、头像 700_000 字符）时：**降宽度重试，禁止降质量**——降宽度损失的是展示不出来的像素，降质量损失的是看得见的细节。全部档位仍超限才报错，报错前回退读原图。

### 禁止事项

- 禁止对同一文件链路做两次有损压缩（例如 `chooseMedia compressed` 之后再用 `quality: 60` 压一遍）。
- 禁止用「再调低 quality」作为缩小体积的手段。
- 禁止在 UI 组件里内联压缩逻辑；压缩属于 services 层。
- `compressImage` 的 `quality` 只对 JPEG 生效；dataURL 统一标 `image/jpeg`。

### 验收

- 清晰度必须在**真机预览**验收；开发者工具的 `compressImage` 行为与真机不一致。
- 报告需含：压缩前/后文件体积、宽度档位、真机截图。

## 包内静态资源：TinyPNG 追加压缩（禁 WebP）

- **本地包内资源禁止 WebP**：微信 image 组件不解析本地 WebP，iOS 真机整块不显示。WebP 仅限塔罗 COS 网络资源并配合 `webp` 属性。
- 入库前先跑 `node scripts/optimize-miniapp-assets.mjs`（256 色全色板 PNG / mozjpeg JPEG，详见 `docs/features/miniapp.md`）。
- 在此之后可追加 TinyPNG 压缩：设置 `TINIFY_API_KEY` 环境变量后执行 `node scripts/optimize-miniapp-assets.mjs --write`，脚本只覆盖收益 ≥2% 的文件，输出格式保持 PNG/JPEG。key 存环境变量或本地 `.env*`（已 gitignore），**禁止进代码、日志或仓库**。
- TinyPNG 是有损量化（pngquant 类），「视觉无差」不等于无损；图形类资源压缩后需按 `.agents/rules/miniapp-change.md` 清缓存重编译并真机验收色彩。
- 单张 180 KB 安全线、主包 < 2MB 上限不变；替换图片必须同步 `docs/assets/asset-manifest.json` 并报告尺寸、格式、体积、加载方式和清晰度验收（`AI_RULES.md` 图片特别规则）。
