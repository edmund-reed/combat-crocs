/**
 * WeaponDefinitions.js - Central weapon configuration for Combat Crocs
 * Weapon stats, types, and balance settings
 */

const WEAPON_DEFINITIONS = {
  // Standard weapons
  BAZOOKA: {
    name: "Bazooka",
    damage: 100,
    radius: 200,
    description: "Powerful mid-range projectile with large blast radius",
  },

  GRENADE: {
    name: "Grenade",
    damage: 15,
    radius: 80,
    description: "Bouncy explosive, unpredictable flight path",
    bounceFactor: 0.8, // High bounce for grenade-like behavior
  },

  HOMING_MISSILE: {
    name: "Homing Missile",
    damage: 35,
    radius: 40,
    description: "Smart missile that tracks enemies",
    homingStrength: 0.5, // How strongly it homes in (0-1)
  },

  SHOTGUN: {
    name: "Shotgun",
    damage: 12,
    radius: 35,
    description: "Close-range spread weapon",
    projectiles: 5, // Fires multiple pellets
  },

  UZI: {
    name: "UZI",
    damage: 8,
    radius: 25,
    description: "Rapid-fire automatic weapon",
    fireRate: 150, // Milliseconds between shots
  },

  // Tropical/special weapons
  PINEAPPLE_BOMB: {
    name: "Pineapple Bomb",
    damage: 20,
    radius: 70,
    description: "Explosive tropical fruit - chaotic and fun",
    bounceFactor: 0.6,
  },

  MANGO_BOMB: {
    name: "Mango Bomb",
    damage: 18,
    radius: 75,
    description: "Juicy explosive - sticky and unpredictable",
    bounceFactor: 0.7,
  },
};

window.WEAPON_DEFINITIONS = WEAPON_DEFINITIONS;
