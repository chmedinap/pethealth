import { useEffect, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getPet, getPetCheckups, getPetExams, getPetVaccines, getPetWeights, getPetParasites, getPetConditions } from '../api'
import { latestParasiteIds, parasiteStatus } from '../utils/parasites'
import { calcAge, formatDate, todayISO } from '../utils/format'
import { speciesLabel } from '../utils/species'
import { vaccineStatus, latestDoseIds } from '../utils/vaccines'
import LineChart from '../components/LineChart'

// Historial completo en una página pensada para imprimir o "Guardar como PDF".
// Orden cronológico inverso, como lo lee un veterinario: lo más reciente primero.
export default function PetReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const tr = t.report
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    Promise.all([getPet(id), getPetCheckups(id), getPetExams(id), getPetVaccines(id), getPetWeights(id), getPetParasites(id), getPetConditions(id)])
      .then(([pet, checkups, exams, vaccines, weights, parasites, conditions]) => setData({
        pet: pet.data, checkups: checkups.data, exams: exams.data, vaccines: vaccines.data, weights: weights.data,
        parasites: parasites.data, conditions: conditions.data,
      }))
      .catch(err => { if (err.response?.status === 404) setNotFound(true) })
  }, [id])

  useEffect(() => {
    if (data) document.title = `${tr.title} — ${data.pet.name}`
    return () => { document.title = 'PetHealth' }
  }, [data, tr.title])

  if (notFound) return <Navigate to="/" replace />
  if (!data) return <p style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-3)' }}>{t.common.loading}</p>

  const { pet, checkups, exams, vaccines, weights, parasites, conditions } = data
  const latestParasites = latestParasiteIds(parasites)
  const fd = d => formatDate(d, lang) || '—'
  const latestVaccines = latestDoseIds(vaccines)
  const genderLabel = pet.gender === 'male' ? t.common.male : pet.gender === 'female' ? t.common.female : null

  return (
    <>
      <div className="report-toolbar no-print">
        <button className="back-btn" onClick={() => navigate(`/pets/${id}`)}>
          <ArrowLeft size={18} strokeWidth={2.4} /> {pet.name}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <Printer size={16} /> {tr.print}
        </button>
      </div>
      <p className="no-print" style={{ maxWidth: 820, margin: '8px auto 0', padding: '0 24px', fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>
        {tr.printHint}
      </p>

      <article className="report">
        <header>
          <p className="muted" style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            {tr.title} · {tr.generated.replace('{date}', fd(todayISO()))}
          </p>
          <h1>{pet.name}</h1>
          <div className="facts">
            <div><strong>{tr.species}:</strong> {speciesLabel(pet.species, t)}{pet.breed && ` · ${pet.breed}`}</div>
            {genderLabel && <div><strong>{t.profile.gender}:</strong> {genderLabel}</div>}
            <div><strong>{tr.birthDate}:</strong> {fd(pet.birth_date)} ({calcAge(pet.birth_date, t.common)})</div>
            <div><strong>{t.profile.weight}:</strong> {pet.weight_kg != null ? `${pet.weight_kg} ${t.common.kg}` : '—'}</div>
            <div><strong>{tr.owner}:</strong> {pet.owner_username}</div>
          </div>
          {pet.notes && <p style={{ marginTop: 12 }}><strong>{t.profile.notes}:</strong> {pet.notes}</p>}
        </header>

        {/* Lo primero que debe ver otro veterinario */}
        {conditions.length > 0 && (
          <section className="report-alert">
            <h2>{tr.conditions}</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {conditions.map(c => (
                <li key={c.id}>
                  <strong>{c.kind === 'allergy' ? `⚠ ${t.conditions.allergy}` : t.conditions.chronic}: {c.name}</strong>
                  {c.since && ` · ${t.conditions.since} ${fd(c.since)}`}
                  {c.notes && ` — ${c.notes}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2>{t.profile.vaccinesTitle}</h2>
          {vaccines.length === 0 ? <p className="muted">{tr.none}</p> : (
            <table>
              <thead><tr><th>{t.vaccines.name}</th><th>{t.vaccines.dateGiven}</th><th>{t.vaccines.nextDue}</th><th>{t.vaccines.batch}</th><th>{t.vaccines.vet}</th></tr></thead>
              <tbody>
                {vaccines.map(v => {
                  const overdue = latestVaccines.has(v.id) && vaccineStatus(v) === 'overdue'
                  return (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{fd(v.date_given)}</td>
                      <td>{v.next_due_date ? fd(v.next_due_date) : '—'}{overdue && ` ⚠ ${t.vaccines.statusOverdue}`}</td>
                      <td>{v.batch_number || '—'}</td>
                      <td>{v.vet_name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>{tr.parasites}</h2>
          {parasites.length === 0 ? <p className="muted">{tr.none}</p> : (
            <table>
              <thead><tr><th>{t.parasites.product}</th><th>{t.parasites.kind}</th><th>{t.parasites.dateGiven}</th><th>{t.parasites.nextDue}</th></tr></thead>
              <tbody>
                {parasites.map(p => (
                  <tr key={p.id}>
                    <td>{p.product}</td>
                    <td>{t.parasites.kinds[p.kind]}</td>
                    <td>{fd(p.date_given)}</td>
                    <td>{p.next_due_date ? fd(p.next_due_date) : '—'}{latestParasites.has(p.id) && parasiteStatus(p) === 'overdue' && ` ⚠ ${t.vaccines.statusOverdue}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>{t.profile.weightTitle}</h2>
          {weights.length === 0 ? <p className="muted">{tr.none}</p> : (
            <>
              {weights.length > 1 && (
                <LineChart
                  points={weights.map(w => ({ date: w.measured_on, value: w.weight_kg }))}
                  unit={t.common.kg} lang={lang} height={180}
                  ariaLabel={t.weight.chartAria.replace('{name}', pet.name)}
                />
              )}
              <table>
                <thead><tr><th>{t.weight.date}</th><th>{t.weight.weightKg}</th><th>{t.weight.notes}</th></tr></thead>
                <tbody>
                  {[...weights].reverse().map(w => (
                    <tr key={w.id}><td>{fd(w.measured_on)}</td><td>{w.weight_kg}</td><td>{w.notes || ''}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section>
          <h2>{t.profile.checkupsTitle}</h2>
          {checkups.length === 0 ? <p className="muted">{tr.none}</p> : checkups.map(c => (
            <div className="entry" key={c.id}>
              <h3>{fd(c.checkup_date)} — {c.reason}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {t.checkup.doctor} {c.vet_name}{c.clinic_name && ` · ${c.clinic_name}`}
                {c.next_visit_date && ` · ${t.checkup.nextVisit} ${fd(c.next_visit_date)}`}
              </p>
              {c.diagnosis && <p style={{ margin: '4px 0 0' }}><strong>{t.checkup.diagnosis}:</strong> {c.diagnosis}</p>}
              {c.observations && <p style={{ margin: '4px 0 0' }}><strong>{t.checkup.observations}:</strong> {c.observations}</p>}
              {c.medications.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {c.medications.map(m => (
                    <li key={m.id}>
                      {m.name}{m.concentration && ` (${m.concentration})`} — {m.frequency}
                      {m.duration_days != null && ` · ${m.duration_days} ${t.common.days}`}
                      {m.notes && ` · ${m.notes}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <section>
          <h2>{t.profile.examsTitle}</h2>
          {exams.length === 0 ? <p className="muted">{tr.none}</p> : exams.map(e => (
            <div className="entry" key={e.id}>
              <h3>{fd(e.exam_date)} — {e.exam_type}</h3>
              {e.lab_name && <p className="muted" style={{ margin: 0 }}>{e.lab_name}</p>}
              {e.notes && <p style={{ margin: '4px 0 0' }}>{e.notes}</p>}
              {e.exam_values.length > 0 && (
                <table>
                  <thead><tr><th>{t.exam.param}</th><th>{t.exam.value}</th><th>{t.exam.range}</th><th>{t.exam.status}</th></tr></thead>
                  <tbody>
                    {e.exam_values.map(v => (
                      <tr key={v.id}>
                        <td>{v.parameter_name}</td>
                        <td><strong>{v.value}</strong>{v.unit && ` ${v.unit}`}</td>
                        <td>{v.reference_range || '—'}</td>
                        <td>{v.is_abnormal ? t.exam.abnormal : t.exam.normal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      </article>
    </>
  )
}
