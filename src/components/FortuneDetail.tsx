import type { Fortune } from '../domain/types'

interface FortuneDetailProps {
  fortune: Fortune
  onClose(): void
}

function Rating({ value }: { value: number }) {
  return (
    <span className="fortune-rating" aria-label={`${value} 星（满分 5 星）`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < value ? 'fortune-rating__star--filled' : ''}>★</i>
      ))}
    </span>
  )
}

export function FortuneDetail({ fortune, onClose }: FortuneDetailProps) {
  const { content } = fortune
  const sections = [
    { label: '学习运势', value: content.study },
    { label: '工作运势', value: content.work },
    { label: '财运', value: content.wealth },
    { label: '健康', value: content.health }
  ]
  const date = fortune.day.slice(0, 10).replace(/-/g, '.')

  return (
    <section className="fortune-detail" role="dialog" aria-modal="true" aria-label="今日运势">
      <header className="fortune-detail__header">
        <button type="button" onClick={onClose} aria-label="返回">←</button>
        <h2>今日运势</h2>
        <span aria-hidden="true" />
      </header>

      <div className="fortune-detail__body">
        <div className="fortune-detail__intro">
          <p>{date}</p>
          <h1>{content.zodiac}</h1>
          <div className="fortune-detail__overall">
            <span>综合运势</span>
            <Rating value={content.overall.rating} />
          </div>
          <p className="fortune-detail__summary">{content.overall.summary}</p>
        </div>

        <section className="fortune-detail__theme">
          <span>今日主题</span>
          <strong>{content.theme}</strong>
        </section>

        <div className="fortune-detail__sections">
          <section className="fortune-detail__section fortune-detail__section--overall">
            <div>
              <h3>综合运势</h3>
              <Rating value={content.overall.rating} />
            </div>
            <p>{content.overall.text}</p>
          </section>

          <section className="fortune-detail__section fortune-detail__section--love">
            <div>
              <h3>感情运势</h3>
              <Rating value={content.love.rating} />
            </div>
            <div className="fortune-detail__love-copy">
              <p><strong>单身</strong><span>{content.love.single}</span></p>
              <p><strong>有伴</strong><span>{content.love.partnered}</span></p>
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.label} className="fortune-detail__section">
              <div>
                <h3>{section.label}</h3>
                <Rating value={section.value.rating} />
              </div>
              <p>{section.value.text}</p>
            </section>
          ))}
        </div>

        <section className="fortune-detail__lucky" aria-label="幸运信息">
          <div>
            <span>幸运色</span>
            <strong><i style={{ backgroundColor: content.luckyColor.hex }} />{content.luckyColor.name}</strong>
          </div>
          <div>
            <span>幸运数字</span>
            <strong>{content.luckyNumber}</strong>
          </div>
        </section>

        <section className="fortune-detail__tip">
          <h3>今日好运句</h3>
          <p>{content.luckyPhrase}</p>
        </section>
      </div>
    </section>
  )
}
