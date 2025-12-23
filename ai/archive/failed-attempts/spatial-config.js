// Spatial-Aware AI Configuration
// 20 inputs (10 basic + 10 spatial), 1 output, fast iteration

export const SPATIAL_CONFIG = {
  // Network architecture
  inputs: 25, // Increased from 20
  outputs: 1,

  // Input breakdown (25 total = 10 basic + 10 spatial + 5 ballistics)
  inputSchema: {
    // Basic (10)
    selfHealth: 1,
    selfX: 1,
    selfY: 1,
    enemyHealth: 1,
    enemyX: 1,
    enemyY: 1,
    enemyDistance: 1,
    enemyAngle: 1,
    bazookaAmmo: 1,
    lastShotHitSelf: 1,

    // Spatial awareness (10)
    terrainFront: 1, // Distance to terrain in front
    terrainBelow: 1, // Distance to terrain below
    terrainBehind: 1, // Distance to terrain behind
    terrainAbove: 1, // Distance to terrain above
    aimLineHitsTerrain: 1, // Will current aim hit terrain? (0/1)
    aimLineDistance: 1, // Distance to collision in aim direction
    proximityDanger: 1, // How close are we to ANY terrain? (0-1)
    safeAngleMin: 1, // Minimum safe angle to avoid terrain
    safeAngleMax: 1, // Maximum safe angle to avoid terrain
    enemyBehindObstacle: 1, // Is enemy blocked? (0/1)

    // Ballistics (5) - NEW: How to actually hit the target
    optimalAngle: 1, // Angle that would hit enemy (CRITICAL!)
    gravityStrength: 1, // How much projectiles drop
    timeToImpact: 1, // How long until hit at optimal angle
    arcClearsObstacles: 1, // Will shot clear terrain? (0/1)
    distanceCategory: 1, // Close/medium/far (affects aim strategy)
  },

  // Training hyperparameters (FAST TEST)
  training: {
    populationSize: 5, // Small for fast iteration
    gamesPerNetwork: 2, // Quick evaluation
    elitePercentage: 0.4, // Keep 2 out of 5
    mutationRate: 0.15,
    generations: 3, // Just to see if learning signal appears
  },

  // Fitness function
  fitness: {
    winBonus: 100,
    damageDealtWeight: 1.0,
    selfDamageWeight: 5.0,
    // Binary bonuses
    safeShotBonus: 20, // Bonus for damaging enemy without self-damage
    anySelfDamagePenalty: 40, // Binary penalty for ANY self-damage
  },
};

/**
 * Encode game state with spatial awareness (20 inputs)
 */
export function encodeSpatialGameState(gameState) {
  const inputs = [];

  // Basic inputs (10) - same as before
  inputs.push(gameState.self.health / 100, gameState.self.x / 1200, gameState.self.y / 700);

  const enemy = gameState.enemies[0] || {};
  inputs.push(
    enemy.health ? enemy.health / 100 : 0,
    enemy.x ? enemy.x / 1200 : 0.5,
    enemy.y ? enemy.y / 700 : 0.5,
    enemy.distance ? Math.min(enemy.distance / 1000, 1) : 1,
  );

  const angle = enemy.angle !== undefined ? enemy.angle : 0;
  inputs.push((angle + Math.PI) / (Math.PI * 2));

  inputs.push(gameState.weapons?.ammo?.BAZOOKA || 0);
  inputs.push(gameState.lastShotHitSelf ? 1 : 0);

  // Spatial inputs (10)
  const spatial = gameState.spatial || {};

  inputs.push(
    spatial.terrainFront !== undefined ? Math.min(spatial.terrainFront / 500, 1) : 1,
    spatial.terrainBelow !== undefined ? Math.min(spatial.terrainBelow / 200, 1) : 1,
    spatial.terrainBehind !== undefined ? Math.min(spatial.terrainBehind / 500, 1) : 1,
    spatial.terrainAbove !== undefined ? Math.min(spatial.terrainAbove / 300, 1) : 1,
    spatial.aimLineHitsTerrain ? 1 : 0,
    spatial.aimLineDistance !== undefined ? Math.min(spatial.aimLineDistance / 800, 1) : 1,
    spatial.proximityDanger !== undefined ? Math.min(spatial.proximityDanger, 1) : 0,
    spatial.safeAngleMin !== undefined ? (spatial.safeAngleMin + Math.PI) / (Math.PI * 2) : 0,
    spatial.safeAngleMax !== undefined ? (spatial.safeAngleMax + Math.PI) / (Math.PI * 2) : 1,
    spatial.enemyBehindObstacle ? 1 : 0,
  );

  // Ballistics inputs (5) - NEW: How to hit the target
  const ballistics = gameState.ballistics || {};

  inputs.push(
    ballistics.optimalAngle !== undefined ? (ballistics.optimalAngle + Math.PI) / (Math.PI * 2) : 0.5,
    ballistics.gravityStrength !== undefined ? Math.min(ballistics.gravityStrength / 10, 1) : 0.5,
    ballistics.timeToImpact !== undefined ? Math.min(ballistics.timeToImpact / 5, 1) : 0.5,
    ballistics.arcClearsObstacles ? 1 : 0,
    ballistics.distanceCategory !== undefined ? ballistics.distanceCategory : 0.5, // 0=close, 0.5=medium, 1=far
  );

  return inputs;
}

