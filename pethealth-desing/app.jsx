/* app.jsx — shell: theme, routing, device frames, tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#5B8A6E", "#E8A87C", "#7BAFD4"],
  "cardStyle": "portrait",
  "dark": false
}/*EDITMODE-END*/;

const PALETTES = [
  ["#5B8A6E", "#E8A87C", "#7BAFD4"], // Sage (brand)
  ["#8478C2", "#E8A87C", "#7BAFD4"], // Lavender
  ["#D98369", "#6BBF8E", "#7BAFD4"], // Coral
  ["#3F8E9A", "#E8A87C", "#6FA8DC"], // Ocean
];

function BottomNav({ route, onNav, onAdd }) {
  const on = route.name;
  return (
    <div className="bottomnav">
      <button className="bn" data-on={on === "dashboard" ? "1" : "0"} onClick={() => onNav({ name: "dashboard" })}>
        <Icon name="Home" size={22} /> Home
      </button>
      <button className="bn" data-on="0" onClick={() => onNav({ name: "dashboard" })}>
        <Icon name="HeartPulse" size={22} /> Health
      </button>
      <button className="bn-fab" onClick={onAdd} aria-label="Add"><Icon name="Plus" size={26} stroke={2.6} /></button>
      <button className="bn" data-on="0" onClick={() => onNav({ name: "dashboard" })}>
        <Icon name="Bell" size={22} /> Alerts
      </button>
      <button className="bn" data-on="0"><Icon name="User" size={22} /> Profile</button>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ name: "dashboard", pet: null });
  const [device, setDevice] = React.useState("desktop");
  const [lang, setLang] = React.useState("EN");

  const theme = t.dark ? "dark" : "light";
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const palette = t.palette || PALETTES[0];
  const brandVars = { "--primary": palette[0], "--secondary": palette[1], "--accent": palette[2] };

  const go = (r) => { setRoute(r); requestAnimationFrame(() => {
    const sc = document.querySelector(device === "mobile" ? ".phone-screen .scroll" : "window");
    if (sc && sc.scrollTo) sc.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }); };

  const openPet = (pet) => go({ name: "profile", pet });
  const addPet = () => window.celebrate?.({ title: "Add a pet", sub: "This prototype demos Dashboard · Profile · Checkup", icon: "PawPrint", confetti: false });
  const addCheckup = () => go({ name: "checkup", pet: route.pet });

  let screen;
  if (route.name === "profile" && route.pet) {
    screen = <Profile pet={route.pet} device={device} onBack={() => go({ name: "dashboard" })} onAddCheckup={addCheckup} />;
  } else if (route.name === "checkup" && route.pet) {
    screen = <AddCheckup pet={route.pet} device={device}
      onBack={() => go({ name: "profile", pet: route.pet })}
      onSaved={() => go({ name: "profile", pet: route.pet })} />;
  } else {
    screen = <Dashboard cardStyle={t.cardStyle} device={device} onOpen={openPet} onAdd={addPet} />;
  }

  const mobileAdd = () => {
    if (route.name === "profile" && route.pet) addCheckup();
    else if (route.name === "checkup") {/* already here */}
    else addPet();
  };

  const appInner = (
    <div className="app" data-device={device}>
      {device === "desktop" && (
        <Navbar route={route.name} onNav={(n) => go({ name: n })}
          theme={theme} onToggleTheme={() => setTweak("dark", !t.dark)}
          lang={lang} onLang={setLang} />
      )}
      <div className={device === "mobile" ? "scroll" : ""}>
        {screen}
      </div>
      {device === "mobile" && <BottomNav route={route} onNav={go} onAdd={mobileAdd} />}
    </div>
  );

  return (
    <div className="stage" style={brandVars}>
      <div className="devbar">
        <div className="seg">
          <button data-on={device === "desktop" ? "1" : "0"} onClick={() => setDevice("desktop")}>
            <Icon name="Monitor" size={16} /> Desktop
          </button>
          <button data-on={device === "mobile" ? "1" : "0"} onClick={() => setDevice("mobile")}>
            <Icon name="Smartphone" size={16} /> Mobile
          </button>
        </div>
        <div className="seg" title="Theme">
          <button data-on={theme === "light" ? "1" : "0"} onClick={() => setTweak("dark", false)}>
            <Icon name="Sun" size={16} /> Light
          </button>
          <button data-on={theme === "dark" ? "1" : "0"} onClick={() => setTweak("dark", true)}>
            <Icon name="Moon" size={16} /> Dark
          </button>
        </div>
      </div>

      {device === "desktop" ? (
        <div className="desktop-canvas">{appInner}</div>
      ) : (
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-notch" />
            <div className="statusbar">
              <span>9:41</span>
              <span className="sb-icons"><Icon name="Signal" size={15} /><Icon name="Wifi" size={15} /><Icon name="BatteryFull" size={18} /></span>
            </div>
            {appInner}
          </div>
        </div>
      )}

      <Celebrations />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette" />
        <TweakColor label="Accent palette" value={t.palette} options={PALETTES}
          onChange={(v) => setTweak("palette", v)} />
        <TweakSection label="Pet card style" />
        <TweakRadio label="Layout" value={t.cardStyle}
          options={[{ value: "portrait", label: "Portrait" }, { value: "horizontal", label: "Compact" }, { value: "cover", label: "Cover" }]}
          onChange={(v) => setTweak("cardStyle", v)} />
        <TweakSection label="Appearance" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak("dark", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
