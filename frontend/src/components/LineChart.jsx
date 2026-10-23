import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate } from '../utils/format'
import { niceTicks } from '../utils/chart'

const M = { top: 18, right: 56, bottom: 28, left: 44 }
const LOCALES = { es: 'es-ES', en: 'en-US' }

function toTime(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

function formatNumber(v, lang) {
  return v.toLocaleString(LOCALES[lang] || LOCALES.es, { maximumFractionDigits: 2 })
}

/**
 * Gráfica de una sola serie en el tiempo (sin leyenda: el título la nombra).
 * points: [{ date: 'YYYY-MM-DD', value: number, flagged?: bool, note?: string }]
 * band:   { min, max, label } — rango de referencia, dibujado como franja neutra
 * Los puntos `flagged` usan otra forma (rombo) además de otro color, porque el
 * verde de la marca y el rojo de alerta no se distinguen con protanopía.
 */
export default function LineChart({ points, unit = '', band = null, lang = 'es', ariaLabel, flaggedLabel = '', height = 220 }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(600)
  const [active, setActive] = useState(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const geo = useMemo(() => {
    const innerW = width - M.left - M.right
    const innerH = height - M.top - M.bottom
    const times = points.map(p => toTime(p.date))
    const tMin = Math.min(...times)
    const tMax = Math.max(...times)
    const x = t => (tMax === tMin ? M.left + innerW / 2 : M.left + ((t - tMin) / (tMax - tMin)) * innerW)

    const values = points.map(p => p.value)
    if (band) values.push(band.min, band.max)
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.08
    // Si los datos no son negativos, el eje no baja de cero (no hay pesos negativos)
    const yTicks = niceTicks(lo >= 0 ? Math.max(0, lo - pad) : lo - pad, hi + pad)
    const yMin = yTicks[0]
    const yMax = yTicks[yTicks.length - 1]
    const y = v => M.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    // Hasta 5 fechas en el eje X, repartidas entre los puntos
    const n = points.length
    const idx = n <= 5 ? points.map((_, i) => i) : [...new Set([0, 1, 2, 3, 4].map(k => Math.round((k * (n - 1)) / 4)))]
    const fmt = new Intl.DateTimeFormat(LOCALES[lang] || LOCALES.es, { month: 'short', year: '2-digit' })
    const xTicks = idx.map(i => ({ x: x(times[i]), label: fmt.format(new Date(times[i])) }))

    const coords = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p.value) }))
    return { innerW, innerH, yTicks, y, xTicks, coords }
  }, [points, band, width, height, lang])

  if (points.length === 0) return null
  const { coords, yTicks, y, xTicks } = geo
  const last = coords[coords.length - 1]
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx},${c.cy}`).join(' ')
  const activePoint = active != null ? coords[active] : null

  function nearest(clientX) {
    const rect = wrapRef.current.getBoundingClientRect()
    const px = ((clientX - rect.left) / rect.width) * width
    let best = 0
    coords.forEach((c, i) => { if (Math.abs(c.cx - px) < Math.abs(coords[best].cx - px)) best = i })
    return best
  }

  function onKeyDown(e) {
    const keys = { ArrowLeft: -1, ArrowRight: 1 }
    if (e.key in keys) {
      e.preventDefault()
      setActive(a => Math.min(coords.length - 1, Math.max(0, (a ?? coords.length - 1) + keys[e.key])))
    } else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(coords.length - 1) }
  }

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive(a => a ?? coords.length - 1)}
        onBlur={() => setActive(null)}
      >
        {band && (
          <g>
            <rect className="band" x={M.left} width={geo.innerW} y={y(band.max)} height={Math.max(1, y(band.min) - y(band.max))} />
            {band.label && <text className="band-label" x={M.left + 6} y={y(band.max) + 13}>{band.label}</text>}
          </g>
        )}

        <g className="grid axis">
          {yTicks.map(v => (
            <g key={v}>
              <line x1={M.left} x2={M.left + geo.innerW} y1={y(v)} y2={y(v)} />
              <text x={M.left - 8} y={y(v) + 4} textAnchor="end">{formatNumber(v, lang)}</text>
            </g>
          ))}
        </g>
        <g className="axis">
          {xTicks.map((tk, i) => (
            <text key={i} x={tk.x} y={height - 8} textAnchor="middle">{tk.label}</text>
          ))}
        </g>

        {activePoint && <line className="crosshair" x1={activePoint.cx} x2={activePoint.cx} y1={M.top} y2={M.top + geo.innerH} />}

        {coords.length > 1 && <path className="series-line" d={line} />}

        {coords.map((c, i) => {
          const r = i === active ? 6 : 4
          return c.flagged
            ? <path key={i} className="marker flagged" d={`M${c.cx},${c.cy - r - 1.5} L${c.cx + r + 1.5},${c.cy} L${c.cx},${c.cy + r + 1.5} L${c.cx - r - 1.5},${c.cy} Z`} />
            : <circle key={i} className="marker" cx={c.cx} cy={c.cy} r={r} />
        })}

        {/* Solo se etiqueta el último valor; el resto vive en el tooltip y la tabla */}
        <text className="end-label" x={last.cx + 10} y={last.cy + 4}>{formatNumber(last.value, lang)}{unit && ` ${unit}`}</text>

        {/* Capa de interacción: toda el área, el crosshair busca la fecha más cercana */}
        <rect
          x={M.left - 10} y={M.top} width={geo.innerW + 20} height={geo.innerH}
          fill="transparent"
          onPointerMove={e => setActive(nearest(e.clientX))}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {activePoint && (
        <div className="chart-tooltip" style={{ left: `${(activePoint.cx / width) * 100}%`, top: `${(activePoint.cy / height) * 100}%` }}>
          <strong>
            {activePoint.flagged && '⚠ '}{formatNumber(activePoint.value, lang)}{unit && ` ${unit}`}
          </strong>
          {formatDate(activePoint.date, lang)}
          {activePoint.flagged && flaggedLabel && <> · {flaggedLabel}</>}
          {activePoint.note && <div>{activePoint.note}</div>}
        </div>
      )}
    </div>
  )
}
