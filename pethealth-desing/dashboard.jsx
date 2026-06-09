/* dashboard.jsx — pet grid, search, filters, FAB, 3 card variations */

function PetCard({ pet, style, index, onOpen }) {
  const [fav, setFav] = React.useState(pet.fav);
  const delay = { animationDelay: `${index * 70}ms` };

  const Fav = (
    <button className="fav" data-on={fav ? "1" : "0"} title="Favorite"
      onClick={(e) => { e.stopPropagation(); setFav(v => !v); }}>
      <Icon name="Heart" size={17} stroke={2.4} style={{ fill: fav ? "currentColor" : "none" }} />
    </button>
  );

  /* ---------- COVER ---------- */
  if (style === "cover") {
    return (
      <article className="petcard pc-cover" style={delay} onClick={() => onOpen(pet)}>
        <PhotoSlot emoji={pet.emoji} tint={pet.tint} label={`${pet.name} photo`} className="cover-photo" />
        <div className="cover-grad" />
        {Fav}
        <div className="cover-top"><StatusPill status={pet.status} /></div>
        <div className="cover-body">
          <h3 className="pc-name t-h2">{pet.name}</h3>
          <div className="cover-meta">{pet.emoji} {pet.breed} · {pet.age}</div>
          <div className="pc-next" style={{ color: "rgba(255,255,255,.85)" }}>
            <Icon name="Stethoscope" size={15} /> Last checkup {pet.lastCheckup}
          </div>
        </div>
      </article>
    );
  }

  /* ---------- HORIZONTAL ---------- */
  if (style === "horizontal") {
    return (
      <article className="petcard pc-horizontal" style={delay} onClick={() => onOpen(pet)}>
        <PhotoSlot emoji={pet.emoji} tint={pet.tint} label={pet.name} />
        <div className="pc-body">
          <div className="pc-row" style={{ justifyContent: "space-between" }}>
            <h3 className="pc-name t-h3">{pet.name}</h3>
            {Fav}
          </div>
          <div className="pc-meta">{pet.emoji} {pet.breed} · {pet.age}</div>
          <StatusPill status={pet.status} />
          <div className="pc-foot" style={{ marginTop: 14 }}>
            <span className="pc-next"><Icon name="Scale" size={15} /> {pet.weight} kg</span>
            <span className="pc-next"><Icon name="Syringe" size={15} /> {pet.nextVaccine}</span>
          </div>
        </div>
      </article>
    );
  }

  /* ---------- PORTRAIT (default) ---------- */
  return (
    <article className="petcard pc-portrait" style={delay} onClick={() => onOpen(pet)}>
      <div style={{ position: "relative" }}>
        <PhotoSlot emoji={pet.emoji} tint={pet.tint} label={`${pet.name} photo`} />
        {Fav}
        <div style={{ position: "absolute", left: 12, top: 12 }}><StatusPill status={pet.status} /></div>
      </div>
      <div className="pc-body">
        <div className="pc-row" style={{ justifyContent: "space-between" }}>
          <h3 className="pc-name t-h3">{pet.name}</h3>
          <span className="badge badge-neutral"><span className="emoji">{pet.emoji}</span>{pet.age}</span>
        </div>
        <div className="pc-meta">{pet.breed}</div>
        <div className="pc-stats">
          <div className="pc-stat">
            <div className="k">Weight</div>
            <div className="v"><Icon name="Scale" size={15} className="muted" /> {pet.weight}<span className="muted-3" style={{ fontSize: 12 }}>kg</span></div>
          </div>
          <div className="pc-stat">
            <div className="k">Next vaccine</div>
            <div className="v" style={{ fontSize: 13.5 }}><Icon name="Syringe" size={15} className="muted" /> {pet.nextVaccine}</div>
          </div>
        </div>
        <div className="pc-foot">
          <span className="pc-next"><Icon name="Stethoscope" size={15} /> {pet.lastCheckup}</span>
          <Icon name="ArrowRight" size={18} className="muted-3" />
        </div>
      </div>
    </article>
  );
}

function Dashboard({ cardStyle, onOpen, onAdd, device }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const pets = window.PETS;

  const counts = {
    all: pets.length,
    dog: pets.filter(p => p.species === "dog").length,
    cat: pets.filter(p => p.species === "cat").length,
    fav: pets.filter(p => p.fav).length,
  };
  const visible = pets.filter(p => {
    const okFilter = filter === "all" || (filter === "fav" ? p.fav : p.species === filter);
    const okQuery = !query || (p.name + p.breed).toLowerCase().includes(query.toLowerCase());
    return okFilter && okQuery;
  });

  const search = (
    <div className="searchbox">
      <Icon name="Search" size={18} className="muted-3" />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or breed…" />
      {query && <button className="icon-btn" style={{ width: 26, height: 26, border: 0, background: "transparent" }} onClick={() => setQuery("")}><Icon name="X" size={15} /></button>}
    </div>
  );

  return (
    <div className="screen">
      {device === "mobile" ? (
        <div className="topbar-m">
          <div className="brand">
            <div className="brand-mark" style={{ width: 34, height: 34, borderRadius: 11 }}><Icon name="PawPrint" size={18} stroke={2.4} /></div>
            <div><div className="brand-name" style={{ fontSize: 16 }}>Pet<span>Health</span></div></div>
          </div>
          <div style={{ marginLeft: "auto" }} />
          <div className="avatar" style={{ width: 36, height: 36 }}>M</div>
        </div>
      ) : null}

      <div className="dash-head">
        <div className="dash-greet">
          <h1 className="t-h1">Good morning, Maria <span className="leaf">🌿</span></h1>
          <p className="muted t-body dash-sub">
            {counts.all} companions in your care · everyone’s tails are wagging
          </p>
        </div>
        {device !== "mobile" && (
          <div className="dash-tools">
            {search}
            <button className="btn btn-primary" onClick={onAdd}><Icon name="Plus" size={18} stroke={2.6} /> Add pet</button>
          </div>
        )}
      </div>

      {device === "mobile" && <div style={{ marginBottom: 16 }}>{search}</div>}

      <div className="filters">
        {[
          { k: "all", label: "All", emoji: "🐾" },
          { k: "dog", label: "Dogs", emoji: "🐶" },
          { k: "cat", label: "Cats", emoji: "🐱" },
          { k: "fav", label: "Favorites", emoji: "💚" },
        ].map(f => (
          <button key={f.k} className="chip" data-on={filter === f.k ? "1" : "0"} onClick={() => setFilter(f.k)}>
            <span>{f.emoji}</span> {f.label} <span className="count">{counts[f.k]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <div className="empty-art">{query ? "🔍" : "🐾"}</div>
          <h2 className="t-h2">{query ? "No companions found" : "No pets yet"}</h2>
          <p className="t-body">{query ? "Try a different name or breed." : "Add your first furry friend to start tracking their health journey."}</p>
          <button className="btn btn-primary btn-lg" onClick={onAdd}><Icon name="Plus" size={19} stroke={2.6} /> Add your first pet</button>
        </div>
      ) : (
        <div className={`cards cards--${cardStyle}`}>
          {visible.map((p, i) => (
            <PetCard key={p.id} pet={p} style={cardStyle} index={i} onOpen={onOpen} />
          ))}
        </div>
      )}

      {device !== "mobile" && (
        <button className="fab" onClick={onAdd} title="Add pet" aria-label="Add pet">
          <Icon name="Plus" size={26} stroke={2.6} />
        </button>
      )}
    </div>
  );
}

Object.assign(window, { Dashboard, PetCard });
