# 每日运势

## 功能

根据用户和日期生成稳定的每日运势，包括总体建议和学习、工作、财富、健康等内容。

## 关键入口

- `src/components/CalendarTab.tsx`
- `src/components/FortuneDetail.tsx`
- `src/services/fortuneHistory.ts`
- `server/src/services/dailyFortune.ts`

## 重要规则

同一用户同一天的结果应保持稳定。修改文案、颜色、评分或星座计算时必须更新服务端测试。

## 验收

- [ ] 同一天重复打开结果一致。
- [ ] 日期切换正确。
- [ ] 详情和历史返回正常。
- [ ] 文案没有乱码或缺失。
