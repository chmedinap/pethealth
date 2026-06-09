/* ui.jsx — shared building blocks */

const SPECIES_EMOJI = { dog: "🐶", cat: "🐱" };

/* ---- Photo placeholder slot ---- */
function PhotoSlot({ emoji, tint, label = "Pet photo", className = "", style }) {
  return (
    <div className={`photo ${className}`} style={{ "--tint": tint, ...style }}>
      <span className="ph-emoji">{emoji}</span>
      <span className="ph-label">{label}</span>
    </div>
  );
}

/* ---- Status pill (health signal) ---- */
function StatusPill({ status }) {
  const s = window.STATUS_LABEL[status] || window.STATUS_LABEL.ok;
  return (
    <span className={`status ${s.cls}`}>
      <span className="dot" />
      {s.label}
    </span>
  );
}

/* ---- Species + gender badges ---- */
function SpeciesBadge({ pet }) {
  return (
    <span className={`badge badge-${pet.species}`}>
      <span className="emoji">{pet.emoji}</span>
      {pet.breed}
    </span>
  );
}
function GenderBadge({ gender }) {
  return (
    <span className={`badge badge-gender-${gender}`}>
      <Icon name={gender === "f" ? "Venus" : "Mars"} size={13} stroke={2.6} />
      {gender === "f" ? "Female" : "Male"}
    </span>
  );
}

/* ---- Top navigation (desktop) ---- */
function Navbar({ route, onNav, theme, onToggleTheme, lang, onLang }) {
  return (
    <nav className="nav">
      <div className="brand">
        <div className="brand-mark"><Icon name="PawPrint" size={22} stroke={2.4} /></div>
        <div>
          <div className="brand-name">Pet<span>Health</span></div>
          <div className="brand-sub">Tracker</div>
        </div>
      </div>
      <div className="nav-links">
        <button className="nav-link" data-on={route === "dashboard" ? "1" : "0"} onClick={() => onNav("dashboard")}>
          <Icon name="LayoutGrid" size={17} /> Companions
        </button>
        <button className="nav-link" data-on="0" onClick={() => onNav("dashboard")}>
          <Icon name="Bell" size={17} /> Reminders
        </button>
        <button className="nav-link" data-on="0" onClick={() => onNav("dashboard")}>
          <Icon name="HeartPulse" size={17} /> Health
        </button>
      </div>
      <div className="nav-spacer" />
      <div className="lang-toggle">
        <button data-on={lang === "EN" ? "1" : "0"} onClick={() => onLang("EN")}>EN</button>
        <button data-on={lang === "ES" ? "1" : "0"} onClick={() => onLang("ES")}>ES</button>
      </div>
      <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme" title="Toggle theme">
        <Icon name={theme === "dark" ? "Sun" : "Moon"} size={19} />
      </button>
      <div className="avatar" title="Maria">M</div>
    </nav>
  );
}

/* ---- Toast + confetti host (imperative via window.celebrate) ---- */
function Celebrations() {
  const [toast, setToast] = React.useState(null);
  const [burst, setBurst] = React.useState(null);

  React.useEffect(() => {
    window.celebrate = (opts) => {
      setToast(opts);
      if (opts.confetti !== false) {
        setBurst(Date.now());
        setTimeout(() => setBurst(null), 2600);
      }
      clearTimeout(window.__toastT);
      window.__toastT = setTimeout(() => setToast(null), 3400);
    };
    return () => { delete window.celebrate; };
  }, []);

  const pieces = ["🐾", "💚", "🐾", "✨", "🐾", "🦴", "💚", "✨", "🐾", "🩺", "🐾", "✨", "💛", "🐾"];
  return (
    <>
      {burst && (
        <div className="confetti" key={burst}>
          {pieces.map((p, i) => (
            <i key={i} style={{
              left: `${6 + Math.random() * 88}%`,
              "--d": `${1.8 + Math.random() * 1.4}s`,
              "--r": `${(Math.random() * 720 - 360) | 0}deg`,
              animationDelay: `${Math.random() * .4}s`,
              fontSize: `${15 + Math.random() * 14}px`,
            }}>{p}</i>
          ))}
        </div>
      )}
      {toast && (
        <div className="toast-wrap">
          <div className="toast">
            <span className="tk" style={toast.confetti === false ? { background: "var(--primary)" } : null}>
              <Icon name={toast.icon || "Check"} size={19} stroke={2.8} />
            </span>
            <div>
              <div>{toast.title}</div>
              {toast.sub && <div className="tsub">{toast.sub}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, {
  PhotoSlot, StatusPill, SpeciesBadge, GenderBadge, Navbar, Celebrations, SPECIES_EMOJI,
});
