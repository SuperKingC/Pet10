# .agents context

## 2026-08-27（修正已有窗口检测）

- **原因**：本机进程名是「微信开发者工具」，只查 `wechatdevtools` 会误判成没开窗口。
- **修改**：
  - `.agents/rules/miniapp-change.md`：检测改为进程名或窗口标题匹配「微信开发者 / pet10」

## 2026-08-27（预览复用已有微信开发者工具窗口）

- **原因**：小程序改完后的验证不应再执行 `close` + `open`，以免已有窗口之外再弹出一个开发者工具。
- **修改**：
  - `.agents/rules/miniapp-change.md`：先检测 `wechatdevtools` /「微信开发者」窗口；已有则只 `cache --clean all` 并在该窗口预览；没有窗口才允许 `open` 一次；禁止 `close` / `quit` 重开
