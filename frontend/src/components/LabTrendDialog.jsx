import { useLanguage } from '../context/LanguageContext'
import { formatDate } from '../utils/format'
import { parameterHistory, parseRange } from '../utils/labs'
import LineChart from './LineChart'
import Modal from './Modal'

export default function LabTrendDialog({ parameter, exams, onClose }) {
  const { t, lang } = useLanguage()
  const tl = t.labTrend
  const history = parameterHistory(exams, parameter)
  const numeric = history.filter(h => h.numeric != null)
  const latest = history[history.length - 1]
  const range = latest && parseRange(latest.range)
  const unit = latest?.unit || ''

  return (
    <Modal
      title={tl.title.replace('{param}', parameter)}
      subtitle={tl.subtitle.replace('{n}', history.length)}
      onClose={onClose}
      closeLabel={t.common.close}
    >
      {numeric.length > 0 ? (
        <LineChart
          points={numeric.map(h => ({ date: h.date, value: h.numeric, flagged: h.abnormal, note: h.examType }))}
          unit={unit}
          band={range ? { ...range, label: tl.referenceRange } : null}
          lang={lang}
          ariaLabel={tl.title.replace('{param}', parameter)}
          flaggedLabel={t.exam.abnormal.replace(/^\W+/, '')}
        />
      ) : (
        <p className="rem-empty">{tl.notNumeric}</p>
      )}

      {numeric.length === 1 && <p className="rem-empty" style={{ marginTop: 8 }}>{tl.onlyOne}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>{tl.date}</th>
            <th>{t.exam.value}</th>
            <th>{t.exam.range}</th>
            <th>{t.exam.status}</th>
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((h, i) => (
            <tr key={i}>
              <td>{formatDate(h.date, lang)}<div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{h.examType}</div></td>
              <td style={{ fontWeight: 800 }}>{h.value}{h.unit && ` ${h.unit}`}</td>
              <td>{h.range || '—'}</td>
              <td>
                {h.abnormal
                  ? <span className="status status-overdue">{t.exam.abnormal}</span>
                  : <span className="status status-ok">{t.exam.normal}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  )
}
