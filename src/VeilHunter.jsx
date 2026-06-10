import { useState, useEffect, useRef, useCallback } from "react";
import { VILLAGE_MAP, DUNGEON_MAP, FLAME_SHARD_POS, DUNGEON_EXIT_POS, isSolid } from "./constants/maps";
import { STORY_SCENES, CHAPTER_INFO } from "./constants/story";
import { ELEM, PCOLORS, CONSTANTS } from "./constants/elements";
import { NPCS_VILLAGE, COMPANION_DEFS } from "./constants/npcs";
import { EDEFS, DUNGEON_SPAWNS, WEAKNESSES } from "./constants/enemies";
import { COMBAT_CONFIG, SOUL_ARTS } from "./constants/combat";
import { ITEMS, STARTING_INVENTORY } from "./constants/inventory";
import { rnd, dist, moveEntity, clamp } from "./utils/helpers";
import { saveSystem } from "./utils/saveSystem";

const { TILE, COLS, ROWS, W, H } = CONSTANTS;

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function VeilHunter() {
  // ── React UI state (small, drives overlay renders)
  const [ui, setUi] = useState({
    phase: "STORY_INTRO",   // STORY_INTRO | VILLAGE | DUNGEON | STORY_* | GAMEOVER | WIN
    storyKey: "INTRO",
    storyIdx: 0,

    // Player stats
    hp: 80, maxHp: 80,
    mp: 40, maxMp: 40,
    xp: 0, xpNext: 80,
    level: 1,
    fp: 0,

    // Progression flags
    flags: {},
    form: "NONE",
    unlockedForms: [],
    hasCompanion: false,
    flameShard: false,

    // Combat/interaction
    dialog: null,
    message: null,
    showFormMenu: false,
    showHelp: false,
    inventory: [],

    // Equipment
    equippedWeapon: "TRAINING_BLADE",
    equippedArmor: "TRAVELLER_CLOTHES",
  });
  const uiRef = useRef(ui);
  uiRef.current = ui;

  // ── Canvas game-state (mutable, not React)
  const canvasRef = useRef(null);
  const gs = useRef(null);
  const keys = useRef({});
  const mouse = useRef({ x: 0, y: 0, pressed: false });
  const raf = useRef(null);
  const lastT = useRef(0);

  // ─────────────────────────────────────────────────────────
  // GAME STATE FACTORY
  // ─────────────────────────────────────────────────────────
  function makePlayer(scene) {
    const pos = scene === "DUNGEON"
      ? { x: 12 * TILE + 16, y: 2 * TILE + 16 }
      : { x: 12 * TILE + 16, y: 11 * TILE + 16 };
    return {
      x: pos.x, y: pos.y,
      w: 22, h: 26,
      facing: 1,
      state: "idle", animF: 0, animT: 0,
      atkCD: 0, dodgeCD: 0, invincible: 0,
      dodging: false, dodgeT: 0, dodgeDx: 0, dodgeDy: 0,
      comboN: 0, comboT: 0,
      atkFrame: 0,
    };
  }

  function makeCompanion(scene) {
    const pos = scene === "DUNGEON"
      ? { x: 13 * TILE + 16, y: 2 * TILE + 16 }
      : { x: 11 * TILE + 16, y: 11 * TILE + 16 };
    return { x: pos.x, y: pos.y, w: 20, h: 24, facing: -1, atkCD: 0, animF: 0, animT: 0, hp: 90, maxHp: 90 };
  }

  function makeEnemy(type, tx, ty) {
    const d = EDEFS[type];
    return {
      ...JSON.parse(JSON.stringify(d)),
      maxHp: d.hp,
      x: tx * TILE + 16, y: ty * TILE + 16,
      w: d.sz, h: d.sz,
      facing: -1,
      animF: 0, animT: 0, atkCD: 0,
      aiT: Math.random() * 60,
      state: "idle",
      id: Math.random().toString(36).slice(2),
    };
  }

  function initScene(scene) {
    const cur = uiRef.current;
    const map = scene === "DUNGEON" ? DUNGEON_MAP : VILLAGE_MAP;
    const enemies = scene === "DUNGEON"
      ? DUNGEON_SPAWNS
        .filter(s => !(s.isBoss && cur.flags.BOSS_DEAD))
        .map(s => makeEnemy(s.type, s.tx, s.ty))
      : [];
    const companion = (cur.hasCompanion || cur.flags.LYRA_JOINED) && scene === "DUNGEON"
      ? makeCompanion(scene) : null;

    gs.current = {
      scene, map,
      player: makePlayer(scene),
      companion,
      enemies,
      particles: [],
      dmgNums: [],
      shake: 0,
      cam: { x: 0, y: 0 },
      flameShard: scene === "DUNGEON" && !cur.flameShard
        ? { x: FLAME_SHARD_POS.tx * TILE + 16, y: FLAME_SHARD_POS.ty * TILE + 16, pulse: 0 }
        : null,
    };
    snapCamera();
  }

  function snapCamera() {
    if (!gs.current) return;
    const p = gs.current.player, c = gs.current.cam;
    c.x = Math.max(0, Math.min(p.x - W / 2, COLS * TILE - W));
    c.y = Math.max(0, Math.min(p.y - H / 2, ROWS * TILE - H));
  }

  // ─────────────────────────────────────────────────────────
  // PARTICLES
  // ─────────────────────────────────────────────────────────
  function spawnParts(x, y, elem, n = 8, type = "normal") {
    if (!gs.current) return;
    const cols = PCOLORS[elem] || PCOLORS.NONE;
    for (let i = 0; i < n; i++) {
      gs.current.particles.push({
        x, y,
        vx: rnd(-3, 3), vy: rnd(-4, -0.5),
        life: rnd(0.5, 1.0), maxLife: rnd(0.5, 1.0),
        sz: rnd(3, 9),
        col: cols[Math.floor(Math.random() * cols.length)],
        type,
      });
    }
  }

  function spawnSlash(x, y, dir, elem) {
    const cols = PCOLORS[elem] || PCOLORS.NONE;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      gs.current.particles.push({
        x: x + dir * 18, y,
        vx: Math.cos(a) * 4.5 + dir * 2, vy: Math.sin(a) * 4.5,
        life: 0.35, maxLife: 0.35,
        sz: rnd(4, 11), col: cols[Math.floor(Math.random() * cols.length)], type: "slash",
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // COMBAT
  // ─────────────────────────────────────────────────────────
  function doAttack() {
    const g = gs.current; if (!g) return;
    const p = g.player;
    if (p.atkCD > 0) return;
    const form = uiRef.current.form;
    const fmult = COMBAT_CONFIG.FORM_MULTIPLIERS[form] || 1.0;
    p.comboN = p.comboT > 0 ? (p.comboN + 1) % 3 : 0;
    p.comboT = COMBAT_CONFIG.COMBO_WINDOW;
    p.atkCD = COMBAT_CONFIG.BASE_ATTACK_CD;
    p.state = "attack";
    p.atkFrame = 0;
    const range = 52 + p.comboN * 12;
    const atx = p.x + p.facing * range * 0.5;
    const baseDmg = COMBAT_CONFIG.BASE_DAMAGE + (uiRef.current.level * COMBAT_CONFIG.LEVEL_DAMAGE_BONUS);
    const dmg = Math.round(baseDmg * fmult * (1 + p.comboN * COMBAT_CONFIG.COMBO_DAMAGE_BONUS));
    spawnSlash(atx, p.y, p.facing, form);
    let hit = false;
    g.enemies.forEach(e => {
      if (dist({ x: atx, y: p.y }, e) < range) {
        hitEnemy(e, dmg, form);
        hit = true;
      }
    });
    g.shake = hit ? 4 : 1;
  }

  function hitEnemy(e, dmg, elem) {
    const bonus = WEAKNESSES[e.elem] === elem ? 1.5 : WEAKNESSES[elem] === e.elem ? 0.7 : 1;
    const actual = Math.round(dmg * bonus);
    e.hp = Math.max(0, e.hp - actual);
    spawnParts(e.x, e.y, elem, 10, "hit");
    gs.current.dmgNums.push({
      x: e.x + rnd(-8, 8), y: e.y - 20,
      val: actual, crit: bonus > 1,
      col: bonus > 1 ? "#ffdd00" : "#ff5555",
      life: 1.5, maxLife: 1.5, vy: -1.2,
    });
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    const g = gs.current; if (!g) return;
    spawnParts(e.x, e.y, e.elem || "VOID", 18, "normal");
    g.enemies = g.enemies.filter(x => x.id !== e.id);
    const isBoss = e.isBoss;
    setUi(prev => {
      let { xp, xpNext, level, maxHp, fp, flags } = prev;
      xp += e.xp; fp += e.fp;
      let msg = `+${e.xp} XP`;
      while (xp >= xpNext) {
        xp -= xpNext;
        level++;
        xpNext = Math.round(xpNext * 1.4);
        maxHp += 15;
        msg = `✨ Level ${level}!`;
      }
      if (isBoss) {
        setTimeout(() => showStory("BOSS_DEAD"), 400);
        return { ...prev, xp, xpNext, level, maxHp, fp, flags: { ...flags, BOSS_DEAD: true }, message: null };
      }
      return { ...prev, xp, xpNext, level, maxHp, fp, message: msg };
    });
  }

  function doDodge() {
    const g = gs.current; if (!g) return;
    const p = g.player;
    if (p.dodgeCD > 0 || p.dodging) return;
    if (uiRef.current.mp < COMBAT_CONFIG.DODGE_MP_COST) return;
    const dx = (keys.current["ArrowLeft"] || keys.current["a"]) ? -1 : (keys.current["ArrowRight"] || keys.current["d"]) ? 1 : p.facing;
    const dy = (keys.current["ArrowUp"] || keys.current["w"]) ? -1 : (keys.current["ArrowDown"] || keys.current["s"]) ? 1 : 0;
    p.dodging = true;
    p.dodgeT = COMBAT_CONFIG.DODGE_DURATION;
    p.dodgeCD = COMBAT_CONFIG.DODGE_CD;
    p.invincible = COMBAT_CONFIG.INVINCIBLE_FRAMES;
    p.dodgeDx = dx;
    p.dodgeDy = dy;
    spawnParts(p.x, p.y, uiRef.current.form, 5);
    setUi(prev => ({ ...prev, mp: Math.max(0, prev.mp - COMBAT_CONFIG.DODGE_MP_COST) }));
  }

  function doSoulArt() {
    const form = uiRef.current.form;
    if (form === "NONE") {
      setUi(p => ({ ...p, message: "You have no Elemental Form yet!" }));
      return;
    }
    const g = gs.current; if (!g) return;
    if (uiRef.current.mp < COMBAT_CONFIG.SOUL_ART_MP_COST) {
      setUi(p => ({ ...p, message: "Not enough MP! (need 45)" }));
      return;
    }
    const p = g.player;
    const art = SOUL_ARTS[form];
    let msg = art.name;
    spawnParts(p.x, p.y, form, 50, "slash");
    g.shake = 10;
    if (form === "FLAME") {
      g.enemies.forEach(e => hitEnemy(e, art.damage, form));
    } else if (form === "WATER") {
      g.enemies.forEach(e => hitEnemy(e, art.damage, form));
      setUi(prev => ({ ...prev, hp: Math.min(prev.hp + art.heal, prev.maxHp) }));
    }
    setUi(prev => ({ ...prev, mp: 0, message: msg }));
  }

  // ─────────────────────────────────────────────────────────
  // STORY/DIALOG HELPERS
  // ─────────────────────────────────────────────────────────
  function showStory(key) {
    setUi(prev => ({ ...prev, phase: "STORY_" + key, storyKey: key, storyIdx: 0 }));
  }

  function advanceStory() {
    const { storyKey, storyIdx } = uiRef.current;
    const lines = STORY_SCENES[storyKey] || [];
    if (storyIdx + 1 < lines.length) {
      setUi(prev => ({ ...prev, storyIdx: prev.storyIdx + 1 }));
    } else {
      if (storyKey === "INTRO") {
        setUi(prev => ({ ...prev, phase: "VILLAGE" }));
        setTimeout(() => initScene("VILLAGE"), 50);
      } else if (storyKey === "FOUND_FLAME") {
        setUi(prev => ({ ...prev, phase: "DUNGEON", form: "FLAME", unlockedForms: [...prev.unlockedForms, "FLAME"], flameShard: true, message: "🔥 Flame Form unlocked!" }));
        setTimeout(() => initScene("DUNGEON"), 50);
      } else if (storyKey === "BOSS_APPROACH") {
        setUi(prev => ({ ...prev, phase: "DUNGEON" }));
      } else if (storyKey === "BOSS_DEAD") {
        setUi(prev => ({ ...prev, phase: "WIN" }));
      }
    }
  }

  function openNpcDialog(npc) {
    if (npc.requiresFlag && !uiRef.current.flags[npc.requiresFlag]) {
      setUi(prev => ({
        ...prev,
        dialog: {
          lines: ["(They seem busy right now. Maybe talk to someone else first.)"],
          idx: 0, name: npc.name, portrait: npc.portrait || "👤",
          npcId: npc.id,
        }
      }));
      return;
    }
    setUi(prev => ({
      ...prev,
      dialog: { lines: npc.dialog, idx: 0, name: npc.name, portrait: npc.portrait || "👤", npcId: npc.id },
    }));
  }

  function advanceDialog() {
    const d = uiRef.current.dialog; if (!d) return;
    if (d.idx + 1 < d.lines.length) {
      setUi(prev => ({ ...prev, dialog: { ...prev.dialog, idx: prev.dialog.idx + 1 } }));
    } else {
      const npc = NPCS_VILLAGE.find(n => n.id === d.npcId);
      setUi(prev => {
        const flags = { ...prev.flags };
        let hp = prev.hp;
        let hasCompanion = prev.hasCompanion;
        if (npc?.setsFlag) flags[npc.setsFlag] = true;
        if (npc?.givesHeal) { hp = Math.min(prev.hp + npc.givesHeal, prev.maxHp); }
        if (npc?.joinsParty) { hasCompanion = true; flags.LYRA_JOINED = true; }
        return { ...prev, dialog: null, flags, hp, hasCompanion };
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────
  function update(dt) {
    const g = gs.current; if (!g) return;
    const phase = uiRef.current.phase;
    if (phase !== "VILLAGE" && phase !== "DUNGEON") return;
    if (uiRef.current.dialog || uiRef.current.showFormMenu || uiRef.current.showHelp) return;

    const p = g.player;
    const map = g.map;
    const spd = 2.5 * (uiRef.current.form === "FLAME" ? 0.95 : 1.0);

    // Timers
    if (p.atkCD > 0) p.atkCD--;
    if (p.dodgeCD > 0) p.dodgeCD--;
    if (p.invincible > 0) p.invincible--;
    if (p.comboT > 0) p.comboT--;
    if (g.shake > 0) g.shake *= 0.8;

    // Player move
    let dx = 0, dy = 0;
    if (!p.dodging) {
      if (keys.current["ArrowLeft"] || keys.current["a"]) dx -= spd;
      if (keys.current["ArrowRight"] || keys.current["d"]) dx += spd;
      if (keys.current["ArrowUp"] || keys.current["w"]) dy -= spd;
      if (keys.current["ArrowDown"] || keys.current["s"]) dy += spd;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      if (dx) p.facing = Math.sign(dx);
      p.state = (dx || dy) ? "walk" : "idle";
    } else {
      dx = p.dodgeDx * spd * COMBAT_CONFIG.DODGE_SPEED_MULT;
      dy = p.dodgeDy * spd * COMBAT_CONFIG.DODGE_SPEED_MULT;
      p.dodgeT--;
      if (p.dodgeT <= 0) { p.dodging = false; p.state = "idle"; }
    }
    moveEntity(p, map, dx, dy, TILE, isSolid);

    // Anim
    p.animT++;
    if (p.animT > 7) { p.animT = 0; p.animF = (p.animF + 1) % 4; }
    if (p.state === "attack") { p.atkFrame++; if (p.atkFrame > 16) p.state = "idle"; }

    // MP regen
    if (phase === "VILLAGE") {
      setUi(prev => ({
        ...prev,
        hp: Math.min(prev.hp + (Math.random() < 0.015 ? 1 : 0), prev.maxHp),
        mp: Math.min(prev.mp + (Math.random() < 0.02 ? 1 : 0), prev.maxMp),
      }));
    }

    // Companion AI
    if (g.companion) {
      const c = g.companion;
      c.animT = (c.animT || 0) + 1;
      if (c.animT > 10) { c.animT = 0; c.animF = (c.animF + 1) % 4; }
      c.atkCD = c.atkCD > 0 ? c.atkCD - 1 : 0;
      const dp = dist(c, p);
      if (dp > 55) { const cdx = (p.x - c.x) / dp * 2.1, cdy = (p.y - c.y) / dp * 2.1; c.facing = Math.sign(cdx); moveEntity(c, map, cdx, cdy, TILE, isSolid); }
      if (c.atkCD <= 0) {
        const ne = g.enemies.find(e => dist(c, e) < 110);
        if (ne) { c.atkCD = 65; spawnParts(ne.x, ne.y, "WATER", 8, "hit"); hitEnemy(ne, 12, "WATER"); }
      }
    }

    // Enemy AI
    g.enemies.forEach(e => {
      e.aiT--;
      e.animT = (e.animT || 0) + 1; if (e.animT > 10) { e.animT = 0; e.animF = (e.animF + 1) % 2; }
      e.atkCD = e.atkCD > 0 ? e.atkCD - 1 : 0;
      const dp = dist(e, p);
      if (e.aiT <= 0) { e.aiT = 20 + Math.random() * 40; e.state = dp < 220 ? "chase" : "idle"; }
      if (e.state === "chase") {
        const ex = (p.x - e.x) / dp * e.spd, ey = (p.y - e.y) / dp * e.spd;
        e.facing = Math.sign(ex); moveEntity(e, map, ex, ey, TILE, isSolid);
      }
      if (dp < 36 && e.atkCD <= 0 && p.invincible <= 0) {
        e.atkCD = 80;
        const dmg = e.atk;
        spawnParts(p.x, p.y, "VOID", 6, "hit"); g.shake = 5;
        setUi(prev => {
          const nhp = prev.hp - dmg;
          if (nhp <= 0) { setTimeout(() => setUi(s => ({ ...s, phase: "GAMEOVER" })), 400); return { ...prev, hp: 0 }; }
          return { ...prev, hp: nhp };
        });
      }
    });

    // Flame shard pickup
    if (g.flameShard) {
      g.flameShard.pulse = (g.flameShard.pulse || 0) + 0.05;
      if (dist(p, g.flameShard) < 28 && !uiRef.current.flameShard) {
        g.flameShard = null;
        showStory("FOUND_FLAME");
        return;
      }
    }

    // Boss approach story
    const boss = g.enemies.find(e => e.isBoss);
    if (boss && dist(p, boss) < 120 && !uiRef.current.flags.BOSS_STORY_SHOWN) {
      setUi(prev => ({ ...prev, flags: { ...prev.flags, BOSS_STORY_SHOWN: true } }));
      showStory("BOSS_APPROACH");
      return;
    }

    // Particles + dmg nums
    g.particles = g.particles.filter(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.12; pt.life -= 0.03; return pt.life > 0; });
    g.dmgNums = g.dmgNums.filter(d => { d.y += d.vy; d.life -= 0.035; return d.life > 0; });

    // NPC proximity (village)
    if (phase === "VILLAGE") {
      NPCS_VILLAGE.forEach(npc => {
        const nx = npc.tx * TILE + 16, ny = npc.ty * TILE + 16;
        if (dist(p, { x: nx, y: ny }) < 40) {
          if (keys.current["e"] || keys.current["E"] || keys.current["Enter"]) {
            keys.current["e"] = keys.current["E"] = keys.current["Enter"] = false;
            openNpcDialog(npc);
          }
        }
      });
      // Cave entrance at tile 11,14
      const caveX = 11 * TILE + 16, caveY = 14 * TILE + 16;
      if (dist(p, { x: caveX, y: caveY }) < 30) {
        if (keys.current["e"] || keys.current["E"] || keys.current["Enter"]) {
          keys.current["e"] = keys.current["E"] = keys.current["Enter"] = false;
          if (!uiRef.current.flags.TALKED_ELDER) {
            setUi(prev => ({ ...prev, message: "A foreboding darkness... Perhaps speak with Elder Sable first." }));
          } else {
            setUi(prev => ({ ...prev, phase: "DUNGEON" }));
            setTimeout(() => initScene("DUNGEON"), 50);
          }
        }
      }
    }

    // Dungeon exit (glowing door at top)
    if (phase === "DUNGEON") {
      const exitX = DUNGEON_EXIT_POS.tx * TILE + 16, exitY = DUNGEON_EXIT_POS.ty * TILE + 16;
      if (dist(p, { x: exitX, y: exitY }) < 35) {
        if (keys.current["e"] || keys.current["E"] || keys.current["Enter"]) {
          keys.current["e"] = keys.current["E"] = keys.current["Enter"] = false;
          setUi(prev => ({ ...prev, phase: "VILLAGE", hp: Math.min(prev.hp + 25, prev.maxHp), mp: Math.min(prev.mp + 15, prev.maxMp) }));
          setTimeout(() => initScene("VILLAGE"), 50);
        }
      }
    }

    // Camera
    snapCamera();
  }

  // ─────────────────────────────────────────────────────────
  // DRAW
  // ─────────────────────────────────────────────────────────
  function draw(t) {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gs.current;
    const phase = uiRef.current.phase;
    if (phase !== "VILLAGE" && phase !== "DUNGEON") { ctx.clearRect(0, 0, W, H); return; }
    if (!g) return;

    const shk = g.shake > 0.3 ? g.shake : 0;
    const cx = g.cam.x + (shk ? (Math.random() - 0.5) * shk * 1.8 : 0);
    const cy = g.cam.y + (shk ? (Math.random() - 0.5) * shk * 1.8 : 0);

    // Sky/ground fill
    ctx.fillStyle = phase === "DUNGEON" ? "#08060f" : "#2a5018";
    ctx.fillRect(0, 0, W, H);

    // Tiles
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile(ctx, tx, ty, g.map[ty][tx], cx, cy, t);

    // Cave entrance marker (village)
    if (phase === "VILLAGE") {
      const cvx = 11 * TILE + 16 - cx, cvy = 14 * TILE + 16 - cy;
      const pulse = Math.sin(t / 400) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = pulse * 0.8;
      ctx.fillStyle = "#8855dd";
      ctx.fillRect(cvx - 16, cvy - 16, 32, 32);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CAVE", cvx, cvy - 20);
      ctx.fillText("[E]", cvx, cvy - 10);
      ctx.restore();
    }

    // Dungeon exit (glowing door)
    if (phase === "DUNGEON") {
      const exX = DUNGEON_EXIT_POS.tx * TILE + 16 - cx, exY = DUNGEON_EXIT_POS.ty * TILE + 16 - cy;
      const pulse = Math.sin(t / 300) * 0.4 + 0.6;
      ctx.save();
      ctx.shadowBlur = 20 + pulse * 15;
      ctx.shadowColor = "rgba(150,100,255," + (pulse * 0.6) + ")";
      ctx.globalAlpha = pulse * 0.9;
      ctx.fillStyle = "#9966ff";
      ctx.fillRect(exX - 18, exY - 20, 36, 40);
      ctx.fillStyle = "#dd99ff";
      ctx.fillRect(exX - 14, exY - 16, 28, 32);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EXIT", exX, exY - 24);
      ctx.fillText("[E]", exX, exY + 20);
      ctx.restore();
    }

    // NPCs
    if (phase === "VILLAGE") {
      NPCS_VILLAGE.forEach(npc => {
        const nx = npc.tx * TILE, ny = npc.ty * TILE;
        const sx = nx - cx, sy = ny - cy;
        ctx.save();
        ctx.shadowBlur = 12; ctx.shadowColor = npc.color;
        ctx.fillStyle = npc.color; ctx.fillRect(sx + 6, sy, 20, 22);
        ctx.fillStyle = "#f0d080"; ctx.fillRect(sx + 7, sy, 18, 11);
        ctx.fillStyle = "#222"; ctx.fillRect(sx + 10, sy + 4, 3, 3); ctx.fillRect(sx + 18, sy + 4, 3, 3);
        ctx.fillStyle = npc.color; ctx.fillRect(sx + 4, sy + 22, 8, 10); ctx.fillRect(sx + 20, sy + 22, 8, 10);
        ctx.restore();
        const dp = dist({ x: npc.tx * TILE + 16, y: npc.ty * TILE + 16 }, g.player);
        if (dp < 55) {
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          const tw = npc.name.length * 6 + 8;
          ctx.fillRect(sx + 16 - tw / 2, sy - 18, tw, 14);
          ctx.fillStyle = "#fff"; ctx.font = "9px monospace"; ctx.textAlign = "center";
          ctx.fillText(npc.name, sx + 16, sy - 7);
          ctx.fillStyle = "#ffe066"; ctx.font = "bold 9px monospace";
          ctx.fillText("[E] Talk", sx + 16, sy - 30);
        }
      });
    }

    // Flame shard
    if (g.flameShard) {
      const fs = g.flameShard;
      const sx = fs.x - cx, sy = fs.y - cy;
      const p2 = Math.sin(fs.pulse) * 0.5 + 0.5;
      ctx.save();
      ctx.shadowBlur = 20 + p2 * 15; ctx.shadowColor = "#ff8030";
      ctx.fillStyle = `rgba(255,${120 + p2 * 80},${30 + p2 * 30},1)`;
      ctx.fillRect(sx - 8, sy - 8, 16, 16);
      ctx.fillStyle = "rgba(255,220,100,0.8)";
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
      ctx.restore();
      ctx.fillStyle = "#ff9a5c"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
      ctx.fillText("✦ Flame Shard", sx, sy - 16);
    }

    // Enemies
    g.enemies.forEach(e => {
      const sx = e.x - cx - e.w / 2, sy = e.y - cy - e.h / 2;
      const elem = ELEM[e.elem] || ELEM.VOID;
      ctx.save();
      ctx.shadowBlur = 10; ctx.shadowColor = elem.glow;
      if (e.isBoss) {
        const p2 = Math.sin(t / 200) * 0.3 + 0.7;
        ctx.fillStyle = elem.color; ctx.fillRect(sx, sy + e.h * 0.2, e.w, e.h * 0.8);
        ctx.fillStyle = "#0e0020"; ctx.fillRect(sx + 4, sy, e.w - 8, e.h * 0.4);
        ctx.fillStyle = "#ff2244"; ctx.fillRect(sx + 8, sy + 6, 9, 9); ctx.fillRect(sx + e.w - 17, sy + 6, 9, 9);
        ctx.fillStyle = "#777"; ctx.fillRect(sx + 4, sy - 10, 5, 13); ctx.fillRect(sx + e.w - 9, sy - 10, 5, 13);
        ctx.globalAlpha = p2 * 0.25; ctx.fillStyle = elem.color;
        ctx.fillRect(sx - 8, sy - 8, e.w + 16, e.h + 16);
        ctx.globalAlpha = 1;
      } else {
        const bob = Math.sin(e.animF * Math.PI) * 2;
        ctx.fillStyle = elem.color; ctx.fillRect(sx, sy + bob, e.w, e.h);
        ctx.fillStyle = "#0008"; ctx.fillRect(sx + 3, sy + 4 + bob, 5, 5); ctx.fillRect(sx + e.w - 8, sy + 4 + bob, 5, 5);
        ctx.fillStyle = "#ff3333"; ctx.fillRect(sx + 3, sy + e.h - 5 + bob, e.w - 6, 3);
      }
      ctx.fillStyle = "#222"; ctx.fillRect(sx, sy - 10, e.w, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? "#33ee33" : e.hp / e.maxHp > 0.25 ? "#eebb00" : "#ee2222";
      ctx.fillRect(sx, sy - 10, e.w * (e.hp / e.maxHp), 5);
      ctx.restore();
    });

    // Companion
    if (g.companion) {
      const c = g.companion;
      const sx = c.x - cx - c.w / 2, sy = c.y - cy - c.h / 2;
      ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#9fffff";
      ctx.fillStyle = "#e0c0a0"; ctx.fillRect(sx + 3, sy, c.w - 6, c.h - 8);
      ctx.fillStyle = "#cc3080"; ctx.fillRect(sx, sy, c.w, 8);
      ctx.fillStyle = "#4ecdc4"; ctx.fillRect(sx + 2, sy + c.h - 18, c.w - 4, 12);
      ctx.fillStyle = "#1a3860"; ctx.fillRect(sx + 2, sy + c.h - 8, 7, 8); ctx.fillRect(sx + c.w - 9, sy + c.h - 8, 7, 8);
      ctx.fillStyle = "#222"; ctx.fillRect(sx + 5, sy + 4, 3, 3); ctx.fillRect(sx + 12, sy + 4, 3, 3);
      ctx.restore();
    }

    // Player
    drawPlayer(ctx, g.player, cx, cy, t);

    // Particles
    g.particles.forEach(pt => {
      ctx.save(); ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.col;
      const sz = pt.sz * (pt.life / pt.maxLife);
      if (pt.type === "slash") ctx.fillRect(pt.x - sz / 2, pt.y - sz * 0.2, sz, sz * 0.35);
      else ctx.fillRect(pt.x - sz / 2, pt.y - sz / 2, sz, sz);
      ctx.restore();
    });

    // Damage numbers
    g.dmgNums.forEach(d => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, d.life / d.maxLife * 1.5);
      ctx.fillStyle = d.col;
      ctx.font = `bold ${d.crit ? 17 : 13}px monospace`;
      ctx.textAlign = "center";
      ctx.shadowBlur = 6; ctx.shadowColor = d.col;
      ctx.fillText(d.crit ? `★${d.val}` : `${d.val}`, d.x - cx, d.y - cy);
      ctx.restore();
    });

    // Dungeon fog
    if (phase === "DUNGEON") {
      const px = g.player.x - cx, py = g.player.y - cy;
      const grad = ctx.createRadialGradient(px, py, 30, px, py, 210);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }
  }

  function drawTile(ctx, tx, ty, tileId, cx, cy, t) {
    const sx = tx * TILE - cx, sy = ty * TILE - cy;
    if (sx < -TILE || sx > W || sy < -TILE || sy > H) return;

    if (tileId === 0) {
      ctx.fillStyle = "#4a8530"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#3d7228"; ctx.fillRect(sx + 1, sy + 1, 4, 4); ctx.fillRect(sx + 18, sy + 20, 3, 3); ctx.fillRect(sx + 26, sy + 8, 4, 3);
    } else if (tileId === 1) {
      ctx.fillStyle = "#c8a858"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#b89040"; for (let i = 0; i < 3; i++) ctx.fillRect(sx + 2 + i * 10, sy + 2, 8, 3);
    } else if (tileId === 2) {
      ctx.fillStyle = "#1d4a10"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#2d7020"; ctx.fillRect(sx + 4, sy + 3, 24, 18);
      ctx.fillStyle = "#3d9030"; ctx.fillRect(sx + 8, sy + 5, 16, 12);
      ctx.fillStyle = "#7b4a20"; ctx.fillRect(sx + 12, sy + 21, 8, 11);
    } else if (tileId === 3) {
      ctx.fillStyle = "#1e6890"; ctx.fillRect(sx, sy, TILE, TILE);
      const w = Math.sin(t / 900 + tx * 0.7 + ty * 0.4) * 0.25 + 0.55;
      ctx.fillStyle = `rgba(80,200,240,${w})`; ctx.fillRect(sx + 2, sy + 4, 28, 7); ctx.fillRect(sx + 4, sy + 18, 24, 6);
    } else if (tileId === 4) {
      ctx.fillStyle = "#808080"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#909090"; ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      ctx.fillStyle = "#707070"; ctx.fillRect(sx + 12, sy + 12, 8, 8);
    } else if (tileId === 5) {
      ctx.fillStyle = "#d4b870"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#c03820"; ctx.fillRect(sx, sy, TILE, 14);
      ctx.fillStyle = "#b03010"; ctx.fillRect(sx + 12, sy, 4, 14);
      ctx.fillStyle = "#8b6030"; ctx.fillRect(sx + 8, sy + 18, 10, 14);
      ctx.fillStyle = "#60c8e8"; ctx.fillRect(sx + 2, sy + 16, 8, 9); ctx.fillRect(sx + 22, sy + 16, 8, 9);
    } else if (tileId === 6) {
      ctx.fillStyle = "#14121e"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#1e1c2e"; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = "#0e0c18"; ctx.fillRect(sx + 8, sy + 8, TILE - 16, TILE - 16);
    } else if (tileId === 7) {
      ctx.fillStyle = "#1e1a2c"; ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = "#28243a"; ctx.fillRect(sx + 2, sy + 2, 6, 5); ctx.fillRect(sx + 20, sy + 18, 5, 4);
    } else if (tileId === 8) {
      ctx.fillStyle = "#503818"; ctx.fillRect(sx, sy, TILE, TILE);
    }
  }

  function drawPlayer(ctx, p, cx, cy, t) {
    const sx = p.x - cx - p.w / 2, sy = p.y - cy - p.h / 2;
    const form = uiRef.current.form;
    const ec = ELEM[form] || ELEM.NONE;
    ctx.save();
    if (p.dodging) ctx.globalAlpha = 0.45 + Math.sin(t / 40) * 0.25;
    if (p.invincible > 0 && !p.dodging) ctx.globalAlpha = (p.invincible % 8 < 4) ? 0.35 : 0.9;
    ctx.shadowBlur = form !== "NONE" ? 14 : 4; ctx.shadowColor = ec.glow;

    ctx.fillStyle = "#3a3060";
    if (p.state === "walk") {
      const lp = Math.sin(p.animF * Math.PI * 0.5) * 4;
      ctx.fillRect(sx + 3, sy + p.h - 10, 8, 10 + lp); ctx.fillRect(sx + p.w - 11, sy + p.h - 10, 8, 10 - lp);
    } else { ctx.fillRect(sx + 3, sy + p.h - 10, 8, 10); ctx.fillRect(sx + p.w - 11, sy + p.h - 10, 8, 10); }

    ctx.fillStyle = form !== "NONE" ? ec.color : "#6080b0";
    ctx.fillRect(sx + 3, sy + p.h - 22, p.w - 6, 14);

    ctx.fillStyle = "#f0d880"; ctx.fillRect(sx + 5, sy, p.w - 10, p.h - 22);
    ctx.fillStyle = "#5a3010"; ctx.fillRect(sx + 3, sy, p.w - 6, 9);

    ctx.fillStyle = "#222";
    const eo = p.facing > 0 ? 4 : -4;
    ctx.fillRect(sx + p.w / 2 + eo - 1, sy + 7, 3, 3);

    const swx = p.facing > 0 ? sx + p.w - 3 : sx - 6;
    const swy = sy + 8 + (p.state === "attack" ? Math.sin(p.atkFrame * 0.45) * 12 : 0);
    ctx.fillStyle = "#c8c8c8"; ctx.fillRect(swx, swy, 4, 22);
    ctx.fillStyle = form !== "NONE" ? ec.color : "#aaa"; ctx.fillRect(swx - 3, swy + 6, 10, 3);

    if (form !== "NONE") {
      const gl = Math.sin(t / 300) * 0.15 + 0.15;
      ctx.globalAlpha = gl; ctx.fillStyle = ec.color;
      ctx.fillRect(sx - 4, sy - 4, p.w + 8, p.h + 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────
  // GAME LOOP
  // ─────────────────────────────────────────────────────────
  const loop = useCallback((ts) => {
    lastT.current = lastT.current || ts;
    const dt = Math.min((ts - lastT.current) / 16.67, 3);
    lastT.current = ts;
    update(dt);
    draw(ts);
    raf.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    const phase = ui.phase;
    if (phase === "VILLAGE" || phase === "DUNGEON") {
      if (!gs.current || gs.current.scene !== phase) initScene(phase);
      raf.current = requestAnimationFrame(loop);
    }
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [ui.phase, loop]);

  // ─────────────────────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e) => {
      keys.current[e.key] = true;
      const cur = uiRef.current;

      if (cur.phase.startsWith("STORY_")) {
        if (e.key === "Enter" || e.key === " " || e.key === "e" || e.key === "E" || e.key === "z" || e.key === "Z") advanceStory();
        e.preventDefault(); return;
      }

      if (cur.dialog) {
        if (e.key === "e" || e.key === "E" || e.key === "Enter" || e.key === " ") { e.preventDefault(); advanceDialog(); }
        return;
      }

      if (cur.showFormMenu) {
        if (e.key === "Escape" || e.key === "f" || e.key === "F") setUi(p => ({ ...p, showFormMenu: false }));
        const fi = ["1", "2", "3", "4", "5"].indexOf(e.key);
        if (fi >= 0) {
          const form = cur.unlockedForms[fi];
          if (form) setUi(p => ({ ...p, form, showFormMenu: false, message: `${ELEM[form].name} Form!` }));
        }
        return;
      }

      if (cur.showHelp) {
        if (e.key === "Escape" || e.key === "h" || e.key === "H") setUi(p => ({ ...p, showHelp: false }));
        return;
      }

      if (e.key === "x" || e.key === "X") doDodge();
      if (e.key === "q" || e.key === "Q") doSoulArt();
      if (e.key === "f" || e.key === "F") setUi(p => ({ ...p, showFormMenu: !p.showFormMenu }));
      if (e.key === "h" || e.key === "H") setUi(p => ({ ...p, showHelp: !p.showHelp }));
    };

    const ku = (e) => { keys.current[e.key] = false; };

    const handleMouseDown = (e) => {
      if (e.button === 0) { // Left mouse button
        mouse.current.pressed = true;
        const cur = uiRef.current;
        if ((cur.phase === "VILLAGE" || cur.phase === "DUNGEON") && !cur.dialog && !cur.showFormMenu && !cur.showHelp) {
          doAttack();
        }
      }
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) mouse.current.pressed = false;
    };

    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Clear messages
  useEffect(() => {
    if (ui.message) {
      const t = setTimeout(() => setUi(p => ({ ...p, message: null })), 3200);
      return () => clearTimeout(t);
    }
  }, [ui.message]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  const formColor = ELEM[ui.form]?.color || "#aaa";
  const formGlow = ELEM[ui.form]?.glow || "#ccc";

  // STORY SCREEN
  if (ui.phase.startsWith("STORY_")) {
    const lines = STORY_SCENES[ui.storyKey] || [];
    const line = lines[ui.storyIdx] || {};
    const progress = ui.storyIdx / Math.max(1, lines.length - 1);
    return (
      <div onClick={advanceStory} style={{
        width: W, height: H, cursor: "pointer",
        background: `linear-gradient(180deg, #04020c 0%, #0c0820 40%, #16102e 100%)`,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        fontFamily: "Georgia, serif", position: "relative", overflow: "hidden",
        userSelect: "none",
      }}>
        {[...Array(80)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: `${(i * 37.3) % 100}%`, top: `${(i * 19.7) % 65}%`,
            width: i % 5 === 0 ? 3 : 2, height: i % 5 === 0 ? 3 : 2,
            background: "#fff", opacity: 0.1 + ((i * 0.11) % 0.6), borderRadius: "50%"
          }} />
        ))}

        {ui.storyKey === "INTRO" && [...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${20 + (i * 7.3) % 60}%`, top: `${20 + (i * 11.7) % 50}%`,
            width: 4, height: 4, borderRadius: "50%",
            background: "#ffe066", boxShadow: "0 0 8px #ffe066",
            opacity: 0.4 + (i % 3) * 0.2, animation: `drift ${2 + i * 0.3}s ease-in-out infinite alternate`
          }} />
        ))}

        <div style={{
          position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
          fontSize: 72, textAlign: "center",
          filter: "drop-shadow(0 0 20px rgba(200,150,255,0.5))",
        }}>{line.portrait || "✨"}</div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          {lines.map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i <= ui.storyIdx ? "#c088ff" : "#333",
              boxShadow: i === ui.storyIdx ? "0 0 8px #c088ff" : "none"
            }} />
          ))}
        </div>

        <div style={{
          margin: "0 24px 24px", background: "rgba(8,4,20,0.94)",
          border: "2px solid #4a2a7a", borderRadius: 8,
          padding: "18px 22px", boxShadow: "0 0 30px rgba(100,50,180,0.4)",
        }}>
          <div style={{
            fontSize: 11, color: "#9060d0", fontFamily: "monospace", fontWeight: "bold", marginBottom: 8,
            letterSpacing: 2, textTransform: "uppercase"
          }}>
            {line.speaker || "..."}
          </div>
          <div style={{ fontSize: 14, color: "#e8deff", lineHeight: 1.8, minHeight: 48 }}>
            {line.text}
          </div>
          <div style={{ fontSize: 10, color: "#5a3a8a", textAlign: "right", marginTop: 12, fontFamily: "monospace" }}>
            Click or press Space/Enter to continue ›
          </div>
        </div>

        <style>{`@keyframes drift{from{transform:translateY(0)}to{transform:translateY(-10px)}}`}</style>
      </div>
    );
  }

  // GAMEOVER
  if (ui.phase === "GAMEOVER") return (
    <div style={{ width: W, height: H, background: "#030008", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia,serif", color: "#fff" }}>
      <div style={{ fontSize: 48, fontWeight: "bold", color: "#8833aa", marginBottom: 12, textShadow: "0 0 30px #8833aa" }}>Fallen</div>
      <div style={{ fontSize: 13, color: "#9070b0", marginBottom: 10, fontStyle: "italic" }}>The corruption whispers in the dark...</div>
      <div style={{ fontSize: 11, color: "#6050a0", marginBottom: 40, fontFamily: "monospace" }}>Level {ui.level} · {ui.xp} XP</div>
      <button onClick={() => { setUi(prev => ({ ...prev, phase: "VILLAGE", hp: prev.maxHp, mp: prev.maxMp, flags: { ...prev.flags, BOSS_STORY_SHOWN: false } })); setTimeout(() => initScene("VILLAGE"), 50); }}
        style={{ padding: "12px 36px", background: "#1a0030", color: "#cc88ff", border: "2px solid #6633aa", borderRadius: 4, cursor: "pointer", fontSize: 14, fontFamily: "monospace" }}>
        Rise Again
      </button>
    </div>
  );

  // WIN
  if (ui.phase === "WIN") return (
    <div style={{
      width: W, height: H, background: "linear-gradient(180deg,#040c20 0%,#0a2040 40%,#142858 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia,serif", color: "#fff", textAlign: "center", padding: 40
    }}>
      <div style={{ fontSize: 44, fontWeight: "bold", color: "#ffe066", textShadow: "0 0 24px #ffe066", marginBottom: 16 }}>✦ Peace Returns ✦</div>
      <div style={{ fontSize: 14, color: "#c3f0a2", marginBottom: 12, fontStyle: "italic", maxWidth: 500, lineHeight: 1.9 }}>
        The corrupted guardian breathes freely again.<br />
        Above, the fireflies have come back to Sunhaven.<br />
        And somewhere, another lost spirit waits to be found.
      </div>
      <div style={{ fontSize: 12, color: "#a0c0ff", marginBottom: 32, fontFamily: "monospace" }}>
        Lv {ui.level} · {ui.xp} XP · {ui.fp} FP
      </div>
      <button onClick={() => { setUi(prev => ({ ...prev, phase: "VILLAGE" })); setTimeout(() => initScene("VILLAGE"), 50); }}
        style={{ padding: "12px 32px", background: "#0c2010", color: "#80ee80", border: "2px solid #40aa40", borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: "monospace" }}>
        Return to Sunhaven
      </button>
    </div>
  );

  // ── HUD + GAME
  return (
    <div style={{ width: W, height: H, position: "relative", fontFamily: "monospace", overflow: "hidden", background: "#000", imageRendering: "pixelated" }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ display: "block", imageRendering: "pixelated" }} />

      {/* ── TOP LEFT: HP/MP/XP ── */}
      <div style={{ position: "absolute", top: 10, left: 10, pointerEvents: "none" }}>
        <div style={{ fontSize: 9, color: "#ff9090", marginBottom: 1 }}>HP {ui.hp}/{ui.maxHp}</div>
        <div style={{ width: 148, height: 8, background: "#280a0a", border: "1px solid #501818", borderRadius: 2, marginBottom: 4 }}>
          <div style={{ width: `${(ui.hp / ui.maxHp) * 100}%`, height: "100%", background: "linear-gradient(90deg,#cc2020,#ff5555)", borderRadius: 2, transition: "width 0.2s" }} />
        </div>
        <div style={{ fontSize: 9, color: "#8aacff", marginBottom: 1 }}>MP {ui.mp}/{ui.maxMp}</div>
        <div style={{ width: 148, height: 6, background: "#0a0e28", border: "1px solid #182050", borderRadius: 2, marginBottom: 4 }}>
          <div style={{ width: `${(ui.mp / ui.maxMp) * 100}%`, height: "100%", background: "linear-gradient(90deg,#2244cc,#4488ff)", borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color: "#ffe066" }}>Lv {ui.level} · XP {ui.xp}/{ui.xpNext} · FP {ui.fp}</div>
        <div style={{ width: 148, height: 4, background: "#1a1400", borderRadius: 2, marginTop: 2 }}>
          <div style={{ width: `${(ui.xp / ui.xpNext) * 100}%`, height: "100%", background: "#ffe066", borderRadius: 2 }} />
        </div>
      </div>

      {/* ── TOP CENTER: Form indicator ── */}
      <div style={{
        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.75)", padding: "4px 14px", borderRadius: 20,
        border: `1px solid ${formColor}`, boxShadow: `0 0 10px ${formGlow}50`,
        pointerEvents: "none", whiteSpace: "nowrap"
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: formColor, boxShadow: `0 0 8px ${formGlow}` }} />
        <span style={{ fontSize: 11, color: formColor, fontWeight: "bold" }}>
          {ui.form === "NONE" ? "No Form Yet" : ELEM[ui.form]?.name + " Form"}
        </span>
        {ui.form !== "NONE" && <span style={{ fontSize: 9, color: "#666" }}>Q=Soul Art</span>}
      </div>

      {/* ── BOTTOM: location + controls hint ── */}
      <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 10, color: "#556", pointerEvents: "none" }}>
        {ui.phase === "DUNGEON" ? "🏚 Thornfield Ruins" : "🏡 Sunhaven Village"}
        {ui.phase === "DUNGEON" && !ui.flags.BOSS_DEAD && <span style={{ color: "#884488" }}> · something stirs within</span>}
        {ui.phase === "DUNGEON" && <span style={{ color: "#444" }}> · reach exit to leave</span>}
      </div>
      <div style={{ position: "absolute", bottom: 8, right: 10, fontSize: 9, color: "#444", textAlign: "right", pointerEvents: "none", lineHeight: 1.7 }}>
        WASD Move · M1 Attack · X Dodge<br />
        Q Soul Art · F Forms · H Help · E Talk
      </div>

      {/* ── MESSAGE TOAST ── */}
      {ui.message && (
        <div style={{
          position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(5,3,18,0.93)", padding: "10px 22px", borderRadius: 6,
          fontSize: 14, color: "#ffe066", border: "1px solid #aa8800",
          boxShadow: "0 0 20px #aa880050", pointerEvents: "none", whiteSpace: "nowrap", fontWeight: "bold"
        }}>
          {ui.message}
        </div>
      )}

      {/* ── DIALOG BOX ── */}
      {ui.dialog && (
        <div style={{
          position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)",
          width: W - 40, background: "rgba(6,3,18,0.96)", border: "2px solid #5a3090", borderRadius: 8,
          padding: "14px 18px", boxShadow: "0 0 24px rgba(90,48,144,0.6)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>{ui.dialog.portrait || "💬"}</span>
            <span style={{ fontSize: 12, color: "#b080ff", fontWeight: "bold", letterSpacing: 1 }}>{ui.dialog.name}</span>
          </div>
          <div style={{ fontSize: 13, color: "#e8deff", lineHeight: 1.75 }}>
            {ui.dialog.lines[ui.dialog.idx]}
          </div>
          <div style={{ fontSize: 9, color: "#4a2a7a", textAlign: "right", marginTop: 8 }}>
            [{ui.dialog.idx + 1}/{ui.dialog.lines.length}] Space / Enter to continue
          </div>
        </div>
      )}

      {/* ── FORM MENU ── */}
      {ui.showFormMenu && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(4,2,16,0.97)", border: "2px solid #5a3090", borderRadius: 8,
          padding: 20, width: 320, boxShadow: "0 0 30px rgba(90,48,144,0.6)"
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#c088ff", marginBottom: 16, textAlign: "center" }}>Elemental Forms</div>
          {ui.unlockedForms.length === 0
            ? <div style={{ fontSize: 12, color: "#666", textAlign: "center", padding: 16, fontStyle: "italic" }}>No forms unlocked yet.<br />Explore and discover the world's elements.</div>
            : ui.unlockedForms.map((fid, i) => {
              const el = ELEM[fid] || ELEM.NONE;
              const active = ui.form === fid;
              return (
                <div key={fid} onClick={() => setUi(p => ({ ...p, form: fid, showFormMenu: false, message: `${el.name} Form activated!` }))}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", marginBottom: 6, borderRadius: 4, cursor: "pointer",
                    background: active ? `${el.color}28` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? el.color : "#2a1a4a"}`
                  }}>
                  <div style={{ fontSize: 20 }}>{el.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, color: el.color, fontWeight: "bold" }}>{el.name} Form {active ? "(active)" : ""} <span style={{ color: "#555" }}>[{i + 1}]</span></div>
                    <div style={{ fontSize: 9, color: "#888" }}>Soul Art available · Q to unleash</div>
                  </div>
                </div>
              );
            })
          }
          <div style={{ fontSize: 9, color: "#3a2060", textAlign: "center", marginTop: 10 }}>F or Esc to close</div>
        </div>
      )}

      {/* ── HELP OVERLAY ── */}
      {ui.showHelp && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(4,2,16,0.97)", border: "2px solid #2a1a5a", borderRadius: 8,
          padding: 22, width: 360, boxShadow: "0 0 24px rgba(40,20,100,0.7)", fontSize: 11, color: "#c0b0e0", lineHeight: 2
        }}>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#9060d0", marginBottom: 12, textAlign: "center" }}>How to Play</div>
          <div><b style={{ color: "#ffe066" }}>Move</b> — WASD or Arrow Keys</div>
          <div><b style={{ color: "#ffe066" }}>Attack</b> — Left Mouse Button (M1, combo by clicking rapidly)</div>
          <div><b style={{ color: "#ffe066" }}>Dodge</b> — X (uses 8 MP, grants invincibility)</div>
          <div><b style={{ color: "#ffe066" }}>Soul Art</b> — Q (uses 45 MP, powerful burst attack)</div>
          <div><b style={{ color: "#ffe066" }}>Talk / Enter Cave</b> — E or Enter (near NPC or location)</div>
          <div><b style={{ color: "#ffe066" }}>Forms</b> — F to switch unlocked elemental forms</div>
          <div style={{ marginTop: 10, color: "#806090", fontSize: 10, fontStyle: "italic", lineHeight: 1.7 }}>
            Talk to every villager. Listen carefully.<br />
            Find the Flame Shard in the dungeon before facing the boss.<br />
            Not everything in the dark is your enemy.
          </div>
          <div style={{ fontSize: 9, color: "#3a2060", textAlign: "center", marginTop: 12 }}>H or Esc to close</div>
        </div>
      )}
    </div>
  );
}
