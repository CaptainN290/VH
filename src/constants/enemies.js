// ─────────────────────────────────────────────────────────────
// ENEMY DEFINITIONS
// ─────────────────────────────────────────────────────────────

export const EDEFS = {
  SHADOW_SLIME: {
    name: "Shadow Slime",
    elem: "VOID",
    hp: 25,
    atk: 8,
    spd: 1.2,
    sz: 18,
    xp: 12,
    fp: 3,
  },
  FLAME_SPRITE: {
    name: "Flame Sprite",
    elem: "FLAME",
    hp: 35,
    atk: 12,
    spd: 1.5,
    sz: 22,
    xp: 18,
    fp: 5,
  },
  CORRUPTED_WISP: {
    name: "Corrupted Wisp",
    elem: "VOID",
    hp: 40,
    atk: 10,
    spd: 1.8,
    sz: 20,
    xp: 22,
    fp: 6,
  },
  GUARDIAN: {
    name: "Corrupted Guardian",
    elem: "VOID",
    hp: 200,
    atk: 18,
    spd: 0.8,
    sz: 48,
    xp: 150,
    fp: 40,
    isBoss: true,
  },
};

export const DUNGEON_SPAWNS = [
  { type: "SHADOW_SLIME", tx: 6, ty: 6 },
  { type: "SHADOW_SLIME", tx: 18, ty: 6 },
  { type: "FLAME_SPRITE", tx: 12, ty: 10 },
  { type: "CORRUPTED_WISP", tx: 6, ty: 12 },
  { type: "SHADOW_SLIME", tx: 18, ty: 12 },
  { type: "FLAME_SPRITE", tx: 12, ty: 14 },
  { type: "GUARDIAN", tx: 12, ty: 8, isBoss: true },
];

export const WEAKNESSES = {
  FLAME: "WATER",
  WATER: "THUNDER",
  WIND: "EARTH",
  EARTH: "WIND",
  THUNDER: "EARTH",
  VOID: "FLAME",
};
