// Minimal AI Configuration - PROOF OF CONCEPT
// 10 inputs, 1 output, simple fitness
// Goal: Prove the system CAN learn

export const SIMPLE_CONFIG = {
  // Network architecture
  inputs: 10,
  outputs: 1,

  // Input breakdown (10 total)
  inputSchema: {
    selfHealth: 1, // 0-1 normalized
    selfX: 1, // 0-1 normalized
    selfY: 1, // 0-1 normalized
    enemyHealth: 1, // 0-1 normalized
    enemyX: 1, // 0-1 normalized
    enemyY: 1, // 0-1 normalized
    enemyDistance: 1, // 0-1 normalized
    enemyAngle: 1, // 0-1 normalized (where enemy is relative to me)
    bazookaAmmo: 1, // 0-5
    lastShotHitSelf: 1, // 0 or 1 (CRITICAL: immediate feedback)
  },

  // Output breakdown (1 total)
  outputSchema: {
    aimAngle: 1, // 0-1 mapped to -PI to PI
  },

  // Training hyperparameters
  training: {
    populationSize: 20, // Small for fast iterations
    gamesPerNetwork: 3, // Consistent
    elitePercentage: 0.3, // Keep 30% (learned from mistakes)
    mutationRate: 0.15, // Gentle mutations
    generations: 20, // Quick test
  },

  // Fitness function weights (SIMPLE)
  fitness: {
    winBonus: 100, // Winning is good
    damageDealtWeight: 1.0, // Damage is good
    selfDamageWeight: 5.0, // HARSH penalty for shooting self
  },
};

/**
 * Encode game state into 10 inputs
 */
export function encodeSimpleGameState(gameState) {
  const inputs = [];

  // Self state (3)
  inputs.push(
    gameState.self.health / 100, // Normalize to 0-1
    gameState.self.x / 1200, // Normalize to 0-1
    gameState.self.y / 700, // Normalize to 0-1
  );

  // Enemy state (4)
  const enemy = gameState.enemies[0] || {}; // First enemy only
  inputs.push(
    enemy.health ? enemy.health / 100 : 0, // 0-1
    enemy.x ? enemy.x / 1200 : 0.5, // 0-1, default center
    enemy.y ? enemy.y / 700 : 0.5, // 0-1, default center
    enemy.distance ? Math.min(enemy.distance / 1000, 1) : 1, // 0-1
  );

  // Enemy angle (1)
  const angle = enemy.angle !== undefined ? enemy.angle : 0;
  inputs.push((angle + Math.PI) / (Math.PI * 2)); // Normalize -PI to PI → 0 to 1

  // Ammo (1)
  inputs.push(gameState.weapons?.ammo?.BAZOOKA || 0); // 0-5

  // Last shot feedback (1)
  inputs.push(gameState.lastShotHitSelf ? 1 : 0); // 0 or 1

  return inputs;
}

/**
 * Decode network output (1 value) to aim angle
 */
export function decodeSimpleOutput(output) {
  // Map 0-1 to -PI to PI
  const aimAngle = output * Math.PI * 2 - Math.PI;

  return {
    aimAngle,
    weapon: "BAZOOKA", // Always bazooka for now
  };
}

/**
 * Validate inputs (exactly 10, all valid numbers)
 */
export function validateInputs(inputs) {
  if (inputs.length !== 10) {
    console.error(`❌ Invalid input count: ${inputs.length}, expected 10`);
    return false;
  }

  const invalid = inputs.filter((v, i) => isNaN(v) || v === undefined || v === null);
  if (invalid.length > 0) {
    console.error(`❌ Invalid inputs: ${invalid.length} values are NaN/undefined/null`);
    return false;
  }

  return true;
}
