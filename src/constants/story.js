// ─────────────────────────────────────────────────────────────
// STORY SCENES (Ni no Kuni style — text panels with portraits)
// ─────────────────────────────────────────────────────────────

export const STORY_SCENES = {
  INTRO: [
    { speaker:"Narrator", portrait:"🌅", text:"The village of Sunhaven rests beneath amber skies, where the bread always smells warm and the fireflies come out before dusk even falls." },
    { speaker:"Narrator", portrait:"🌅", text:"You are Ren — an ordinary person. No prophecy, no bloodline. Just someone who lives here, and loves it." },
    { speaker:"Narrator", portrait:"😟", text:"But three nights ago, the animals in the eastern woods started acting strange. Yesterday, Old Mira's cat came home with violet eyes..." },
    { speaker:"Ren", portrait:"🧑", text:"Something is very wrong. I can feel it — like a cold thread pulled through the air. The village needs help." },
    { speaker:"Narrator", portrait:"✨", text:"You have no powers. No training. But something stirs inside you when you pick up your father's old blade from above the hearth." },
    { speaker:"Narrator", portrait:"✨", text:"A flicker. Like a candle refusing to go out. Your journey begins — not with destiny, but with choice." },
  ],

  FOUND_FLAME: [
    { speaker:"Narrator", portrait:"🔥", text:"A fragment of brilliance pulses in the dark, half-buried in the ruin's floor. It burns without heat — warm, inviting." },
    { speaker:"Ren", portrait:"🧑", text:"What... is this? It feels like something is reaching back when I touch it." },
    { speaker:"Ancient Echo", portrait:"🔥", text:"A fragment of Flame — one of nine elemental forces that weave the world together. It has been waiting for someone who would not flee from the dark." },
    { speaker:"Ancient Echo", portrait:"🔥", text:"Take it. Let it become part of you. But know: a flame that rages without purpose burns only itself." },
    { speaker:"Ren", portrait:"🧑", text:"I understand. Or... I'm starting to. ✦ Flame Form unlocked!" },
  ],

  BOSS_APPROACH: [
    { speaker:"Narrator", portrait:"💜", text:"At the heart of the ruins, the corruption is thickest. The air smells like old grief and broken things." },
    { speaker:"Ren", portrait:"😮", text:"There — that creature. It was a guardian spirit once. I can see it, beneath all that violet shadow." },
    { speaker:"Corrupted Guardian", portrait:"👁", text:"...hurts... the veil... it tears through me... I cannot stop..." },
    { speaker:"Ren", portrait:"🧑", text:"I won't kill you. I'll find a way to reach you. But first — I have to survive this." },
  ],

  BOSS_DEAD: [
    { speaker:"Narrator", portrait:"💜", text:"The guardian's form flickers — violet to gold — and it breathes, really breathes, for the first time in a long while." },
    { speaker:"Guardian Spirit", portrait:"✨", text:"...the veil... you held firm. You didn't flinch. ...thank you, child." },
    { speaker:"Guardian Spirit", portrait:"✨", text:"The corruption retreats — for now. But the Veil grows thin elsewhere. There are others like me, still lost." },
    { speaker:"Ren", portrait:"🧑", text:"Then I'll find them. All of them. No matter how long it takes." },
    { speaker:"Narrator", portrait:"🌅", text:"Above ground, the fireflies return. Sunhaven breathes again. And Ren takes the first step of a much longer road." },
  ],

  LYRA_JOINS: [
    { speaker:"Lyra", portrait:"🧝", text:"I know that look. You're going into the cave, aren't you." },
    { speaker:"Ren", portrait:"🧑", text:"Lyra, it's too dangerous. I can't ask you to—" },
    { speaker:"Lyra", portrait:"🧝", text:"Don't argue with me. I've patched up half the hurt animals they've found at the tree line. I know what's down there better than you." },
    { speaker:"Lyra", portrait:"🧝", text:"I wield water — it flows around any obstacle. We'll work well together." },
    { speaker:"Narrator", portrait:"💧", text:"Lyra joins your party! She'll fight alongside you in the dungeon." },
  ],

  CHAPTER_COMPLETE: [
    { speaker:"Narrator", portrait:"✨", text:"The corruption of Thornfield has been cleansed. The guardian spirit rests easy." },
    { speaker:"Ren", portrait:"🧑", text:"But the world is still in pain. Sunhaven is safe, but..." },
    { speaker:"Lyra", portrait:"🧝", text:"But there's more out there. I can feel it too." },
    { speaker:"Narrator", portrait:"🌍", text:"Word spreads. A kingdom by the sea — Liora — has troubles of its own." },
  ],
};

export const CHAPTER_INFO = {
  CH1: { name: "Sunhaven", location: "Sunhaven Village & Thornfield Ruins", element: "FLAME", companion: "Lyra" },
  CH2: { name: "Liora", location: "Kingdom of Liora", element: "WATER", companion: "Finn" },
  CH3: { name: "Aerwyn", location: "Aerwyn Fields", element: "WIND", companion: "Mina" },
  CH4: { name: "Vareth", location: "Vareth Mountains", element: "EARTH", companion: "Rowan" },
  CH5: { name: "Thunder Isles", location: "Thunder Isles", element: "THUNDER", companion: null },
  CH6: { name: "Moonlit Library", location: "The Moonlit Library", element: "VOID", companion: null },
};
