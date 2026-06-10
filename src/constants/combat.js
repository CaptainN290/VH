// ─────────────────────────────────────────────────────────────
// COMBAT CONFIGURATION
// ─────────────────────────────────────────────────────────────

export const COMBAT_CONFIG = {
  BASE_DAMAGE: 15,
  LEVEL_DAMAGE_BONUS: 3,
  BASE_ATTACK_CD: 28,
  COMBO_WINDOW: 35,
  COMBO_DAMAGE_BONUS: 0.25,
  DODGE_DURATION: 12,
  DODGE_CD: 50,
  DODGE_MP_COST: 8,
  DODGE_SPEED_MULT: 2.8,
  INVINCIBLE_FRAMES: 30,
  SOUL_ART_MP_COST: 45,
  FORM_MULTIPLIERS: {
    NONE: 1.0,
    FLAME: 1.25,
    WATER: 1.0,
    WIND: 1.15,
    EARTH: 1.3,
    THUNDER: 1.2,
    VOID: 1.1,
  },
};

export const SOUL_ARTS = {
  FLAME: {
    name: "Inferno Burst",
    damage: 60,
    description: "A blazing burst that damages all nearby enemies",
  },
  WATER: {
    name: "Healing Tide",
    damage: 30,
    heal: 25,
    description: "Damages enemies and heals yourself",
  },
  WIND: {
    name: "Gale Slash",
    damage: 45,
    description: "A sweeping wind attack",
  },
  EARTH: {
    name: "Stone Shield",
    damage: 20,
    defense: 50,
    description: "Raises defense temporarily",
  },
  THUNDER: {
    name: "Lightning Strike",
    damage: 70,
    description: "A powerful single-target strike",
  },
  VOID: {
    name: "Void Pull",
    damage: 40,
    description: "Pulls enemies toward you and damages them",
  },
};
