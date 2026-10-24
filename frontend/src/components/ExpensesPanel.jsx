import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatMoney, todayISO } from '../utils/format'
import { EXPENSE_TYPES, collectExpenses, expensesByYear, totalExpenses } from '../utils/expenses'

// Gastos de la mascota: total, desglose por año y tipo, y el detalle
export default function ExpensesPanel({ checkups, exams, vaccines, parasites }) {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const te = t.expenses
  const money = v => formatMoney(v, user?.currency, lang)

  const items = collectExpenses({ checkups, exams, vaccines, parasites })
  if (items.length === 0) {
    return (
      <div className="panel-card">
        <div className="section-empty">
          <span className="se-emoji">💸</span>
          <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{te.emptyTitle}</h3>
          <p className="t-bodysm" style={{ margin: 0 }}>{te.emptySub}</p>
        </div>
      </div>
    )
  }

  const years = expensesByYear(items)
  const thisYear = years.find(y => y.year === todayISO().slice(0, 4))
  const max = Math.max(...years.map(y => y.total), 1)

  return (
    <div className="panel-card">
      <div className="stat-row">
        <div className="stat">
          <div className="label">{te.total}</div>
          <div className="value">{money(totalExpenses(items))}</div>
          <div className="delta">{te.allTime} · {te.items.replace('{n}', items.length)}</div>
        </div>
        <div className="stat">
          <div className="label">{te.thisYear}</div>
          <div className="value">{money(thisYear?.total ?? 0)}</div>
          <div className="delta">{te.items.replace('{n}', thisYear?.count ?? 0)}</div>
        </div>
      </div>

      <h3 className="t-label muted-3" style={{ margin: '16px 0 8px' }}>{te.byYear}</h3>
      <ul className="exp-years">
        {years.map(y => (
          <li key={y.year}>
            <span className="exp-year">{y.year}</span>
            {/* Barra apilada por tipo; el ancho es relativo al año de mayor gasto */}
            <span className="exp-bar" style={{ width: `${(y.total / max) * 100}%` }} aria-hidden="true">
              {EXPENSE_TYPES.filter(k => y.byType[k] > 0).map(k => (
                <span key={k} className={`exp-seg exp-${k}`} style={{ flexGrow: y.byType[k] }} title={`${te.types[k]}: ${money(y.byType[k])}`} />
              ))}
            </span>
            <span className="exp-total">{money(y.total)}</span>
            <span className="exp-break">
              {EXPENSE_TYPES.filter(k => y.byType[k] > 0).map(k => (
                <span key={k}><i className={`exp-dot exp-${k}`} /> {te.types[k]} {money(y.byType[k])}</span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <table className="data-table">
        <thead>
          <tr><th>{te.date}</th><th>{te.type}</th><th>{te.concept}</th><th style={{ textAlign: 'right' }}>{te.amount}</th></tr>
        </thead>
        <tbody>
          {items.map(i => (
            <tr key={`${i.type}-${i.id}`}>
              <td>{formatDate(i.date, lang)}</td>
              <td><i className={`exp-dot exp-${i.type}`} /> {te.types[i.type]}</td>
              <td style={{ color: 'var(--text-2)' }}>{i.title}</td>
              <td style={{ textAlign: 'right', fontWeight: 800 }}>{money(i.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
