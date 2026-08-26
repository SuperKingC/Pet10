# Miniapp Change Protocol（小程序修改规则）

## 修改范围

- 当前所有修改只在小程序端（`miniapp/` 目录）进行。
- 除非用户明确要求，不改动 Web 端（`src/`）、服务端（`server/`）、部署与其他目录。

## 修改完成后：清缓存 + 重新编译

每次完成代码或资源修改后，必须按顺序执行以下步骤，保证体验到的永远是最新版本：

1. **清理旧产物与缓存**：删除 `miniapp/dist` 旧构建产物（必要时清理 `.taro`/`node_modules/.cache` 等构建缓存），避免旧文件残留。
2. **重新编译**：在 `miniapp/` 目录下执行 `npm run build:weapp`（持续开发时可用 `npm run dev:weapp` watch 模式）。
3. **微信开发者工具清缓存**：优先用官方 CLI（服务端口已在「设置 → 安全设置」开启，一次性配置）：
   - `& "D:\Tencent\微信web开发者工具\cli.bat" cache --clean all --project "d:\Pet10\miniapp" --lang zh`
   - 再执行 `close` + `open` 同项目触发自动重编译（`whenProjectOpenAutoCompile` 已开启）。
   - 若 CLI 不可用，回退到 IDE 界面「清缓存 → 清除全部缓存」后重新编译预览。

## 验证

- 确认 `miniapp/dist` 中的产物已包含本次修改（重点检查图片等静态资源未被旧缓存引用）。
- 若预览仍显示旧效果，按「磁盘文件 → dist 产物 → 代码内联 → 工具缓存」顺序排查。
