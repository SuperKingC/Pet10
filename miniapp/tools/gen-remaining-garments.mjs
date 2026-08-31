// 剩余 7 件服饰批量生图（规则见 .agents/rules/ai-image-generation.md）
// 用法：node miniapp/tools/gen-remaining-garments.mjs hoodie,overalls   （逗号分隔本次要生成的 key）
import { spawnSync } from 'node:child_process'

const GARMENTS = {
  hoodie: '一件奶油绿色的连帽卫衣外套，正面平铺展示，帽子和抽绳细节，胸前有口袋，柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字，衣服占画面主体。',
  overalls: '一条蓝色的牛仔背带裤，正面平铺展示，胸前口袋有白色小骨头图案，肩带与两侧有棕色圆形纽扣，柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字，衣服占画面主体。',
  dress: '一条粉色的小裙子，白色娃娃领，胸前系着粉色蝴蝶结，裙摆有褶皱花边，正面平铺展示，柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字，裙子占画面主体。',
  raincoat: '一件黄色的雨衣外套，带连帽，前排一排纽扣，胸前有绿色小青蛙贴饰，正面平铺展示，柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字，雨衣占画面主体。',
  pajamas: '一件浅紫色的睡衣上衣，白色翻领，布料上有白色小星星图案，旁边放一顶同色系的尖顶睡帽，正面平铺展示，柔和的手绘水彩儿童绘本风格，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字。',
  hat: '一顶黄色的渔夫帽，正面平铺展示，帽檐上别着一朵白色小雏菊，柔和的手绘水彩儿童绘本风格，奶油色与暖棕色调，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字，帽子占画面主体。',
  bag: '一个青绿色的斜挎小包，包身正面有一只可爱的小狗脸图案，侧面有白色雏菊挂饰，细长的背带，正面平铺展示，柔和的手绘水彩儿童绘本风格，细深棕色描边，笔触柔软，与参考图的插画风格一致。孤立放在纯白色背景上，没有小狗，没有阴影，没有文字，包占画面主体。'
}

const keys = (process.argv[2] ?? '').split(',').filter((k) => k in GARMENTS)
if (keys.length === 0) {
  console.error('用法: node miniapp/tools/gen-remaining-garments.mjs ' + Object.keys(GARMENTS).join('|'))
  process.exit(1)
}
for (const key of keys) {
  console.log(`=== 生成 ${key} …`)
  const r = spawnSync('node', [
    'scripts/gen-ai-image.mjs',
    GARMENTS[key],
    '-o', `design-assets/wardrobe/gen-${key}-v1.png`,
    '--ratio', '1:1',
    '--ref', 'design-assets/nest/xiaoduoli-in-box-source.jpg'
  ], { stdio: 'inherit' })
  if (r.status !== 0) { console.error(`${key} 失败`); process.exit(1) }
}
console.log('全部完成:', keys.join(', '))
