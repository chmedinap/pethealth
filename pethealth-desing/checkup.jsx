/* checkup.jsx — Add Checkup form: warm, grouped sections + inline meds */

function Field({ label, req, hint, span2, children }) {
  return (
    <div className={`field${span2 ? " col-2" : ""}`}>
      <label>{label} {req && <span className="req">*</span>}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function FSection({ n, icon, title, sub, children, delay }) {
  return (
    <div className="fsection" style={{ animationDelay: `${delay}ms` }}>
      <div className="fsection-head">
        <div className="fsection-num">{n}</div>
        <div style={{ flex: 1 }}>
          <h3 className="t-h3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={icon} size={18} className="muted" style={{ color: "var(--primary-ink)" }} /> {title}
          </h3>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function AddCheckup({ pet, onBack, onSaved, device }) {
  const [reason, setReason] = React.useState("");
  const [meds, setMeds] = React.useState([{ id: 1, name: "", dose: "", freq: "Once daily", dur: "" }]);
  const medId = React.useRef(2);

  const addMed = () => setMeds(m => [...m, { id: medId.current++, name: "", dose: "", freq: "Once daily", dur: "" }]);
  const delMed = (id) => setMeds(m => m.filter(x => x.id !== id));
  const setMed = (id, key, val) => setMeds(m => m.map(x => x.id === id ? { ...x, [key]: val } : x));

  const save = () => {
    window.celebrate?.({
      title: `Checkup saved for ${pet.name}! 🐾`,
      sub: "Added to their health timeline",
    });
    onSaved();
  };

  const reasons = ["Annual wellness exam", "Vaccination", "Dental", "Sick visit", "Follow-up", "Injury"];

  return (
    <div className="screen form-wrap">
      <button className="back-btn" onClick={onBack}>
        <Icon name="ArrowLeft" size={18} stroke={2.4} /> Back to {pet.name}
      </button>

      <div className="form-hero">
        <div className="fh-ic"><Icon name="Stethoscope" size={26} /></div>
        <div style={{ flex: 1 }}>
          <h1 className="t-h2">Log a checkup for {pet.name} {pet.emoji}</h1>
          <p>A few warm details and you’re done — every visit builds their story.</p>
        </div>
        <PhotoSlot emoji={pet.emoji} tint={pet.tint} label="" className="" style={{ width: 54, height: 54, borderRadius: 16, flex: "none" }} />
      </div>

      {/* 1 — The visit */}
      <FSection n="1" icon="Calendar" title="The visit" sub="When and where did it happen?" delay={0}>
        <div className="fgrid">
          <Field label="Date" req>
            <div className="input-ic">
              <Icon name="Calendar" size={18} />
              <input className="input" type="date" defaultValue="2026-06-08" />
            </div>
          </Field>
          <Field label="Reason for visit" req>
            <select className="select" value={reason || ""} onChange={e => setReason(e.target.value)}>
              <option value="" disabled>Choose a reason…</option>
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Veterinarian">
            <div className="input-ic">
              <Icon name="User" size={18} />
              <input className="input" placeholder="Dr. Amara Reyes" />
            </div>
          </Field>
          <Field label="Clinic">
            <div className="input-ic">
              <Icon name="MapPin" size={18} />
              <input className="input" placeholder="Brookside Animal Hospital" />
            </div>
          </Field>
        </div>
      </FSection>

      {/* 2 — Findings */}
      <FSection n="2" icon="Activity" title="Findings" sub="The vitals and what the vet observed." delay={70}>
        <div className="fgrid-3">
          <Field label="Weight">
            <div className="input-suffix"><input className="input" placeholder="28.4" /><span className="sfx">kg</span></div>
          </Field>
          <Field label="Temperature">
            <div className="input-suffix"><input className="input" placeholder="38.4" /><span className="sfx">°C</span></div>
          </Field>
          <Field label="Heart rate">
            <div className="input-suffix"><input className="input" placeholder="90" /><span className="sfx">bpm</span></div>
          </Field>
        </div>
        <div style={{ height: 15 }} />
        <Field label="Diagnosis / outcome" span2>
          <input className="input" placeholder="e.g. Healthy — all clear" />
        </Field>
        <div style={{ height: 15 }} />
        <Field label="Vet notes" hint="Anything worth remembering for next time.">
          <textarea className="textarea" placeholder="Bright, alert and responsive. Heart and lungs normal…" />
        </Field>
      </FSection>

      {/* 3 — Medications */}
      <FSection n="3" icon="Pill" title="Medications" sub="Add any prescriptions from this visit." delay={140}>
        {meds.map((m, i) => (
          <div className="med-row" key={m.id}>
            <Field label={i === 0 ? "Medication" : ""}>
              <input className="input" placeholder="e.g. Apoquel" value={m.name} onChange={e => setMed(m.id, "name", e.target.value)} />
            </Field>
            <Field label={i === 0 ? "Dose" : ""}>
              <input className="input" placeholder="16 mg" value={m.dose} onChange={e => setMed(m.id, "dose", e.target.value)} />
            </Field>
            <Field label={i === 0 ? "Frequency" : ""}>
              <select className="select" value={m.freq} onChange={e => setMed(m.id, "freq", e.target.value)}>
                {["Once daily", "Twice daily", "Weekly", "Monthly", "As needed"].map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <button className="del" title="Remove" onClick={() => delMed(m.id)} disabled={meds.length === 1}
              style={meds.length === 1 ? { opacity: .4, cursor: "not-allowed" } : null}>
              <Icon name="Trash2" size={18} />
            </button>
          </div>
        ))}
        <button className="add-med" onClick={addMed}>
          <Icon name="Plus" size={18} stroke={2.6} /> Add another medication
        </button>
      </FSection>

      {/* Save */}
      <div className="savebar">
        <div className="sb-glass">
          <span className="sb-note"><Icon name="Sparkles" size={16} style={{ color: "var(--primary-ink)" }} /> {pet.name}’s timeline is about to get healthier</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
            <button className="btn btn-primary" onClick={save}><Icon name="Check" size={18} stroke={2.8} /> Save checkup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddCheckup });
