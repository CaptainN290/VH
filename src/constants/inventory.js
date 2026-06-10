// ─────────────────────────────────────────────────────────────
// ITEM DEFINITIONS
// ─────────────────────────────────────────────────────────────

export const ITEMS = {
  TRAINING_BLADE: {
    id: "TRAINING_BLADE",
    name: "Training Blade",
    type: "weapon",
    damage: 5,
    description: "A simple blade for practice.",
  },
  TRAVELLER_CLOTHES: {
    id: "TRAVELLER_CLOTHES",
    name: "Traveller's Clothes",
    type: "armor",
    defense: 3,
    description: "Comfortable clothing for a journey.",
  },
  HEALTH_POTION: {
    id: "HEALTH_POTION",
    name: "Health Potion",
    type: "consumable",
    heal: 30,
    description: "Restores 30 HP.",
  },
  MANA_POTION: {
    id: "MANA_POTION",
    name: "Mana Potion",
    type: "consumable",
    mana: 20,
    description: "Restores 20 MP.",
  },
};

export const STARTING_INVENTORY = [
  { id: "HEALTH_POTION", qty: 3 },
  { id: "MANA_POTION", qty: 2 },
];
