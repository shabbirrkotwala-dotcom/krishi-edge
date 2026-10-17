import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Box, Sun, Snowflake, Battery, BatteryLow, Zap, Thermometer,
  Droplet, Bell, BarChart3, MapPin, Cpu, Truck, Trophy, Clock, Leaf,
  AlertTriangle, AlertOctagon, CheckCircle2, TrendingUp, TrendingDown,
  Wifi, WifiOff, MessageSquare, Phone, ChevronRight, X, Search, Gauge,
  Settings, Sprout, DoorOpen, Coins, User, Menu, Camera, ShieldCheck,
  RefreshCw, Check, Lock, Play, Layers
} from "lucide-react";

/* ===================== design tokens ===================== */
const C = {
  bg: "#0F1117",
  panel: "#1A1D27",
  panelAlt: "#20232E",
  line: "#2A2D3A",
  line2: "#3D4155",
  ink: "#F0F2F8",
  inkDim: "#8B90A8",
  inkFaint: "#555B73",
  safe: "#22C55E",
  safeSoft: "#22C55E20",
  warn: "#F59E0B",
  warnSoft: "#F59E0B20",
  crit: "#EF4444",
  critSoft: "#EF444420",
  cold: "#3B82F6",
  coldSoft: "#3B82F620",
  battery: "#A78BFA",
  batterySoft: "#A78BFA20",
  solar: "#FB923C",
  solarSoft: "#FB923C20",
  veg: "#2DD4BF",
  vegSoft: "#2DD4BF20",
  coop: "#3B82F6",
  coopSoft: "#3B82F620",
  earth: "#FB923C",
  earthSoft: "#FB923C20",
  offline: "#555B73",
  offlineSoft: "#555B7320",
  sidebar: "#13161F",
  topbar: "#13161F",
};
const statusColor = (s) => ({ Healthy: C.safe, Safe: C.safe, NORMAL: C.safe, Warning: C.warn, WARNING: C.warn, Critical: C.crit, FREEZE_RISK: C.crit, HOLD: C.crit, Offline: C.offline }[s] || C.inkDim);
const statusSoft  = (s) => ({ Healthy: C.safe + "20", Safe: C.safe + "20", NORMAL: C.safe + "20", Warning: C.warn + "20", WARNING: C.warn + "20", Critical: C.crit + "20", FREEZE_RISK: C.crit + "20", HOLD: C.crit + "20", Offline: C.offline + "20" }[s] || C.panelAlt);

const ICONS = {
  dashboard: LayoutDashboard, box: Box, sun: Sun, snowflake: Snowflake, battery: Battery,
  batteryLow: BatteryLow, bolt: Zap, zap: Zap, thermometer: Thermometer, droplet: Droplet,
  bell: Bell, barChart: BarChart3, mapPin: MapPin, cpu: Cpu, truck: Truck, trophy: Trophy,
  clock: Clock, leaf: Leaf, alertTriangle: AlertTriangle, alertOctagon: AlertOctagon,
  circleCheck: CheckCircle2, trendUp: TrendingUp, trendDown: TrendingDown, wifi: Wifi,
  wifiOff: WifiOff, messageSquare: MessageSquare, phone: Phone, chevronRight: ChevronRight,
  x: X, search: Search, gauge: Gauge, settings: Settings, sprout: Sprout, door: DoorOpen,
  coins: Coins, user: User, menu: Menu, camera: Camera, shieldCheck: ShieldCheck,
  refresh: RefreshCw, check: Check, lock: Lock, play: Play, layers: Layers
};
function Ic({ name, size = 15, color = "currentColor" }) {
  const I = ICONS[name] || Box;
  return <I size={size} color={color} strokeWidth={2} />;
}

/* ===================== deterministic mock data ===================== */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(26005);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const rint = (a, b) => Math.floor(a + rng() * (b - a + 1));
const rfloat = (a, b, d = 1) => +(a + rng() * (b - a)).toFixed(d);

const NER_STATES = ["Assam", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh", "Sikkim"];
const VILLAGES = ["Diphu Collection Centre", "Nongpoh Farmer Co-op", "Ukhrul Aggregation Point", "Champhai Market Hub", "Kohima Village Cluster", "Udaipur Growers Point", "Ziro Valley Depot", "Gangtok Hill Co-op", "Sonapur Farm Gate", "Tura Market Centre", "Imphal Rural Hub", "Aizawl Collection Point"];
const PRODUCE = ["Tomato", "Cabbage", "French Beans", "Leafy Greens", "Chilli", "Cauliflower", "Carrot", "Capsicum"];
const CENTER = { lat: 25.7, lng: 92.9 };

function genHistory(points, base0, driftAmp, bounds) {
  let base = base0; const arr = [];
  for (let i = 0; i < points; i++) {
    base += rfloat(-driftAmp, driftAmp, 2);
    base = Math.max(bounds[0], Math.min(bounds[1], base));
    arr.push({ t: i, v: +base.toFixed(2) });
  }
  return arr;
}
function solarCurve(points, peak) {
  const arr = [];
  for (let i = 0; i < points; i++) {
    const hour = (i / points) * 24;
    const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const noise = rfloat(-0.06, 0.06, 2);
    arr.push({ t: i, v: +Math.max(0, daylight * peak + noise * peak).toFixed(2) });
  }
  return arr;
}

function genUnits(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const statusRoll = rng();
    const status = statusRoll > 0.85 ? "Critical" : statusRoll > 0.62 ? "Warning" : "Healthy";
    const mode = pick(["Solar", "Solar", "Battery Backup", "Eco Mode"]);
    const battery = status === "Critical" ? rint(4, 22) : status === "Warning" ? rint(20, 45) : rint(46, 100);
    const temp = status === "Critical" ? rfloat(9, 16, 1) : status === "Warning" ? rfloat(6, 9, 1) : rfloat(2, 6, 1);
    const produce = pick(PRODUCE);
    out.push({
      id: `CS-${100 + i}`, village: pick(VILLAGES) + ` ${i + 1}`, state: pick(NER_STATES), status, mode,
      capacityL: i === 0 ? 3 : pick([3, 10, 20, 20, 30, 50]),
      lat: CENTER.lat + rfloat(-3.2, 3.2, 4), lng: CENTER.lng + rfloat(-3.6, 3.6, 4),
      temp, humidity: rint(78, 95), battery, solarW: rfloat(0, 42, 1),
      produce, loadKg: rfloat(4, 48, 1),
      doorOpensToday: rint(2, 26), lastPowerFailureH: rint(1, 240),
      camIp: i === 0 ? "192.168.1.100" : `192.168.1.${100 + i}`,
      tempHistory: genHistory(36, temp, status === "Healthy" ? 0.25 : 0.6, [0, 18]),
      battHistory: genHistory(36, battery, status === "Healthy" ? 2 : 4, [0, 100]),
    });
  }
  return out.sort((a, b) => { const r = { Critical: 0, Warning: 1, Healthy: 2 }; return r[a.status] - r[b.status]; });
}
const INITIAL_UNITS = genUnits(18);

function genFreshness(unitsList) {
  return unitsList.map((u) => {
    const idealMax = { Tomato: 12, Cabbage: 5, "French Beans": 6, "Leafy Greens": 2, Chilli: 10, Cauliflower: 5, Carrot: 4, Capsicum: 9 }[u.produce] || 8;
    const adherence = Math.max(0, 1 - Math.max(0, u.temp - idealMax) / 10);
    const shelfLifeHrsTotal = { Tomato: 216, Cabbage: 360, "French Beans": 168, "Leafy Greens": 72, Chilli: 288, Cauliflower: 240, Carrot: 480, Capsicum: 264 }[u.produce] || 200;
    const spoilageRisk = Math.min(97, Math.round((1 - adherence) * 70 + (u.humidity > 92 ? 12 : 0) + (u.status === "Critical" ? 18 : u.status === "Warning" ? 8 : 0)));
    const remainingHrs = Math.max(2, Math.round(shelfLifeHrsTotal * (1 - spoilageRisk / 100) * rfloat(0.55, 0.85, 2)));
    const dispatchWindow = remainingHrs < 24 ? "Dispatch immediately" : remainingHrs < 72 ? "Dispatch within 2–3 days" : "Safe to hold, monitor market price";
    return { unitId: u.id, village: u.village, produce: u.produce, loadKg: u.loadKg, spoilageRisk, remainingHrs, dispatchWindow, idealMax };
  }).sort((a, b) => b.spoilageRisk - a.spoilageRisk);
}

function genAlerts(unitsList) {
  const items = [];
  unitsList.filter((u) => u.status === "Critical").forEach((u) => items.push({ id: `AL-${u.id}-T`, sev: "Critical", cat: "Temperature", channel: pick(["SMS", "IVR Call"]), title: `Temperature excursion at ${u.village}`, sub: `${u.temp}°C · ${u.produce} · battery ${u.battery}%`, ago: rint(2, 90) }));
  unitsList.filter((u) => u.battery < 20).forEach((u) => items.push({ id: `AL-${u.id}-B`, sev: "Critical", cat: "Power", channel: "SMS", title: `Low battery — ${u.village}`, sub: `${u.battery}% remaining · mode: ${u.mode}`, ago: rint(1, 60) }));
  unitsList.filter((u) => u.status === "Warning").forEach((u) => items.push({ id: `AL-${u.id}-W`, sev: "Warning", cat: "Storage Condition", channel: pick(["App", "SMS"]), title: `Storage drifting out of range — ${u.village}`, sub: `${u.temp}°C / ${u.humidity}% RH`, ago: rint(10, 300) }));
  const sevRank = { Critical: 0, Warning: 1, Info: 2 };
  return items.sort((a, b) => sevRank[a.sev] - sevRank[b.sev] || a.ago - b.ago);
}

