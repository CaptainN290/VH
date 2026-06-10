// ─────────────────────────────────────────────────────────────
// SAVE SYSTEM
// ─────────────────────────────────────────────────────────────

const SAVE_KEY = "veilhunter_save";

export const saveSystem = {
  save: (gameState) => {
    const saveData = {
      timestamp: Date.now(),
      ui: {
        phase: gameState.phase,
        hp: gameState.hp,
        maxHp: gameState.maxHp,
        mp: gameState.mp,
        maxMp: gameState.maxMp,
        xp: gameState.xp,
        xpNext: gameState.xpNext,
        level: gameState.level,
        fp: gameState.fp,
        flags: gameState.flags,
        form: gameState.form,
        unlockedForms: gameState.unlockedForms,
        hasCompanion: gameState.hasCompanion,
        flameShard: gameState.flameShard,
        inventory: gameState.inventory,
        equippedWeapon: gameState.equippedWeapon,
        equippedArmor: gameState.equippedArmor,
      }
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  },

  load: () => {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? JSON.parse(data) : null;
  },

  clear: () => {
    localStorage.removeItem(SAVE_KEY);
  },

  hasSave: () => {
    return localStorage.getItem(SAVE_KEY) !== null;
  },

  getSaveInfo: () => {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      timestamp: parsed.timestamp,
      level: parsed.ui.level,
      location: parsed.ui.phase === "DUNGEON" ? "Thornfield Ruins" : "Sunhaven",
      playtime: Math.floor((Date.now() - parsed.timestamp) / 1000 / 60), // minutes
    };
  }
};
