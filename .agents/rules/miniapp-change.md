# Miniapp Change Protocol（小程序修改规则）

## 修改范围

- 当前所有修改只在小程序端（`miniapp/` 目录）进行。
- 除非用户明确要求，不改动 Web 端（`src/`）、服务端（`server/`）、部署与其他目录。

## 修改完成后：清缓存 + 重新编译

每次完成代码或资源修改后，必须按顺序执行以下步骤，保证体验到的永远是最新版本：

1. **清理旧产物与缓存**：删除 `miniapp/dist` 旧构建产物（必要时清理 `.taro`/`node_modules/.cache` 等构建缓存），避免旧文件残留。
2. **重新编译**：在 `miniapp/` 目录下执行 `npm run build:weapp`（持续开发时可用 `npm run dev:weapp` watch 模式）。
3. **微信开发者工具清缓存并预览**：优先用官方 CLI（服务端口已在「设置 → 安全设置」开启，一次性配置）。

   **先判断是否已有窗口，禁止再开一个：**

   ```powershell
   Get-Process | Where-Object {
     $_.ProcessName -match 'wechatdevtools|微信开发者' -or
     $_.MainWindowTitle -match '微信开发者|pet10'
   }
   ```

   - **已有窗口：只复用，禁止 `open` / `close` / `quit`。**
     - `& "D:\Tencent\微信web开发者工具\cli.bat" cache --clean all --project "d:\Pet10\miniapp" --lang zh`
     - 不要加 `--port`，以免和已启动的 HTTP 服务端口冲突。
     - 在**现有窗口**里预览最新 `miniapp/dist`。若未自动刷新，报告用户在该窗口点「编译」，不要再开新窗口。
   - **没有窗口：才允许 `open` 一次。**
     - `& "D:\Tencent\微信web开发者工具\cli.bat" open --project "d:\Pet10\miniapp" --lang zh`
     - 禁止用 `close` + `open` 重开循环。
   - 若 CLI 不可用：已有窗口则在该窗口执行「清缓存 → 清除全部缓存」后重新编译；没有窗口时再请用户打开一次。

## 验证

- 确认 `miniapp/dist` 中的产物已包含本次修改（重点检查图片等静态资源未被旧缓存引用）。
- 若预览仍显示旧效果，按「磁盘文件 → dist 产物 → 代码内联 → 工具缓存」顺序排查。