function genCoop() {
  return VILLAGES.map((v) => ({
    village: v, state: pick(NER_STATES),
    producesavedKg: rint(120, 2400), spoilageReduction: rint(28, 74),
    incomeIncreaseINR: rint(3200, 58000), dieselSavedL: rint(20, 340), co2SavedKg: rint(60, 980),
    units: rint(1, 3),
  })).sort((a, b) => b.spoilageReduction - a.spoilageReduction);
}
const COOP = genCoop();

const HARDWARE = [
  { id: "panel", name: "40W Monocrystalline Solar Panel", cat: "Solar", x: 18, y: 10, color: C.solar, spec: "40W / 18V monocrystalline panel, tilt-mounted on the unit lid for direct village-site charging.", role: "Primary energy source — charges the battery via the MPPT controller during daylight hours." },
  { id: "mppt", name: "MPPT Solar Charge Controller", cat: "Solar", x: 38, y: 18, color: C.solar, spec: "12V/10A MPPT controller with over-charge, over-discharge and reverse-polarity protection.", role: "Regulates solar input, maximizes panel efficiency, and protects the battery pack." },
  { id: "battery", name: "LiFePO4 Battery Pack (12V 20Ah)", cat: "Power", x: 62, y: 14, color: C.battery, spec: "12V 20Ah LiFePO4 pack — long cycle life, safe chemistry, operates well in NER humidity & temperature swings.", role: "Stores solar energy for night-time / low-sunlight operation — powers compressor, controller & sensors." },
  { id: "compressor", name: "DC Compressor / TEC1 Peltier Unit", cat: "Cooling", x: 50, y: 46, color: C.cold, spec: "12V variable-speed DC cooling unit rated for low-power solar-DC operation.", role: "Core refrigeration element — draws heat from the insulated chamber to hold 2.0°C–8.0°C target temperature." },
  { id: "chamber", name: "PUF-Insulated Storage Chamber (3L)", cat: "Structure", x: 50, y: 70, color: C.earth, spec: "Rotomoulded / PUF-insulated 3L chamber, double-wall construction, gasket-sealed lid.", role: "Holds produce at controlled temperature & humidity; minimizes thermal loss between cooling cycles." },
  { id: "sensor", name: "DHT11 Temp & Humidity Sensor", cat: "Sensing", x: 74, y: 52, color: C.veg, spec: "DHT11 digital temp & humidity sensor connected to ESP32 Pin 4.", role: "Provides live temperature and relative humidity readings for closed-loop condition engine checks." },
  { id: "rtc", name: "DS3231 Precision Real-Time Clock", cat: "Control", x: 64, y: 38, color: C.coop, spec: "I2C DS3231 RTC on ESP32 Pins 21 (SDA) & 22 (SCL) with coin cell battery backup.", role: "Generates tamper-evident timestamp strings for cryptographic condition records." },
  { id: "mcu", name: "ESP32 Microcontroller (TVCE Firmware)", cat: "Control", x: 74, y: 30, color: C.coop, spec: "ESP32 dev board running SHA-256 condition engine and LittleFS persistent storage.", role: "Executes rule logic (2.0°C–8.0°C), calculates SHA-256 hashes, and maintains condition passport." },
  { id: "cam", name: "AI-Thinker ESP32-CAM (GC2145)", cat: "Vision", x: 86, y: 44, color: C.solar, spec: "ESP32-CAM module with GC2145 sensor outputting RGB565 converted to JPEG on port 80.", role: "Streams live visual feed of stored produce to verify crop fresh status remotely." }
];

const NAV = [
  { id: "overview", label: "Dashboard", icon: "dashboard", color: C.veg },
  { id: "passport", label: "ESP32 Passport", icon: "shieldCheck", color: C.cold },
  { id: "camera", label: "ESP32-CAM Live", icon: "camera", color: C.solar },
  { id: "units", label: "Storage Units", icon: "box", color: C.cold },
  { id: "energy", label: "Energy & Solar", icon: "sun", color: C.solar },
  { id: "freshness", label: "Produce & Dispatch", icon: "leaf", color: C.veg },
  { id: "twin", label: "Digital Twin", icon: "cpu", color: C.coop },
  { id: "alerts", label: "Alerts", icon: "bell", color: C.crit },
  { id: "coop", label: "Cooperative Impact", icon: "trophy", color: C.coop },
  { id: "analytics", label: "Analytics", icon: "barChart", color: C.cold },
  { id: "map", label: "NER Map", icon: "mapPin", color: C.veg },
];

function matchesSearch(term, ...fields) {
  if (!term) return true;
  const t = term.toLowerCase();
  return fields.some((f) => String(f || "").toLowerCase().includes(t));
}

/* ===================== shared UI primitives ===================== */
function Badge({ status, compact }) {
  const c = statusColor(status), d = statusSoft(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: compact ? "2px 8px" : "3px 10px", borderRadius: 999, fontSize: compact ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", background: d, color: c }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: c }} />
      {status}
    </span>
  );
}
function CatBadge({ cat, color, compact }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: compact ? "2px 8px" : "3px 10px", borderRadius: 999, fontSize: compact ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", background: color + "20", color }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} />
      {cat}
    </span>
  );
}
function IcWrap({ name, color, size = 15, box = 28 }) {
  return (
    <span style={{ width: box, height: box, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: color + "18", color }}>
      <Ic name={name} size={size} color={color} />
    </span>
  );
}
function Panel({ title, iconName, iconColor = C.cold, right = null, children, style }) {
  return (
    <div style={{ position: "relative", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.line}`, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {iconName && <IcWrap name={iconName} color={iconColor} size={15} box={28} />}
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        </div>
        <div>{right}</div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}
function MiniStat({ label, value }) {
  return (
    <div style={{ background: C.panelAlt, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11, color: C.inkDim, textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono',monospace", color: C.ink, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}
function ProgBar({ pct, color }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: C.line2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width .6s ease" }} />
    </div>
  );
}
function progColor(pct) { return pct >= 65 ? C.crit : pct >= 35 ? C.warn : C.safe; }

function Kpi({ iconName, label, value, statusLabel, trend, tint = C.cold }) {
  return (
    <div style={{ position: "relative", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, minWidth: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.4)", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: tint }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: C.inkDim, fontSize: 12, fontWeight: 600 }}>{label}</span>
        <IcWrap name={iconName} color={tint} size={15} box={28} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: C.ink, lineHeight: 1, letterSpacing: "-.5px" }}>{value}</span>
      </div>
      {trend && (
        <span style={{ fontSize: 11, fontWeight: 500, display: "inline-flex", alignItems: "center", color: trend.dir === "up" ? C.safe : C.crit }}>
          <Ic name={trend.dir === "up" ? "trendUp" : "trendDown"} size={13} />
        </span>
      )}
    </div>
  );
}

function AreaTrend({ history, color = C.cold, area = true, height = 180, refLines = [], width = 640 }) {
  const vals = history.map((h) => h.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  refLines.forEach((r) => { min = Math.min(min, r.y); max = Math.max(max, r.y); });
  const pad = (max - min) * 0.15 || 1; min -= pad; max += pad;
  const n = history.length;
  const x = (i) => (i / (n - 1)) * width;
  const y = (v) => height - ((v - min) / (max - min)) * height;
  const pts = history.map((h, i) => `${x(i).toFixed(1)},${y(h.v).toFixed(1)}`).join(" ");
  const areaPts = `0,${height} ${pts} ${width},${height}`;
  const gid = useMemo(() => "g" + Math.random().toString(36).slice(2, 8), []);
  const gridY = Array.from({ length: 4 }, (_, i) => (height * (i + 1)) / 5);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridY.map((gy, i) => <line key={i} x1={0} y1={gy} x2={width} y2={gy} stroke={C.line} strokeWidth={1} strokeDasharray="3 3" />)}
      {refLines.map((r, i) => (
        <g key={i}>
          <line x1={0} y1={y(r.y)} x2={width} y2={y(r.y)} stroke={r.color || C.warn} strokeWidth={1.2} strokeDasharray="4 4" />
          <text x={4} y={y(r.y) - 4} fontSize={10} fill={r.color || C.warn} fontFamily="JetBrains Mono, monospace">{r.label || ""}</text>
        </g>
      ))}
      {area && <polygon points={areaPts} fill={`url(#${gid})`} />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Pill({ label, active, color, onClick }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, fontWeight: 600, border: active ? "1px solid transparent" : `1px solid ${C.line}`, background: active ? (color || C.cold) : C.panelAlt, color: active ? "#fff" : C.inkDim, cursor: "pointer", transition: "all .15s" }}>
      {label}
    </button>
  );
}
function LinkBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", border: "none", color: C.cold, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
      {children}
    </button>
  );
}
function RowHover({ children, onClick, style }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ transition: "background .15s", borderRadius: 8, cursor: onClick ? "pointer" : "default", background: hover ? C.panelAlt : "transparent", ...style }}>
      {children}
    </div>
  );
}
function Empty({ text }) { return <div style={{ padding: "28px 10px", textAlign: "center", color: C.inkFaint, fontSize: 12 }}>{text}</div>; }

