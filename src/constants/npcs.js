// ─────────────────────────────────────────────────────────────
// NPC DEFINITIONS
// ─────────────────────────────────────────────────────────────

export const NPCS_VILLAGE = [
  {
    id: "elder_sable",
    name: "Elder Sable",
    tx: 8, ty: 6,
    color: "#805030",
    portrait: "👴",
    dialog: [
      "Ah, Ren. I see the worry in your eyes.",
      "The eastern woods have grown dark. The animals... they are not themselves.",
      "There is an old tale of elemental spirits who once guarded our land.",
      "Flame for passion. Water for healing. Wind for freedom. Earth for endurance.",
      "If you go into the ruins, seek the Flame Shard. It may grant you the power to push back this darkness.",
      "But be careful. Not everything down there wants to be found.",
    ],
    setsFlag: "TALKED_ELDER",
  },
  {
    id: "mira",
    name: "Old Mira",
    tx: 16, ty: 3,
    color: "#607080",
    portrait: "👵",
    dialog: [
      "My poor Mittens... came home with eyes like violet stars.",
      "Something in those woods changed her.",
      "If you're going to look for answers, please be careful.",
      "The ruins have been sealed for generations for good reason.",
    ],
    givesHeal: 15,
  },
  {
    id: "lyra",
    name: "Lyra",
    tx: 4, ty: 3,
    color: "#4ecdc4",
    portrait: "🧝",
    dialog: [
      "Ren! I've been waiting for you.",
      "I heard what Elder Sable said. I want to come with you.",
      "I've been practicing my water magic. I can help heal, and I'm not bad in a fight either.",
      "Please, let me join you. Sunhaven is my home too.",
    ],
    requiresFlag: "TALKED_ELDER",
    joinsParty: true,
    setsFlag: "LYRA_JOINED",
  },
  {
    id: "tomas",
    name: "Tomas",
    tx: 20, ty: 3,
    color: "#c03820",
    portrait: "👨",
    dialog: [
      "Heading to the ruins, eh?",
      "My grandfather used to tell stories about that place.",
      "Said there were treasures down there, but also nightmares.",
      "Watch your back, Ren. And if you find anything shiny...",
      "Just kidding! Stay safe out there.",
    ],
  },
];

export const COMPANION_DEFS = {
  lyra: {
    name: "Lyra",
    element: "WATER",
    hp: 90,
    atk: 12,
    spd: 2.1,
    color: "#4ecdc4",
  },
};
