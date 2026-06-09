/* profile.jsx — pet hero + checkups/exams records with breathing room */

function Vital({ icon, k, v, unit }) {
  return (
    <div className="vital">
      <div className="vi"><Icon name={icon} size={17} /></div>
      <div>
        <div className="k">{k}</div>
        <div className="v">{v}{unit && <small> {unit}</small>}</div>
      </div>
    </div>
  );
}

function CheckupRecord({ rec, open, onToggle, index }) {
  return (
    <div className="tl-item" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="tl-dot"><Icon name="Stethoscope" size={11} className="muted" style={{ color: "var(--primary-ink)" }} /></div>
      <div className="rec" data-open={open ? "1" : "0"}>
        <div className="rec-head" onClick={onToggle}>
          <div className="rec-ic check"><Icon name="Stethoscope" size={20} /></div>
          <div className="rec-ttl">
            <div className="r1">
              <h4>{rec.reason}</h4>
              {rec.meds.length > 0 && <span className="badge badge-neutral"><Icon name="Pill" size={12} /> {rec.meds.length} med{rec.meds.length > 1 ? "s" : ""}</span>}
            </div>
            <div className="r2">
              <span><Icon name="Calendar" size={13} /> {rec.date}</span>
              <span>·</span>
              <span><Icon name="User" size={13} /> {rec.vet}</span>
            </div>
          </div>
          <Icon name="ChevronDown" size={20} className="rec-chev" />
        </div>
        <div className="rec-body"><div><div className="rec-inner rec-inner-pad">
          <div className="kv">
            <div><div className="k">Clinic</div><div className="v">{rec.clinic}</div></div>
            <div><div className="k">Weight</div><div className="v">{rec.weight}</div></div>
            <div><div className="k">Temperature</div><div className="v">{rec.temp}</div></div>
            <div><div className="k">Diagnosis</div><div className="v">{rec.diagnosis}</div></div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="k" style={{ font: "800 10.5px/1 var(--f-pet)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>Vet notes</div>
            <p className="t-bodysm muted" style={{ margin: 0 }}>{rec.notes}</p>
          </div>
          {rec.meds.length > 0 && (
            <div className="med-list">
              {rec.meds.map((m, i) => (
                <div className="med" key={i}>
                  <div className="mic"><Icon name="Pill" size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <div className="mname">{m.name}</div>
                    <div className="mdose">{m.dose} · {m.freq} · {m.dur}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div></div>
      </div>
    </div>
  );
}

function ExamRecord({ rec, open, onToggle, index }) {
  return (
    <div className="tl-item" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="tl-dot is-exam"><Icon name="FlaskConical" size={11} style={{ color: "var(--accent-ink)" }} /></div>
      <div className="rec" data-open={open ? "1" : "0"}>
        <div className="rec-head" onClick={onToggle}>
          <div className="rec-ic exam"><Icon name="FlaskConical" size={20} /></div>
          <div className="rec-ttl">
            <div className="r1">
              <h4>{rec.name}</h4>
              <span className="badge badge-species"><Icon name="Paperclip" size={12} /> {rec.files.length}</span>
            </div>
            <div className="r2">
              <span><Icon name="Calendar" size={13} /> {rec.date}</span>
              <span>·</span>
              <span>{rec.lab}</span>
            </div>
          </div>
          <Icon name="ChevronDown" size={20} className="rec-chev" />
        </div>
        <div className="rec-body"><div><div className="rec-inner rec-inner-pad">
          <div className="kv">
            <div><div className="k">Result</div><div className="v">{rec.result}</div></div>
            <div><div className="k">Laboratory</div><div className="v">{rec.lab}</div></div>
          </div>
          <div className="attach">
            {rec.files.map((f, i) => {
              const ext = f.split(".").pop().toUpperCase();
              return (
                <div className="attach-item" key={i}>
                  <div className="fic">{ext}</div>
                  {f}
                  <Icon name="Download" size={15} className="muted-3" />
                </div>
              );
            })}
          </div>
        </div></div></div>
      </div>
    </div>
  );
}

function Profile({ pet, onBack, onAddCheckup, device }) {
  const [tab, setTab] = React.useState("checkups");
  const [openId, setOpenId] = React.useState(window.CHECKUPS[pet.id]?.[0]?.id);
  const checkups = window.CHECKUPS[pet.id] || [];
  const exams = window.EXAMS[pet.id] || [];
  const toggle = (id) => setOpenId(cur => (cur === id ? null : id));

  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack}>
        <Icon name="ArrowLeft" size={18} stroke={2.4} /> All companions
      </button>

      <div className="profile-grid">
        {/* HERO */}
        <aside className="pet-hero">
          <div className="card" style={{ overflow: "hidden", padding: 0 }}>
            <div style={{ position: "relative" }}>
              <PhotoSlot emoji={pet.emoji} tint={pet.tint} label={`${pet.name} photo`} />
              <div style={{ position: "absolute", left: 14, bottom: 14 }}><StatusPill status={pet.status} /></div>
            </div>
            <div className="pet-hero-body">
              <h1 className="t-h1">{pet.name} <span style={{ fontSize: 24 }}>{pet.emoji}</span></h1>
              <div className="pet-badges">
                <SpeciesBadge pet={pet} />
                <GenderBadge gender={pet.gender} />
              </div>
              <div className="vitals">
                <Vital icon="Cake" k="Age" v={pet.age} />
                <Vital icon="Scale" k="Weight" v={pet.weight} unit="kg" />
                <Vital icon="Syringe" k="Next vaccine" v={<span style={{ fontSize: 14 }}>{pet.nextVaccine}</span>} />
                <Vital icon="Stethoscope" k="Last visit" v={<span style={{ fontSize: 13 }}>{pet.lastCheckup}</span>} />
              </div>
              <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "13px 15px", marginBottom: 16 }}>
                <div className="t-label muted-3" style={{ marginBottom: 6 }}>📝 Notes</div>
                <p className="t-bodysm muted" style={{ margin: 0 }}>{pet.notes}</p>
              </div>
              <div className="hero-actions">
                <button className="btn btn-primary btn-block"><Icon name="Pencil" size={17} /> Edit</button>
                <button className="icon-btn" title="Share"><Icon name="Share2" size={18} /></button>
                <button className="icon-btn" title="More"><Icon name="MoreHorizontal" size={18} /></button>
              </div>
            </div>
          </div>
        </aside>

        {/* RECORDS */}
        <section>
          <div className="records-head">
            <div className="tabs">
              <button className="tab" data-on={tab === "checkups" ? "1" : "0"} onClick={() => setTab("checkups")}>
                <Icon name="Stethoscope" size={16} /> Checkups <span className="pill-n">{checkups.length}</span>
              </button>
              <button className="tab" data-on={tab === "exams" ? "1" : "0"} onClick={() => setTab("exams")}>
                <Icon name="FlaskConical" size={16} /> Exams <span className="pill-n">{exams.length}</span>
              </button>
            </div>
            <div style={{ marginLeft: "auto" }} />
            <button className="btn btn-primary" onClick={onAddCheckup}>
              <Icon name="Plus" size={18} stroke={2.6} /> {tab === "checkups" ? "Add checkup" : "Add exam"}
            </button>
          </div>

          {tab === "checkups" ? (
            checkups.length ? (
              <div className="timeline">
                {checkups.map((c, i) => (
                  <CheckupRecord key={c.id} rec={c} index={i} open={openId === c.id} onToggle={() => toggle(c.id)} />
                ))}
              </div>
            ) : (
              <div className="section-empty">
                <span className="se-emoji">🩺</span>
                <h3 className="t-h3" style={{ margin: "0 0 6px" }}>No checkups logged yet</h3>
                <p className="t-bodysm" style={{ margin: "0 0 16px" }}>Record {pet.name}’s vet visits to build a complete health history.</p>
                <button className="btn btn-primary" onClick={onAddCheckup}><Icon name="Plus" size={18} stroke={2.6} /> Log first checkup</button>
              </div>
            )
          ) : (
            exams.length ? (
              <div className="timeline">
                {exams.map((e, i) => (
                  <ExamRecord key={e.id} rec={e} index={i} open={openId === e.id} onToggle={() => toggle(e.id)} />
                ))}
              </div>
            ) : (
              <div className="section-empty">
                <span className="se-emoji">🔬</span>
                <h3 className="t-h3" style={{ margin: "0 0 6px" }}>No lab exams yet</h3>
                <p className="t-bodysm" style={{ margin: "0 0 16px" }}>Upload lab results and imaging to keep everything in one place.</p>
                <button className="btn btn-primary"><Icon name="Plus" size={18} stroke={2.6} /> Add first exam</button>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}

Object.assign(window, { Profile });