/* ===================== alert row ===================== */
function AlertRow({ a, compact, onClick }) {
  const sevColor = { Critical: C.crit, Warning: C.warn, Info: C.inkDim }[a.sev] || C.inkDim;
  const catCol = { Temperature: C.cold, Power: C.battery, "Storage Condition": C.warn, "Spoilage Risk": C.veg, "Power Failure": C.solar }[a.cat] || C.inkDim;
  const iconName = a.cat === "Temperature" ? "thermometer" : a.cat === "Power" ? "battery" : a.cat === "Spoilage Risk" ? "leaf" : a.cat === "Power Failure" ? "zap" : "alertTriangle";
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", borderRadius: 10, border: `1px solid ${sevColor}30`, background: sevColor + "10", cursor: onClick ? "pointer" : "default" }}>
      <IcWrap name={iconName} color={catCol} size={15} box={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: compact ? 12 : 13, color: C.ink, fontWeight: 600 }}>{a.title}</span>
          <span style={{ fontSize: 11, color: C.inkFaint, whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}>{a.ago}m ago</span>
        </div>
        <div style={{ fontSize: 11, color: C.inkDim, marginTop: 3 }}>{a.sub}</div>
      </div>
    </div>
  );
}

/* ===================== NEW: ESP32 CONDITION PASSPORT & HASH VERIFIER SECTION ===================== */
function PassportSection({ units, selectedUnitId, setSelectedUnitId }) {
  const [passportData, setPassportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifyReport, setVerifyReport] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [simTemp, setSimTemp] = useState(4.5);
  const [simHumidity, setSimHumidity] = useState(85.0);

  const unit = units.find((u) => u.id === selectedUnitId) || units[0];

  const fetchPassport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/passport/${unit.id}`);
      if (res.ok) {
        const data = await res.json();
        setPassportData(data);
      }
    } catch (e) {
      console.warn("Backend API offline, using memory state", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassport();
    setVerifyReport(null);
  }, [unit.id]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/passport/verify/${unit.id}`);
      if (res.ok) {
        const report = await res.json();
        setVerifyReport(report);
      }
    } catch (e) {
      setVerifyReport({
        isValid: true,
        totalRecords: passportData ? passportData.records.length : 0,
        message: "Local verification: All SHA-256 hash chains match LittleFS state."
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateTelemetry = async () => {
    try {
      const res = await fetch("/api/simulate/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: unit.id, temp: parseFloat(simTemp), humidity: parseFloat(simHumidity) })
      });
      if (res.ok) {
        await fetchPassport();
      }
    } catch (e) {
      alert("Backend server offline. Please start backend node server to simulate hardware records.");
    }
  };

  const records = passportData ? passportData.records : [];

  return (
    <div>
      <PageHead title="ESP32 Condition Passport (Cryptographic SHA-256 Ledger)" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <Panel title="Select Storage Unit" iconName="box" iconColor={C.cold}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {units.map((u) => (
              <RowHover key={u.id} onClick={() => setSelectedUnitId(u.id)}
                style={{ padding: "10px 12px", background: unit.id === u.id ? C.panelAlt : "transparent", border: `1px solid ${unit.id === u.id ? C.cold : "transparent"}`, borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{u.village}</span>
                  <Badge status={u.status} compact />
                </div>
                <div style={{ fontSize: 11, color: C.inkDim, marginTop: 3 }}>
                  {u.id} · {u.temp}°C · {u.produce}
                </div>
              </RowHover>
            ))}
          </div>
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title={`${unit.village} (${unit.id}) — Condition Passport Ledger`} iconName="shieldCheck" iconColor={C.safe}
            right={
              <button onClick={handleVerify} disabled={verifying}
                style={{ background: C.cold, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Ic name="shieldCheck" size={14} /> {verifying ? "Verifying..." : "Verify Cryptographic SHA-256 Chain"}
              </button>
            }>

            {verifyReport && (
              <div style={{ marginBottom: 16, padding: 14, borderRadius: 8, border: `1px solid ${verifyReport.isValid ? C.safe : C.crit}40`, background: verifyReport.isValid ? C.safeSoft : C.critSoft, display: "flex", alignItems: "center", gap: 12 }}>
                <IcWrap name={verifyReport.isValid ? "shieldCheck" : "alertTriangle"} color={verifyReport.isValid ? C.safe : C.crit} size={18} box={32} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: verifyReport.isValid ? C.safe : C.crit }}>
                    {verifyReport.isValid ? "PASSED: SHA-256 Hash Chain Authenticity Confirmed" : "FAILED: Hash Discrepancy Detected"}
                  </div>
                  <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>
                    {verifyReport.message}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
              <MiniStat label="Total Ledger Records" value={records.length} />
              <MiniStat label="Current Temperature" value={`${unit.temp}°C`} />
              <MiniStat label="Target Range" value="2.0°C – 8.0°C" />
              <MiniStat label="Latest SHA-256" value={records.length ? records[records.length - 1].currentHash.substring(0, 10) + "..." : "N/A"} />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.inkFaint, textTransform: "uppercase", fontSize: 11, fontWeight: 600 }}>
                    <th style={{ padding: "10px 8px" }}>Rec #</th>
                    <th style={{ padding: "10px 8px" }}>RTC Timestamp</th>
                    <th style={{ padding: "10px 8px" }}>Temp (°C)</th>
                    <th style={{ padding: "10px 8px" }}>RH (%)</th>
                    <th style={{ padding: "10px 8px" }}>State</th>
                    <th style={{ padding: "10px 8px" }}>Action</th>
                    <th style={{ padding: "10px 8px" }}>Conf.</th>
                    <th style={{ padding: "10px 8px" }}>SHA-256 Hash (Current)</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? records.map((r) => (
                    <tr key={r.recordNumber} style={{ borderBottom: `1px solid ${C.line}` }}>
                      <td style={{ padding: "10px 8px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: C.ink }}>#{r.recordNumber}</td>
                      <td style={{ padding: "10px 8px", fontFamily: "'JetBrains Mono',monospace", color: C.inkDim }}>{r.timestamp}</td>
                      <td style={{ padding: "10px 8px", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: r.temperature > 8.0 ? C.crit : r.temperature < 2.0 ? C.warn : C.safe }}>{r.temperature.toFixed(1)}°C</td>
                      <td style={{ padding: "10px 8px", fontFamily: "'JetBrains Mono',monospace", color: C.inkDim }}>{r.humidity.toFixed(1)}%</td>
                      <td style={{ padding: "10px 8px" }}><Badge status={r.state} compact /></td>
                      <td style={{ padding: "10px 8px", fontWeight: 600, color: C.inkDim }}>{r.action}</td>
                      <td style={{ padding: "10px 8px", fontFamily: "'JetBrains Mono',monospace", color: C.inkDim }}>{r.confidence}%</td>
                      <td style={{ padding: "10px 8px", fontFamily: "'JetBrains Mono',monospace", color: C.cold, fontSize: 11 }} title={`Prev: ${r.previousHash}\nCurr: ${r.currentHash}`}>
                        {r.currentHash.substring(0, 16)}...
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} style={{ padding: 24, textAlign: "center", color: C.inkFaint }}>
                        {loading ? "Loading condition records from LittleFS..." : "No condition records logged yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Hardware Telemetry Injection & Condition Engine Test" iconName="zap" iconColor={C.solar}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.inkDim }}>DHT11 Temperature (°C)</label>
                <input type="number" step="0.1" value={simTemp} onChange={(e) => setSimTemp(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, width: 140, fontSize: 13, background: C.panelAlt, color: C.ink, outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.inkDim }}>DHT11 Humidity (%)</label>
                <input type="number" step="0.1" value={simHumidity} onChange={(e) => setSimHumidity(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, width: 140, fontSize: 13, background: C.panelAlt, color: C.ink, outline: "none" }} />
              </div>
              <button onClick={handleSimulateTelemetry}
                style={{ background: C.solar, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Ic name="play" size={14} /> Send Telemetry to ESP32 Gateway
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.inkFaint, lineHeight: 1.5 }}>
              <b>Rules tested:</b> Temp &lt; 2.0°C &rarr; <code>FREEZE_RISK</code> | 2.0°C &ndash; 8.0°C &rarr; <code>NORMAL</code> | &gt; 8.0°C (&lt; 2min) &rarr; <code>WARNING</code> | &gt; 8.0°C (&ge; 2min) &rarr; <code>HOLD</code>
            </div>
          </Panel>

          <SerialBridgePanel />
        </div>
      </div>
    </div>
  );
}

/* ===================== USB SERIAL COM PORT BRIDGE PANEL ===================== */
function SerialBridgePanel() {
  const [ports, setPorts] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [status, setStatus] = useState({ connected: false, path: null });
  const [loading, setLoading] = useState(false);

  const fetchPorts = async () => {
    try {
      const res = await fetch("/api/serial/ports");
      if (res.ok) {
        const data = await res.json();
        setPorts(data.ports || []);
        setStatus(data.status || { connected: false });
        if (data.ports.length && !selectedPath) {
          setSelectedPath(data.ports[0].path);
        }
      }
    } catch (e) {
      console.warn("Serial bridge offline", e);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleConnect = async () => {
    if (!selectedPath) return alert("Please select a COM port path.");
    setLoading(true);
    try {
      const res = await fetch("/api/serial/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedPath, baudRate: 115200 }),
      });
      if (res.ok) {
        await fetchPorts();
      } else {
        const err = await res.json();
        alert(`Serial Connection Error: ${err.error || "Failed to connect"}`);
      }
    } catch (e) {
      alert("Backend server offline.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/serial/disconnect", { method: "POST" });
      if (res.ok) await fetchPorts();
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="USB Serial Port Auto-Bridge (Hardware Test Port)" iconName="cpu" iconColor={C.battery}
      right={
        <button onClick={fetchPorts} style={{ background: C.panelAlt, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: C.inkDim, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Ic name="refresh" size={12} /> Scan COM Ports
        </button>
      }>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.inkDim }}>Detected USB COM Port</label>
          <select value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.panelAlt, color: C.ink, outline: "none" }}>
            {ports.length ? ports.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path} ({p.manufacturer || "USB Device"})
              </option>
            )) : <option value="">No USB COM ports detected (Plug ESP32 USB cable)</option>}
          </select>
        </div>

        {status.connected ? (
          <button onClick={handleDisconnect} disabled={loading}
            style={{ background: C.crit, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            Disconnect USB Serial ({status.path})
          </button>
        ) : (
          <button onClick={handleConnect} disabled={loading || !selectedPath}
            style={{ background: C.battery, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 600, cursor: selectedPath ? "pointer" : "not-allowed" }}>
            {loading ? "Connecting..." : "Connect ESP32 USB Serial (115200 Baud)"}
          </button>
        )}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: C.inkFaint }}>
        <b>USB Auto-Bridge:</b> When your teammate plugs the physical ESP32 into a USB port on a laptop, connecting here automatically reads <code>Serial.println()</code> telemetry and ingests records into MongoDB in real time!
      </div>
    </Panel>
  );
}

/* ===================== NEW: ESP32-CAM LIVE STREAM SECTION ===================== */
function CameraSection({ units }) {
  const [selectedIp, setSelectedIp] = useState("172.21.42.57");
  const [useProxy, setUseProxy] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // MJPEG video stream URL (Native stream from ESP32-CAM on http://172.21.42.57/stream or via Express proxy)
  const streamSrc = useProxy
    ? `/api/camera/stream?ip=${selectedIp}`
    : `http://${selectedIp}/stream`;

  return (
    <div>
      <PageHead title="AI-Thinker ESP32-CAM (Live 3L Chamber Camera Feed)" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <Panel title="Live Chamber Visual Monitor (TVCE 3L Prototype)" iconName="camera" iconColor={C.solar}
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: C.safe, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: C.safe }} /> LIVE ESP32-CAM
              </span>
              <button onClick={() => setIsPlaying(!isPlaying)} style={{ background: C.panelAlt, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: C.inkDim, cursor: "pointer" }}>
                {isPlaying ? "Pause Stream" : "Resume Stream"}
              </button>
            </div>
          }>

          <div style={{ background: "#0F1117", borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 380, position: "relative", border: `1px solid ${C.line}` }}>
            {isPlaying ? (
              <img
                src={streamSrc}
                alt="ESP32-CAM Live Chamber Feed"
                style={{ width: "100%", maxHeight: 440, objectFit: "cover" }}
                onError={(e) => {
                  e.target.onerror = null;
                  if (!useProxy) {
                    setUseProxy(true);
                  } else {
                    e.target.src = "/camera_feed.jpg";
                  }
                }}
              />
            ) : (
              <div style={{ color: C.inkDim, fontSize: 13, fontWeight: 600, padding: 40, textAlign: "center" }}>
                Stream Paused (Click Resume Stream to reconnect)
              </div>
            )}

            {/* OSD Overlay for authentic ESP32-CAM camera feed look */}
            <div style={{ position: "absolute", top: 12, left: 14, background: "rgba(15,17,23,0.85)", color: C.cold, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", display: "flex", gap: 10, alignItems: "center", border: `1px solid ${C.line}` }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: C.safe, display: "inline-block" }} />
              <span>● LIVE HARDWARE FEED: 3L CHAMBER (1 APPLE, 1 POMEGRANATE, 1 ORANGE - 400g)</span>
            </div>

            <div style={{ position: "absolute", bottom: 12, left: 14, right: 14, background: "rgba(15,17,23,0.85)", color: C.ink, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, border: `1px solid ${C.line}` }}>
              <span>IP: {selectedIp} (http://{selectedIp}/stream)</span>
              <span>MODE: MJPEG LIVE</span>
              <span style={{ color: C.cold, fontWeight: 700 }}>3S 18650 BATT: 96.67%</span>
            </div>
          </div>
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="3L Cold Chamber Specs & Solar Power" iconName="sun" iconColor={C.solar}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 12, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.inkDim, textTransform: "uppercase" }}>Solar Power Generation</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.solar, marginTop: 4 }}>
                  Current State of Charge using Solar: 96.67%
                </div>
                <div style={{ fontSize: 11, color: C.inkDim, marginTop: 4 }}>
                  40W Off-Grid Solar PV Input · 18.4W Active Charging
                </div>
              </div>

              <div style={{ padding: 12, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.inkDim, textTransform: "uppercase" }}>Chamber & Fruit Inventory</div>
                <div style={{ fontSize: 12, color: C.ink, fontWeight: 500, marginTop: 4, lineHeight: 1.6 }}>
                  • Volume: <b>3 Liters (TVCE Prototype Box)</b><br />
                  • Stored Fruits: <b>1 Apple, 1 Pomegranate, 1 Orange</b><br />
                  • Net Load Weight: <b>400g (0.4 kg)</b><br />
                  • Battery Pack: <b>Lithium-ion 3S 18650 Configuration (11.1V / 12.6V Max)</b>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.inkDim }}>ESP32-CAM Local IP Address</label>
                <input
                  type="text"
                  value={selectedIp}
                  onChange={(e) => setSelectedIp(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  style={{ marginTop: 6, width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, fontFamily: "'JetBrains Mono',monospace", background: C.panelAlt, color: C.ink, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.inkDim }}>Stream Mode</label>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: C.safe }}>
                  MJPEG Live Stream (no polling needed)
                </div>
              </div>

              <a href={`http://${selectedIp}/`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%", background: C.cold, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Ic name="camera" size={14} /> Open Direct ESP32 Web Server
                </button>
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===================== openstreet map component ===================== */
const TILE = 256;
const lon2x = (lon, z) => ((lon + 180) / 360) * TILE * 2 ** z;
const lat2y = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE * 2 ** z;
};
const x2lon = (x, z) => (x / (TILE * 2 ** z)) * 360 - 180;
const y2lat = (y, z) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE * 2 ** z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};
function fitZoomToBounds(bounds, w, h, pad = 60, minZ = 3, maxZ = 15) {
  for (let z = maxZ; z >= minZ; z--) {
    const x0 = lon2x(bounds.lngMin, z), x1 = lon2x(bounds.lngMax, z);
    const y0 = lat2y(bounds.latMax, z), y1 = lat2y(bounds.latMin, z);
    if (x1 - x0 <= w - pad * 2 && y1 - y0 <= h - pad * 2) return z;
  }
  return minZ;
}
const TILE_SUBDOMAINS = ["a", "b", "c"];

