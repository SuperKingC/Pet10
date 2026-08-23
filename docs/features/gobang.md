# 五子棋

好友模式使用 2 秒 single-flight HTTP 轮询：当前同步请求 settle 后才安排下一次；退出好友模式、切换房间或组件卸载后，迟到的成功和失败响应均不会覆盖当前棋局。

## 功能

好友之间可以邀请并进行实时五子棋。服务端判断轮次、落子是否合法和胜负结果。

## 关键入口

- `src/games/gobang/GobangGame.tsx`
- `server/src/services/gobangService.ts`
- `server/src/realtime/socketServer.ts`

## 验收

- [ ] 邀请、接受和拒绝正常。
- [ ] 不能在非自己回合落子。
- [ ] 不能覆盖已有棋子。
- [ ] 胜负和重新开始同步到双方。
