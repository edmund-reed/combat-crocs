// Barrel exports for all utils modules
export { default as StateManager } from "./state-manager.js";
export { default as InputManager } from "./input-manager.js";
export { Logger } from "@config";
export { default as Maps } from "./maps.js";
export { default as PhysicsManager } from "./physics-manager.js";
export { default as PlayerManager } from "./player.js";
export { default as TerrainManager } from "./terrain.js";
export { default as TurnManager } from "./turn-manager.js";
export { default as WeaponManager } from "./weapons.js";
export { LastStandManager } from "./last-stand-manager.js";

export const shuffleArray = array => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