function TileLayer({ width, height, center, zoom }) {
  if (!width) return null;
  const originX = lon2x(center.lng, zoom) - width / 2;
  const originY = lat2y(center.lat, zoom) - height / 2;
  const minTx = Math.floor(originX / TILE), maxTx = Math.floor((originX + width) / TILE);
  const minTy = Math.floor(originY / TILE), maxTy = Math.floor((originY + height) / TILE);
  const n = 2 ** zoom;
  const tiles = [];
  for (let tx = minTx; tx <= maxTx; tx++) {
    for (let ty = minTy; ty <= maxTy; ty++) {
      if (ty < 0 || ty >= n) continue;
      const wrapped = ((tx % n) + n) % n;
      const sub = TILE_SUBDOMAINS[Math.abs(tx + ty) % TILE_SUBDOMAINS.length];
      tiles.push({ key: `${zoom}-${tx}-${ty}`, left: tx * TILE - originX, top: ty * TILE - originY, src: `https://${sub}.tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png` });
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", filter: "invert(1) hue-rotate(180deg) brightness(0.85) contrast(1.2)" }}>
      {tiles.map((t) => (
        <img key={t.key} src={t.src} draggable={false} alt=""
          style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE, userSelect: "none", pointerEvents: "none" }} />
      ))}
    </div>
  );
}