/**
 * Calculate spatial awareness from game state
 * This extracts terrain/obstacle data the network needs
 */
export function calculateSpatialAwareness(gameState) {
  const self = gameState.self || {};
  const enemies = gameState.enemies || [];
  const enemy = enemies[0] || {};

  // Get terrain data if available
  const terrain = gameState.terrain || [];
  const obstacles = gameState.obstacles || {};

  // Calculate distances to terrain in cardinal directions
  const selfX = self.x || 600;
  const selfY = self.y || 350;

  // Simplified terrain checks (will be enhanced if terrain data available)
  const terrainFront = obstacles.nearestDistance || 500;
  const terrainBelow = selfY < 350 ? selfY : 350 - selfY; // Distance to middle line
  const terrainBehind = 500;
  const terrainAbove = 700 - selfY;

  // Check if aiming at enemy would hit terrain
  const enemyAngle = enemy.angle || 0;
  const aimLineHitsTerrain = obstacles.lineOfSight === false;

  // Distance along aim line to collision
  const aimLineDistance = aimLineHitsTerrain ? obstacles.nearestDistance || 400 : 1000;

  // Overall danger proximity (how close to ANY terrain)
  const proximityDanger = Math.min(terrainBelow / 100, terrainFront / 200);

  // Safe angle range (very simplified - angles that don't point at ground)
  const safeAngleMin = selfY < 200 ? -0.3 : -0.8; // Don't shoot too far down if low
  const safeAngleMax = Math.PI / 2; // Up to horizontal

  // Is enemy behind obstacle?
  const enemyBehindObstacle = aimLineHitsTerrain && enemy.distance > 300;

  return {
    terrainFront,
    terrainBelow,
    terrainBehind,
    terrainAbove,
    aimLineHitsTerrain,
    aimLineDistance,
    proximityDanger,
    safeAngleMin,
    safeAngleMax,
    enemyBehindObstacle,
  };
}

/**
 * Calculate ballistics data - HOW to hit the target
 */
export function calculateBallistics(gameState) {
  const self = gameState.self || {};
  const enemies = gameState.enemies || [];
  const enemy = enemies[0] || {};
  const ballistics = gameState.ballistics || {}; // From complex game state

  const selfX = self.x || 600;
  const selfY = self.y || 350;
  const enemyX = enemy.x || 600;
  const enemyY = enemy.y || 350;
  const distance = enemy.distance || 500;

  // If complex system provides ballistics, use them
  if (ballistics.optimalAngle !== undefined) {
    return {
      optimalAngle: ballistics.optimalAngle,
      gravityStrength: ballistics.gravity || 1.0,
      timeToImpact: ballistics.timeToImpact || 2.0,
      arcClearsObstacles: !ballistics.collisionPredicted,
      distanceCategory: distance < 300 ? 0 : distance < 600 ? 0.5 : 1,
    };
  }

  // Otherwise, calculate simplified ballistics
  // Simple physics: angle to hit target with projectile arc
  const dx = enemyX - selfX;
  const dy = enemyY - selfY;
  const gravity = 1.0; // Simplified constant

  // Optimal angle (simplified - actual would need projectile speed)
  const angleToEnemy = Math.atan2(dy, dx);
  // Add compensation for distance (further = aim higher)
  const distCompensation = (distance / 1000) * 0.3; // Up to +0.3 radians for far targets
  const optimalAngle = angleToEnemy + distCompensation;

  // Time to impact (rough estimate)
  const projectileSpeed = 300; // pixels/second (simplified)
  const timeToImpact = distance / projectileSpeed;

  // Arc clears obstacles (simplified - assume yes if not too low)
  const arcClearsObstacles = optimalAngle > -0.5;

  // Distance category
  const distanceCategory = distance < 300 ? 0 : distance < 600 ? 0.5 : 1;

  return {
    optimalAngle,
    gravityStrength: gravity,
    timeToImpact,
    arcClearsObstacles,
    distanceCategory,
  };
}

/**
 * Decode output (same as before)
 */
export function decodeSpatialOutput(output) {
  const aimAngle = output * Math.PI * 2 - Math.PI;
  return {
    aimAngle,
    weapon: "BAZOOKA",
  };
}

/**
 * Validate inputs
 */
export function validateSpatialInputs(inputs) {
  if (inputs.length !== 25) {
    console.error(`❌ Invalid input count: ${inputs.length}, expected 25`);
    return false;
  }

  const invalid = inputs.filter(v => isNaN(v) || v === undefined || v === null);
  if (invalid.length > 0) {
    console.error(`❌ Invalid inputs: ${invalid.length} values are NaN/undefined/null`);
    return false;
  }

  return true;
}
