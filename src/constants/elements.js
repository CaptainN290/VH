// ─────────────────────────────────────────────────────────────
// ELEMENTAL FORMS
// ─────────────────────────────────────────────────────────────

export const ELEM = {
  NONE: { name: "None", icon: "○", color: "#888888", glow: "#666666" },
  FLAME: { name: "Flame", icon: "🔥", color: "#ff6633", glow: "#ff8855" },
  WATER: { name: "Water", icon: "💧", color: "#33aaff", glow: "#55ccff" },
  WIND: { name: "Wind", icon: "💨", color: "#88ff88", glow: "#aaffaa" },
  EARTH: { name: "Earth", icon: "🪨", color: "#cc9955", glow: "#ddaa77" },
  THUNDER: { name: "Thunder", icon: "⚡", color: "#ffee55", glow: "#ffff88" },
  VOID: { name: "Void", icon: "👁", color: "#8855cc", glow: "#aa77ee" },
};

export const PCOLORS = {
  NONE: ["#888888", "#aaaaaa", "#666666"],
  FLAME: ["#ff6633", "#ff8855", "#ffaa44", "#ffcc33"],
  WATER: ["#33aaff", "#55ccff", "#77ddff", "#99eeff"],
  WIND: ["#88ff88", "#aaffaa", "#ccffcc"],
  EARTH: ["#cc9955", "#ddaa77", "#eebb88"],
  THUNDER: ["#ffee55", "#ffff88", "#ffffaa"],
  VOID: ["#8855cc", "#aa77ee", "#cc99ff", "#6633aa"],
};

export const CONSTANTS = {
  TILE: 32,
  COLS: 25,
  ROWS: 17,
  W: 800,
  H: 544,
};