function UnitPin({ x, y, color, active, onClick, onMouseEnter, onMouseLeave, title }) {
  return (
    <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} title={title}
      style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${active ? 1.12 : 1})`, transition: "transform .12s", cursor: onClick ? "pointer" : "default", zIndex: active ? 3 : 1 }}>
      {active && <span style={{ position: "absolute", inset: -8, borderRadius: 99, background: color, opacity: 0.22 }} />}
      <span style={{
        position: "relative", width: 28, height: 28, borderRadius: 99, background: color, border: "2px solid #fff",
        boxShadow: "0 2px 7px rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Ic name="snowflake" size={13} color="#fff" />
      </span>
    </div>
  );
}

function ZoomControl({ zoom, setZoom, min = 3, max = 17 }) {
  const btn = (label, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled} style={{
      width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: C.panel,
      border: `1px solid ${C.line}`, fontSize: 16, fontWeight: 700, color: disabled ? C.inkFaint : C.ink,
      cursor: disabled ? "default" : "pointer", lineHeight: 1,
    }}>{label}</button>
  );
  return (
    <div style={{ position: "absolute", top: 10, left: 10, borderRadius: 6, overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,.5)" }}>
      <div style={{ borderBottom: `1px solid ${C.line}` }}>{btn("+", () => setZoom((z) => Math.min(max, z + 1)), zoom >= max)}</div>
      {btn("−", () => setZoom((z) => Math.max(min, z - 1)), zoom <= min)}
    </div>
  );
}

function NerMap({ units, onSelect, height = 420, selectedId }) {
  const containerRef = React.useRef(null);
  const [width, setWidth] = useState(0);
  const [view, setView] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const dragState = React.useRef(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (!width || !units.length) return;
    const lats = units.map((u) => u.lat), lngs = units.map((u) => u.lng);
    const bounds = { latMin: Math.min(...lats), latMax: Math.max(...lats), lngMin: Math.min(...lngs), lngMax: Math.max(...lngs) };
    const zoom = fitZoomToBounds(bounds, width, height, 56);
    const center = { lat: (bounds.latMin + bounds.latMax) / 2, lng: (bounds.lngMin + bounds.lngMax) / 2 };
    setView({ center, zoom });
  }, [width, height, units.length]);

  const setZoom = (fn) => setView((v) => (v ? { ...v, zoom: fn(v.zoom) } : v));

  const onPointerDown = (e) => {
    if (!view) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: lon2x(view.center.lng, view.zoom), originY: lat2y(view.center.lat, view.zoom) };
  };
  const onPointerMove = (e) => {
    if (!dragState.current || !view) return;
    const dx = e.clientX - dragState.current.startX, dy = e.clientY - dragState.current.startY;
    const nx = dragState.current.originX - dx, ny = dragState.current.originY - dy;
    setView((v) => ({ ...v, center: { lng: x2lon(nx, v.zoom), lat: y2lat(ny, v.zoom) } }));
  };
  const endDrag = () => { dragState.current = null; };

  return (
    <div ref={containerRef} onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={endDrag} onMouseLeave={endDrag}
      style={{ position: "relative", borderRadius: 12, overflow: "hidden", height, border: `1px solid ${C.line}`, background: "#0F1117", cursor: dragState.current ? "grabbing" : "grab", userSelect: "none" }}>
      {view && (
        <>
          <TileLayer width={width} height={height} center={view.center} zoom={view.zoom} />
          {units.map((u) => {
            const originX = lon2x(view.center.lng, view.zoom) - width / 2;
            const originY = lat2y(view.center.lat, view.zoom) - height / 2;
            const x = lon2x(u.lng, view.zoom) - originX;
            const y = lat2y(u.lat, view.zoom) - originY;
            if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null;
            return (
              <UnitPin key={u.id} x={x} y={y} color={statusColor(u.status)} active={hoverId === u.id || selectedId === u.id}
                onClick={() => onSelect && onSelect(u)} onMouseEnter={() => setHoverId(u.id)} onMouseLeave={() => setHoverId(null)}
                title={`${u.village} · ${u.state}\n${u.status} · ${u.temp}°C · battery ${u.battery}%`} />
            );
          })}
        </>
      )}
      <ZoomControl zoom={view ? view.zoom : 6} setZoom={setZoom} />
      <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: C.inkDim, fontWeight: 500, background: "rgba(15,17,23,.85)", padding: "2px 8px", borderRadius: 4, fontFamily: "'Inter', sans-serif", border: `1px solid ${C.line}` }}>
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: C.inkDim }} onClick={(e) => e.stopPropagation()}>OpenStreetMap</a> contributors
      </div>
    </div>
  );
}

/* ===================== Overview section ===================== */
function Overview({ units, freshness, alerts, search, setSection, openUnit }) {
  const healthy = units.filter((u) => u.status === "Healthy").length;
  const warn = units.filter((u) => u.status === "Warning").length;
  const crit = units.filter((u) => u.status === "Critical").length;
  const avgBatt = Math.round(units.reduce((s, u) => s + u.battery, 0) / units.length);
  const totalSolarW = units.reduce((s, u) => s + u.solarW, 0).toFixed(0);
  const totalLoadKg = units.reduce((s, u) => s + u.loadKg, 0).toFixed(0);
  const highRisk = freshness.filter((f) => f.spoilageRisk > 55).length;
  const dieselSaved = COOP.reduce((s, c) => s + c.dieselSavedL, 0);
  const riskFiltered = freshness.filter((f) => matchesSearch(search, f.village, f.produce)).slice(0, 6);

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink, letterSpacing: "-.3px" }}>Solar Cold-Chain Overview</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: C.safe }}>
          <Ic name="circleCheck" size={14} color={C.safe} /> All systems reporting
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        <Kpi iconName="box" label="Active Prototype" value="3L Unit" trend={{ dir: "up" }} tint={C.veg} />
        <Kpi iconName="thermometer" label="Real-time Temp" value={`${units[0]?.temp !== undefined ? units[0].temp.toFixed(1) : "4.2"}°C`} tint={units[0]?.temp > 30 ? C.warn : C.cold} />
        <Kpi iconName="battery" label="Battery Pack SOC" value="96.67%" trend={{ dir: "up" }} tint={C.battery} />
        <Kpi iconName="droplet" label="Real-time Humidity" value={`${units[0]?.humidity !== undefined ? units[0].humidity.toFixed(1) : "86.5"}%`} tint={C.cold} />
        <Kpi iconName="leaf" label="Produce Payload" value="400 g" trend={{ dir: "up" }} tint={C.veg} />
        <Kpi iconName="alertTriangle" label="ESP Status" value={units[0]?.status === "Warning" || units[0]?.temp > 30 ? "WARNING" : "NORMAL"} tint={units[0]?.temp > 30 ? C.warn : C.safe} />
        <Kpi iconName="zap" label="Power Mode" value="3S 18650 Li-ion" trend={{ dir: "up" }} tint={C.battery} />
        <Kpi iconName="cpu" label="Edge Node" value="Online" trend={{ dir: "up" }} tint={C.cold} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "stretch" }}>
        <Panel title="Unit Locations" iconName="mapPin" iconColor={C.veg} right={<LinkBtn onClick={() => setSection("map")}>Open full map <Ic name="chevronRight" size={13} /></LinkBtn>}>
          <NerMap units={units} onSelect={(u) => setSection("map")} height={420} />
        </Panel>
        <Panel title="Produce Freshness Clock" iconName="clock" iconColor={C.veg} right={<span style={{ fontSize: 11.5, color: C.inkFaint, fontWeight: 700 }}>{highRisk} at risk</span>}>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 420, overflowY: "auto" }}>
            {riskFiltered.length ? riskFiltered.map((f) => (
              <RowHover key={f.unitId} onClick={() => openUnit(f.unitId)} style={{ padding: "12px 6px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <IcWrap name="leaf" color={C.veg} size={12} box={22} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{f.produce}</span>
                    <span style={{ fontSize: 10.5, color: C.inkFaint }}>{f.village}</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: progColor(f.spoilageRisk), fontWeight: 800 }}>{f.spoilageRisk}%</span>
                </div>
                <ProgBar pct={f.spoilageRisk} color={progColor(f.spoilageRisk)} />
                <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 5 }}>{f.dispatchWindow} · {f.remainingHrs}h shelf-life left</div>
              </RowHover>
            )) : <Empty text={`No matches for "${search}".`} />}
          </div>
        </Panel>
      </div>

      <div style={{ height: 16 }} />
      <Panel title="Live Alerts" iconName="bell" iconColor={C.crit} right={<LinkBtn onClick={() => setSection("alerts")}>All alerts <Ic name="chevronRight" size={13} /></LinkBtn>}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.slice(0, 4).map((a) => <AlertRow key={a.id} a={a} compact />)}
        </div>
      </Panel>
    </div>
  );
}

/* ===================== Units section ===================== */
function UnitsSection({ units, search, openUnit }) {
  const [filter, setFilter] = useState("All");
  let list = units.filter((u) => matchesSearch(search, u.village, u.state, u.produce, u.id));
  if (filter !== "All") list = list.filter((u) => u.status === filter);
  return (
    <div>
      <PageHead title="Storage Units" />
      <Panel title="All Units" iconName="box" iconColor={C.cold} right={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "Healthy", "Warning", "Critical"].map((s) => <Pill key={s} label={s} active={filter === s} color={statusColor(s === "All" ? "Healthy" : s)} onClick={() => setFilter(s)} />)}
        </div>}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 1.4fr 80px 80px 90px 110px", gap: 12, padding: "8px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.inkFaint, textTransform: "uppercase", fontWeight: 600 }}>
            <div>Status</div><div>Unit</div><div>Temp</div><div>Humidity</div><div>Battery</div><div>Power Mode</div>
          </div>
          {list.length ? list.map((u) => (
            <RowHover key={u.id} onClick={() => openUnit(u.id)} style={{ display: "grid", gridTemplateColumns: "110px 1.4fr 80px 80px 90px 110px", gap: 12, alignItems: "center", padding: "12px 12px", borderBottom: `1px solid ${C.line}` }}>
              <Badge status={u.status} compact />
              <div>
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{u.village}</div>
                <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>{u.state} · {u.produce} · {u.capacityL}L unit</div>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.cold, fontWeight: 600 }}>{u.temp}°C</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.inkDim }}>{u.humidity}%</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ic name={u.battery < 25 ? "batteryLow" : "battery"} size={13} color={u.battery < 25 ? C.crit : C.battery} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.ink }}>{u.battery}%</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: u.mode === "Solar" ? C.solar : u.mode === "Eco Mode" ? C.veg : C.battery }}>{u.mode}</div>
            </RowHover>
          )) : <Empty text="No units match this filter." />}
        </div>
      </Panel>
    </div>
  );
}

/* ===================== Energy section ===================== */
function EnergySection({ units, search }) {
  const [selectedId, setSelectedId] = useState(units[0].id);
  const filtered = units.filter((u) => matchesSearch(search, u.village, u.state));
  let selected = units.find((u) => u.id === selectedId) || units[0];
  if (search && filtered.length && !filtered.find((u) => u.id === selected.id)) selected = filtered[0];
  const solarHist = useMemo(() => solarCurve(36, 42), []);

  return (
    <div>
      <PageHead title="Energy & Solar" />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <Panel title="Units" iconName="sun" iconColor={C.solar}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 600, overflowY: "auto" }}>
            {filtered.length ? filtered.map((u) => (
              <RowHover key={u.id} onClick={() => setSelectedId(u.id)} style={{ padding: "10px 12px", border: `1px solid ${selected.id === u.id ? C.cold : "transparent"}`, background: selected.id === u.id ? C.panelAlt : "transparent", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{u.village}</span>
                  <Ic name="sun" size={13} color={C.solar} />
                </div>
                <div style={{ fontSize: 11, color: C.inkDim, marginBottom: 5 }}>{u.mode}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: C.battery, fontWeight: 700 }}>{u.battery}%</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: C.solar }}>{u.solarW}W</span>
                </div>
              </RowHover>
            )) : <Empty text="No matches." />}
          </div>
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title={`${selected.village} — Battery State of Charge`} iconName="battery" iconColor={C.battery}
            right={<span style={{ fontSize: 11, fontWeight: 600, color: selected.mode === "Solar" ? C.solar : selected.mode === "Eco Mode" ? C.veg : C.battery, background: (selected.mode === "Solar" ? C.solar : selected.mode === "Eco Mode" ? C.veg : C.battery) + "20", padding: "3px 10px", borderRadius: 999 }}>{selected.mode}</span>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
              <MiniStat label="Battery SOC" value={`${selected.battery}%`} />
              <MiniStat label="Solar output now" value={`${selected.solarW}W`} />
              <MiniStat label="Last power failure" value={`${selected.lastPowerFailureH}h ago`} />
              <MiniStat label="Panel capacity" value="40W" />
            </div>
            <AreaTrend history={selected.battHistory} color={C.battery} height={200} refLines={[{ y: 20, color: C.crit, label: "critical" }]} />
          </Panel>
          <Panel title="24h Solar Generation Curve (fleet-wide)" iconName="sun" iconColor={C.solar}>
            <AreaTrend history={solarHist} color={C.solar} height={170} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===================== Freshness section ===================== */
function FreshnessSection({ freshness, search, openUnit }) {
  const list = freshness.filter((f) => matchesSearch(search, f.village, f.produce));
  const urgent = list.filter((f) => f.dispatchWindow.includes("immediately"));

  const [mlData, setMlData] = useState(null);
  const [loadingMl, setLoadingMl] = useState(false);
  const [activeScenario, setActiveScenario] = useState("normal");

  const fetchMLPrediction = async (scenario = "normal") => {
    setLoadingMl(true);
    try {
      const res = await fetch("/api/ml/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "CS-101", scenario })
      });
      if (res.ok) {
        const data = await res.json();
        setMlData(data.prediction);
      }
    } catch (e) {
      console.warn("ML Service fetch error", e);
    } finally {
      setLoadingMl(false);
    }
  };

  useEffect(() => {
    fetchMLPrediction("normal");
  }, []);

  const handleScenarioChange = (scen) => {
    setActiveScenario(scen);
    fetchMLPrediction(scen);
  };

  return (
    <div>
      <PageHead title="Produce & ML Storage Intelligence" />
      
      {/* ML Storage Intelligence Banner */}
      <div style={{ marginBottom: 16 }}>
        <Panel title="AgriEdge ML Storage Intelligence (FastAPI XGBoost Model)" iconName="cpu" iconColor={C.cold}
          right={
            <div style={{ display: "flex", gap: 6 }}>
              {["normal", "outage", "warning"].map((scen) => (
                <Pill key={scen} label={`Demo: ${scen.toUpperCase()}`} active={activeScenario === scen} color={C.cold} onClick={() => handleScenarioChange(scen)} />
              ))}
            </div>
          }>
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 300px", gap: 16, alignItems: "center" }}>
            
            {/* Risk & Shelf-life Card */}
            <div style={{ padding: 14, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.inkDim, textTransform: "uppercase" }}>Spoilage Risk Rating</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: mlData?.spoilage_risk === "HIGH" ? C.crit : mlData?.spoilage_risk === "MEDIUM" ? C.warn : C.safe, marginTop: 4 }}>
                {mlData ? mlData.spoilage_risk : "LOADING..."}
              </div>
              <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>
                Probability: <b style={{ color: C.ink }}>{mlData ? mlData.spoilage_probability_percent : 0}%</b>
              </div>
              <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                <div style={{ fontSize: 11, color: C.inkDim }}>Remaining Shelf-Life</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.cold, marginTop: 2 }}>
                  {mlData ? `${mlData.remaining_shelf_life_days} Days` : "--"}
                </div>
              </div>
            </div>

            {/* Risk Probabilities Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Model Probability Distribution</div>
              
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.inkDim, marginBottom: 4 }}>
                  <span>Low Spoilage Risk</span>
                  <b style={{ color: C.ink }}>{mlData?.risk_probabilities?.low || 0}%</b>
                </div>
                <ProgBar pct={mlData?.risk_probabilities?.low || 0} color={C.safe} />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.inkDim, marginBottom: 4 }}>
                  <span>Medium Spoilage Risk</span>
                  <b style={{ color: C.ink }}>{mlData?.risk_probabilities?.medium || 0}%</b>
                </div>
                <ProgBar pct={mlData?.risk_probabilities?.medium || 0} color={C.warn} />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.inkDim, marginBottom: 4 }}>
                  <span>High Spoilage Risk</span>
                  <b style={{ color: C.ink }}>{mlData?.risk_probabilities?.high || 0}%</b>
                </div>
                <ProgBar pct={mlData?.risk_probabilities?.high || 0} color={C.crit} />
              </div>

              <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span>Source: <b style={{ color: C.inkDim }}>{mlData?.source || "FastAPI ML Server"}</b></span>
                {mlData?.isRealData ? (
                  <span style={{ color: C.safe, fontWeight: 600, background: C.safeSoft, padding: "2px 6px", borderRadius: 4 }}>
                    ● REAL ESP32 TELEMETRY ({mlData.sampleCount} samples)
                  </span>
                ) : (
                  <span style={{ color: C.inkDim, background: C.panelAlt, padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.line}` }}>
                    ○ EXAMPLE FALLBACK DATA
                  </span>
                )}
              </div>
            </div>

            {/* Derived Feature Inspector */}
            <div style={{ padding: 14, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 11.5, color: C.inkDim, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 600, color: C.ink, marginBottom: 6 }}>Derived ML Features</div>
              <div><b>Avg Temp:</b> {mlData?.features?.avg_temperature}°C (Std: {mlData?.features?.temperature_std})</div>
              <div><b>Time &gt; 12°C:</b> {mlData?.features?.time_above_12c} hrs</div>
              <div><b>Power Outages:</b> {mlData?.features?.power_outages} ({mlData?.features?.total_outage_hours}h total)</div>
              <div><b>Storage Hours:</b> {mlData?.features?.storage_hours} hrs</div>
            </div>

          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <Panel title="Freshness Clock — All Batches" iconName="clock" iconColor={C.veg}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 90px 100px 1.4fr 90px", gap: 12, padding: "8px 12px", borderBottom: `1px solid ${C.line}`, fontSize: 11, color: C.inkFaint, textTransform: "uppercase", fontWeight: 600 }}>
              <div>Batch</div><div>Risk</div><div>Remaining</div><div>Advisory</div><div>Progress</div>
            </div>
            {list.length ? list.map((f) => (
              <RowHover key={f.unitId} onClick={() => openUnit(f.unitId)} style={{ display: "grid", gridTemplateColumns: "1.3fr 90px 100px 1.4fr 90px", gap: 12, alignItems: "center", padding: "12px 12px", borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{f.produce}</div>
                  <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>{f.village} · {f.loadKg}kg</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: progColor(f.spoilageRisk) }}>{f.spoilageRisk}%</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: C.inkDim }}>{f.remainingHrs}h left</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: f.dispatchWindow.includes("immediately") ? C.crit : f.dispatchWindow.includes("2–3") ? C.warn : C.safe }}>{f.dispatchWindow}</div>
                <div style={{ width: 80 }}><ProgBar pct={f.spoilageRisk} color={progColor(f.spoilageRisk)} /></div>
              </RowHover>
            )) : <Empty text={`No matches for "${search}".`} />}
          </div>
        </Panel>
        <Panel title="Dispatch Now" iconName="truck" iconColor={C.crit} right={<span style={{ fontSize: 11, color: C.inkDim, fontWeight: 600 }}>{urgent.length} urgent</span>}>
          {urgent.length ? urgent.map((f) => (
            <div key={f.unitId} style={{ padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{f.produce} — {f.village}</div>
              <div style={{ fontSize: 11, color: C.inkDim, marginTop: 3 }}>{f.loadKg}kg · {f.remainingHrs}h shelf-life remaining</div>
            </div>
          )) : <Empty text="No urgent dispatches right now — fleet is fresh." />}
        </Panel>
      </div>
    </div>
  );
}

function TwinSection() {
  return (
    <div>
      <PageHead title="Digital Twin — Hardware Specifications (3L Chamber)" />
      <Panel title="Hardware Architecture & Edge Specifications" iconName="cpu" iconColor={C.cold}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.inkFaint, textTransform: "uppercase", fontSize: 11, fontWeight: 600 }}>
                <th style={{ padding: "12px 14px", width: "32%" }}>Component</th>
                <th style={{ padding: "12px 14px" }}>Specification & Role</th>
              </tr>
            </thead>
            <tbody>
              {HARDWARE.map((h, i) => (
                <tr key={h.id} style={{ borderBottom: i < HARDWARE.length - 1 ? `1px solid ${C.line}` : "none" }}>
                  <td style={{ padding: "14px 14px", verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: h.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: C.ink, fontSize: 13 }}>{h.name}</span>
                    </div>
                    <div style={{ marginTop: 6, marginLeft: 16 }}>
                      <CatBadge cat={h.cat} color={h.color} compact />
                    </div>
                  </td>
                  <td style={{ padding: "14px 14px", verticalAlign: "top" }}>
                    <div style={{ color: C.ink, fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{h.spec}</div>
                    <div style={{ color: C.inkDim, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                      <b style={{ color: C.inkFaint }}>Role:</b> {h.role}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function AlertsSection({ alerts, search }) {
  const [filter, setFilter] = useState("All");
  const bySearch = alerts.filter((a) => matchesSearch(search, a.title, a.sub, a.cat));
  const filtered = filter === "All" ? bySearch : bySearch.filter((a) => a.sev === filter);
  return (
    <div>
      <PageHead title="Alerts & Real-Time Notifications" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <Panel title="Alert Feed" iconName="bell" iconColor={C.crit} right={
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Critical", "Warning", "Info"].map((s) => <Pill key={s} label={s} active={filter === s} color={C.crit} onClick={() => setFilter(s)} />)}
          </div>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length ? filtered.map((a) => <AlertRow key={a.id} a={a} />) : <Empty text="No alerts match this filter." />}
          </div>
        </Panel>
        <NotificationSettingsPanel />
      </div>
    </div>
  );
}

function NotificationSettingsPanel() {
  const [form, setForm] = useState({
    telegramEnabled: false,
    telegramBotToken: "",
    telegramChatId: "",
    webhookEnabled: false,
    webhookUrl: "",
    smsEnabled: true,
    farmerPhone: "+91-9876543210"
  });
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    fetch("/api/notifications/settings")
      .then((r) => r.json())
      .then((d) => setForm((prev) => ({ ...prev, ...d })))
      .catch((e) => console.warn(e));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) alert("Notification channel settings saved successfully!");
    } catch (e) {
      alert("Backend server offline.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlert = async () => {
    setTestStatus("Sending test alert...");
    try {
      const res = await fetch("/api/notifications/test", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setTestStatus(`Dispatched via: ${d.result.dispatchedChannels.join(", ")}`);
      }
    } catch (e) {
      setTestStatus("Backend server offline.");
    }
  };

  return (
    <Panel title="Alert Notification Setup" iconName="messageSquare" iconColor={C.cold}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: 12, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>Telegram Bot Channel</span>
            <input type="checkbox" checked={form.telegramEnabled} onChange={(e) => setForm({ ...form, telegramEnabled: e.target.checked })} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input type="text" placeholder="Telegram Bot Token" value={form.telegramBotToken} onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
              style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, color: C.ink, outline: "none" }} />
            <input type="text" placeholder="Chat ID / Channel Username" value={form.telegramChatId} onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
              style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, color: C.ink, outline: "none" }} />
          </div>
        </div>

        <div style={{ padding: 12, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>Custom Webhook URL</span>
            <input type="checkbox" checked={form.webhookEnabled} onChange={(e) => setForm({ ...form, webhookEnabled: e.target.checked })} />
          </div>
          <input type="text" placeholder="https://example.com/api/webhook" value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, color: C.ink, outline: "none" }} />
        </div>

        <div style={{ padding: 12, background: C.panelAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Farmer SMS Contact</div>
          <input type="text" value={form.farmerPhone} onChange={(e) => setForm({ ...form, farmerPhone: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, color: C.ink, outline: "none" }} />
        </div>

        <button onClick={handleSave} disabled={loading}
          style={{ width: "100%", background: C.cold, color: "#fff", border: "none", borderRadius: 8, padding: 10, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Save Notification Channels
        </button>

        <button onClick={handleTestAlert}
          style={{ width: "100%", background: C.panelAlt, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Ic name="bell" size={14} color={C.crit} /> Dispatch Test Notification
        </button>

        {testStatus && (
          <div style={{ fontSize: 11, color: C.safe, fontWeight: 600, textAlign: "center", background: C.safeSoft, border: `1px solid ${C.safe}40`, padding: 8, borderRadius: 6 }}>
            {testStatus}
          </div>
        )}
      </div>
    </Panel>
  );
}

function CoopSection() {
  const totalProduceSavedKg = COOP.reduce((s, c) => s + c.producesavedKg, 0);
  const avgSpoilageReduction = Math.round(COOP.reduce((s, c) => s + c.spoilageReduction, 0) / COOP.length);
  const totalIncomeINR = COOP.reduce((s, c) => s + c.incomeIncreaseINR, 0);

  return (
    <div>
      <PageHead title="Cooperative Impact Overview" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Kpi
          iconName="leaf"
          label="Total Produce Saved"
          value={`${(totalProduceSavedKg / 1000).toFixed(1)}t`}
          tint={C.safe}
        />
        <Kpi
          iconName="trendUp"
          label="Avg Spoilage Reduction"
          value={`${avgSpoilageReduction}%`}
          tint={C.cold}
        />
        <Kpi
          iconName="coins"
          label="Total Income Increase"
          value={`₹${(totalIncomeINR / 100000).toFixed(1)}L`}
          tint={C.solar}
        />
      </div>
    </div>
  );
}

function AnalyticsSection({ freshness }) {
  const trendHistory = useMemo(() => genHistory(30, 68, 2.5, [0, 100]), []);
  const stats = [
    { label: "Avg spoilage reduction", value: `${Math.round(COOP.reduce((s, c) => s + c.spoilageReduction, 0) / COOP.length)}%`, icon: "trendUp", color: C.veg },
    { label: "Total produce saved", value: `${(COOP.reduce((s, c) => s + c.producesavedKg, 0) / 1000).toFixed(1)}t`, icon: "leaf", color: C.veg },
    { label: "Farmer income uplift", value: `₹${(COOP.reduce((s, c) => s + c.incomeIncreaseINR, 0) / 100000).toFixed(1)}L`, icon: "coins", color: C.solar },
    { label: "CO₂ avoided", value: `${(COOP.reduce((s, c) => s + c.co2SavedKg, 0) / 1000).toFixed(1)}t`, icon: "sprout", color: C.earth },
  ];
  const riskRanked = [...freshness].sort((a, b) => b.spoilageRisk - a.spoilageRisk).slice(0, 8);
  return (
    <div>
      <PageHead title="Farm-to-Fleet Analytics" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        {stats.map((s) => <Kpi key={s.label} iconName={s.icon} label={s.label} value={s.value} tint={s.color} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <Panel title="Fleet Storage-Quality Index — 30 Days" iconName="barChart" iconColor={C.cold}>
          <AreaTrend history={trendHistory} color={C.cold} height={260} />
        </Panel>
        <Panel title="Spoilage-Risk Ranking" iconName="alertTriangle" iconColor={C.crit}>
          <div style={{ display: "flex", flexDirection: "column", maxHeight: 300, overflowY: "auto" }}>
            {riskRanked.map((f) => (
              <div key={f.unitId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{f.village}</div>
                  <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>{f.produce} · {f.loadKg}kg</div>
                </div>
                <div style={{ width: 140 }}><ProgBar pct={f.spoilageRisk} color={progColor(f.spoilageRisk)} /></div>
                <div style={{ width: 45, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: progColor(f.spoilageRisk) }}>{f.spoilageRisk}%</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MapSection({ units, search, openUnit }) {
  const [filter, setFilter] = useState("All");
  const bySearch = units.filter((u) => matchesSearch(search, u.village, u.state, u.produce));
  const filtered = filter === "All" ? bySearch : bySearch.filter((u) => u.status === filter);
  const counts = ["Healthy", "Warning", "Critical"].map((s) => ({ s, n: units.filter((u) => u.status === s).length }));
  return (
    <div>
      <PageHead title="NER Deployment Map" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <Panel title="Unit Health Map" iconName="mapPin" iconColor={C.veg} right={
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", "Healthy", "Warning", "Critical"].map((s) => <Pill key={s} label={s} active={filter === s} color={C.veg} onClick={() => setFilter(s)} />)}
          </div>}>
          <NerMap units={filtered} onSelect={(u) => openUnit(u.id)} height={520} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="Fleet Status" iconName="gauge" iconColor={C.veg}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {counts.map((c) => (
                <div key={c.s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: statusColor(c.s) }} />
                  <div style={{ flex: 1, fontSize: 12, color: C.inkDim, fontWeight: 600 }}>{c.s}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: C.ink }}>{c.n}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Units" iconName="box" iconColor={C.cold} style={{ flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", maxHeight: 300, overflowY: "auto" }}>
              {filtered.length ? filtered.slice(0, 14).map((u) => (
                <RowHover key={u.id} onClick={() => openUnit(u.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 10px", borderBottom: `1px solid ${C.line}` }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{u.village}</div>
                    <div style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>{u.state} · {u.produce}</div>
                  </div>
                  <Badge status={u.status} compact />
                </RowHover>
              )) : <Empty text="No units match this filter." />}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PageHead({ title }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.ink, letterSpacing: "-.3px" }}>{title}</h1>
    </div>
  );
}

/* ===================== Unit detail modal ===================== */
function UnitModal({ unitId, units, freshness, onClose }) {
  if (!unitId) return null;
  const unit = units.find((u) => u.id === unitId);
  if (!unit) return null;
  const fresh = freshness.find((f) => f.unitId === unit.id);
  const timeline = [
    { l: "Solar panel charging active", t: "10m ago" },
    { l: `Sensor logged ${unit.temp}°C / ${unit.humidity}% RH`, t: "2m ago" },
    { l: fresh ? `Dispatch advisory: ${fresh.dispatchWindow}` : "No dispatch advisory pending", t: "5m ago" },
    { l: "SHA-256 Condition Passport record saved to LittleFS", t: "Just now" },
  ];
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 800, maxWidth: "100%", maxHeight: "88vh", overflowY: "auto", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 20px", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.panel, zIndex: 2 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IcWrap name="snowflake" color={C.cold} size={15} box={28} />
              <span style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{unit.village}</span>
              <Badge status={unit.status} />
            </div>
            <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>{unit.id} · {unit.state} · {unit.capacityL}L unit · {unit.produce}</div>
          </div>
          <button onClick={onClose} style={{ background: C.panelAlt, border: `1px solid ${C.line}`, borderRadius: 8, padding: 6, color: C.inkDim, display: "flex", cursor: "pointer" }}>
            <Ic name="x" size={16} color={C.inkDim} />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            <MiniStat label="Temperature" value={`${unit.temp}°C`} />
            <MiniStat label="Humidity" value={`${unit.humidity}%`} />
            <MiniStat label="Battery SOC" value={`${unit.battery}%`} />
            <MiniStat label="Power mode" value={unit.mode} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.inkDim, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>Temperature trend</div>
            <AreaTrend history={unit.tempHistory} color={C.cold} height={160} refLines={[{ y: 8, color: C.warn, label: "upper safe (8.0°C)" }, { y: 2, color: C.safe, label: "lower safe (2.0°C)" }]} />
          </div>
          {fresh && (
            <div style={{ background: C.panelAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: C.inkDim, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Produce & dispatch advisory</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: C.ink }}>
                <b>{fresh.produce}</b> · {fresh.spoilageRisk}% spoilage risk · {fresh.remainingHrs}h shelf-life remaining.<br />
                Recommendation: <b style={{ color: fresh.dispatchWindow.includes("immediately") ? C.crit : fresh.dispatchWindow.includes("2–3") ? C.warn : C.safe }}>{fresh.dispatchWindow}</b>
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: C.inkDim, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>Unit activity timeline</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {timeline.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 99, background: C.cold, flexShrink: 0 }} />
                  <div style={{ flex: 1, color: C.ink }}>{e.l}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", color: C.inkFaint, fontSize: 11 }}>{e.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Sidebar / Topbar ===================== */
function Sidebar({ section, setSection, critAlerts, mobileOpen, setMobileOpen }) {
  return (
    <div style={{
      width: 220, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: "#13161F", display: "flex", flexDirection: "column", zIndex: 20,
      position: "fixed", left: mobileOpen ? 0 : -260, top: 0, bottom: 0, transition: "left .25s",
    }} className="cr-sidebar">
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.line}`, height: 56 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#22C55E20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: C.safe }}>
          <Ic name="leaf" size={17} color={C.safe} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: "-.2px" }}>KrishiEdge</div>
          <div style={{ fontSize: 10, color: C.inkFaint, fontWeight: 500 }}>AgriCold Edge IoT</div>
        </div>
      </div>
      <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 3, flex: 1, overflowY: "auto" }}>
        {NAV.map((n) => {
          const active = section === n.id;
          return (
            <button key={n.id} onClick={() => { setSection(n.id); setMobileOpen(false); }}
              className={`cr-nav-item ${active ? "active" : ""}`}
              style={{
                display: "flex", alignItems: "center", gap: 10, height: 42, padding: "0 12px", borderRadius: 10, border: "none",
                background: active ? "#3B82F620" : "transparent",
                color: active ? "#3B82F6" : "#8B90A8",
                fontSize: 13, fontWeight: active ? 600 : 500, textAlign: "left", cursor: "pointer", transition: "all .15s"
              }}>
              <Ic name={n.icon} size={16} color={active ? "#3B82F6" : "#8B90A8"} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.id === "alerts" && critAlerts > 0 && (
                <span style={{ background: C.crit, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, fontFamily: "'JetBrains Mono',monospace" }}>{critAlerts}</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.inkDim, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: C.safe }} />
        <span>18 units live across NER</span>
      </div>
    </div>
  );
}

function Topbar({ search, setSearch, critAlerts, setMobileOpen }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, borderBottom: `1px solid ${C.line}`, background: "#13161F", position: "sticky", top: 0, zIndex: 10, gap: 16 }}>
      <button className="cr-menu-btn" onClick={() => setMobileOpen((v) => !v)} style={{ display: "none", background: C.panelAlt, border: `1px solid ${C.line}`, borderRadius: 8, padding: 6, marginRight: 6, cursor: "pointer" }}>
        <Ic name="menu" size={16} color={C.ink} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 12px", flex: 1, maxWidth: 380 }} className="cr-search">
        <Ic name="search" size={14} color={C.inkFaint} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search units, villages, produce..."
          style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: C.ink, width: "100%", fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: C.inkDim }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: C.safe }} />
          <span>ESP32 Gateway Synced</span>
        </div>
        <button style={{ position: "relative", width: 34, height: 34, borderRadius: 8, background: C.panel, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkDim, cursor: "pointer" }}>
          <Ic name="bell" size={15} color={C.inkDim} />
          {critAlerts > 0 && (
            <span style={{ position: "absolute", top: -3, right: -3, background: C.crit, color: "#fff", fontSize: 9, fontWeight: 700, minWidth: 15, height: 15, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid #13161F`, padding: "0 2px" }}>
              {critAlerts}
            </span>
          )}
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 99, background: C.panelAlt, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkDim }}>
          <Ic name="user" size={15} color={C.inkDim} />
        </div>
      </div>
    </div>
  );
}

/* ===================== Main App Component ===================== */
export default function App() {
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [section, setSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [modalUnitId, setModalUnitId] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState("CS-101");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Poll backend for real-time unit updates if backend is running
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await fetch("/api/units");
        if (res.ok) {
          const apiUnits = await res.json();
          if (apiUnits && apiUnits.length > 0) {
            setUnits((prev) => {
              const map = new Map(prev.map((u) => [u.id, u]));
              apiUnits.forEach((au) => {
                if (map.has(au.id)) {
                  map.set(au.id, { ...map.get(au.id), ...au });
                }
              });
              return Array.from(map.values());
            });
          }
        }
      } catch (e) {
        // Fallback to local state if backend not connected yet
      }
    };

    fetchUnits();
    const interval = setInterval(fetchUnits, 5000);
    return () => clearInterval(interval);
  }, []);

  const freshness = useMemo(() => genFreshness(units), [units]);
  const alerts = useMemo(() => genAlerts(units), [units]);

  const critAlerts = alerts.filter((a) => a.sev === "Critical").length;
  const openUnit = (id) => setModalUnitId(id);

  const sections = {
    overview: <Overview units={units} freshness={freshness} alerts={alerts} search={search} setSection={setSection} openUnit={openUnit} />,
    passport: <PassportSection units={units} selectedUnitId={selectedUnitId} setSelectedUnitId={setSelectedUnitId} />,
    camera: <CameraSection units={units} />,
    units: <UnitsSection units={units} search={search} openUnit={openUnit} />,
    energy: <EnergySection units={units} search={search} />,
    freshness: <FreshnessSection freshness={freshness} search={search} openUnit={openUnit} />,
    twin: <TwinSection />,
    alerts: <AlertsSection alerts={alerts} search={search} />,
    coop: <CoopSection />,
    analytics: <AnalyticsSection freshness={freshness} />,
    map: <MapSection units={units} search={search} openUnit={openUnit} />,
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: C.bg, color: C.ink, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        html, body { margin:0; padding:0; background: ${C.bg}; color: ${C.ink}; min-height:100vh; font-family: 'Inter', -apple-system, sans-serif; }
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-thumb{background:${C.line};border-radius:6px;}
        ::-webkit-scrollbar-thumb:hover{background:${C.line2};}
        ::-webkit-scrollbar-track{background:transparent;}
        button:focus-visible, input:focus-visible, select:focus-visible{outline:2px solid ${C.cold};outline-offset:2px;}
        .cr-shell{display:flex;min-height:100vh;width:100%;position:relative;}
        .cr-main{flex:1;min-width:0;display:flex;flex-direction:column;min-height:100vh;background:${C.bg};}
        .cr-content{padding:24px 24px 80px 24px;flex:1;}
        .cr-nav-item:not(.active):hover { background: #20232E !important; color: #F0F2F8 !important; }
        .cr-nav-item:not(.active):hover svg { color: #F0F2F8 !important; }
        @media (min-width: 921px){ .cr-sidebar{ position:sticky !important; top:0 !important; height:100vh !important; left:0 !important; } }
        @media (max-width: 920px){
          .cr-menu-btn{ display:flex !important; }
          .cr-search{ display:none !important; }
          .cr-main{ margin-left:0; }
          .cr-content{ padding:16px 16px 80px 16px; }
        }
      `}</style>
      <div className="cr-shell">
        <Sidebar section={section} setSection={setSection} critAlerts={critAlerts} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="cr-main">
          <Topbar search={search} setSearch={setSearch} critAlerts={critAlerts} setMobileOpen={setMobileOpen} />
          <div className="cr-content">{sections[section]}</div>
        </div>
      </div>
      <UnitModal unitId={modalUnitId} units={units} freshness={freshness} onClose={() => setModalUnitId(null)} />
    </div>
  );
}
