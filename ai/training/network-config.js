// Neural Network Configuration for Combat Crocs AI

export const NETWORK_CONFIG = {
  // Network architecture
  inputs: 66, // Enhanced from 58 to 66 (added temporal obstacles)
  outputs: 6,

  // Input breakdown (66 total)
  inputSchema: {
    self: 3, // health, x, y
    enemies: 16, // 4 enemies × (health, distance, angle, threat)
    weapons: 3, // bazooka, grenade, shotgun ammo
    context: 2, // turn number, time remaining

    // ENHANCED INPUTS:
    ballistics: 8, // projectile physics data
    terrain: 10, // terrain height samples along trajectory
    obstacles: 4, // static obstacle detection
    temporalObstacles: 8, // PHASE 1: moving obstacles (elevators, coasters, etc.)
    shotHistory: 6, // learning from previous shots (kept for compatibility)
    shotFeedback: 6, // CRITICAL: immediate feedback from last turn
  },

  // Output breakdown (6 total)
  outputSchema: {
    targetSelection: 2, // One-hot for first 2 enemies
    weaponChoice: 1, // 0-0.33=bazooka, 0.34-0.66=grenade, 0.67-1=shotgun
    aimAngle: 1, // 0-1 mapped to -π to π
    power: 1, // 0-1 for shot strength
    movement: 1, // 0=left, 0.5=stay, 1=right
  },

  // Training hyperparameters
  training: {
    populationSize: 50,
    tournamentSize: 10, // Games per network per generation
    elitePercentage: 0.2, // Top 20% survive
    mutationRate: 0.3,
    mutationAmount: 0.1,
    crossoverRate: 0.5,

    // Generation checkpoints
    easyAI: 30, // Generation for easy difficulty
    mediumAI: 80, // Generation for medium difficulty
    hardAI: 200, // Generation for hard difficulty
    nightmareAI: 500, // Generation for nightmare difficulty
  },

  // Fitness function weights
  fitness: {
    damageDealtWeight: 2.0,
    survivalWeight: 1.0,
    winBonus: 100,
    accuracyWeight: 50,
    killBonus: 25,
  },
};

export function decodeNetworkOutput(outputs) {
  // Target selection: pick enemy with highest activation
  const targetIndex = outputs[0] > outputs[1] ? 0 : 1;

  // Weapon choice based on value ranges
  let weapon = "BAZOOKA";
  if (outputs[2] > 0.66) weapon = "SHOTGUN";
  else if (outputs[2] > 0.33) weapon = "GRENADE";

  // Aim angle: map from 0-1 to -π to π
  const aimAngle = outputs[3] * Math.PI * 2 - Math.PI;

  // Power (currently unused but reserved for future)
  const power = outputs[4];

  // Movement decision
  let movement = "none";
  if (outputs[5] < 0.33) movement = "left";
  else if (outputs[5] > 0.66) movement = "right";

  return {
    targetIndex,
    weapon,
    aimAngle,
    power,
    movement,
  };
}

export function encodeGameState(gameState) {
  const inputs = [];

  // Self state (3 values)
  inputs.push(
    gameState.self.health / gameState.self.maxHealth,
    gameState.self.x / 1200, // Config.GAME_WIDTH
    gameState.self.y / 700, // Config.GAME_HEIGHT
  );

  // Enemy states (16 values: 4 enemies × 4 features)
  for (let i = 0; i < 4; i++) {
    if (i < gameState.enemies.length) {
      const enemy = gameState.enemies[i];
      inputs.push(
        enemy.health / enemy.maxHealth,
        Math.min(enemy.distance / 1000, 1),
        (enemy.angle + Math.PI) / (Math.PI * 2),
        Math.min(enemy.threat / 100, 1),
      );
    } else {
      inputs.push(0, 0, 0, 0);
    }
  }

  // Weapon ammo (3 values)
  inputs.push(
    gameState.weapons.ammo.BAZOOKA || 0,
    gameState.weapons.ammo.GRENADE || 0,
    gameState.weapons.ammo.SHOTGUN || 0,
  );

  // Context (2 values)
  inputs.push(
    Math.min(gameState.context.turnNumber / 100, 1),
    Math.min(gameState.context.timeRemaining / 30, 1),
  );

  // ENHANCED INPUTS:

  // Ballistics data (8 values)
  const ballistics = gameState.ballistics || {};
  inputs.push(
    ballistics.projectileSpeed ? Math.min(ballistics.projectileSpeed / 1000, 1) : 0,
    ballistics.gravity ? Math.min(ballistics.gravity / 10, 1) : 0.5,
    ballistics.timeToImpact ? Math.min(ballistics.timeToImpact / 5, 1) : 0,
    ballistics.optimalAngle ? (ballistics.optimalAngle + Math.PI) / (Math.PI * 2) : 0.5,
    ballistics.powerNeeded ? Math.min(ballistics.powerNeeded, 1) : 1,
    ballistics.windEffect ? ballistics.windEffect : 0,
    ballistics.arcHeight ? Math.min(ballistics.arcHeight / 700, 1) : 0,
    ballistics.collisionPredicted ? 1 : 0,
  );

  // Terrain sampling (10 values) - height at 10 points along trajectory
  const terrain = gameState.terrain || [];
  for (let i = 0; i < 10; i++) {
    if (i < terrain.length && terrain[i] !== undefined) {
      inputs.push(Math.min(terrain[i] / 700, 1)); // Normalize to screen height
    } else {
      inputs.push(0);
    }
  }

  // Obstacle detection (4 values)
  const obstacles = gameState.obstacles || {};
  inputs.push(
    obstacles.lineOfSight ? 1 : 0,
    obstacles.nearestDistance ? Math.min(obstacles.nearestDistance / 1000, 1) : 1,
    obstacles.obstacleHeight ? Math.min(obstacles.obstacleHeight / 700, 1) : 0,
    obstacles.terrainType || 0, // 0=none, 0.5=soft, 1=hard
  );

  // Temporal obstacles (8 values) - PHASE 1: moving/dynamic obstacles
  const temporal = gameState.temporalObstacles || {};
  inputs.push(
    temporal.hasMovingObstacle ? 1 : 0, // Is there a moving obstacle nearby?
    temporal.obstacleX ? Math.min(temporal.obstacleX / 1200, 1) : 0, // X position
    temporal.obstacleY ? Math.min(temporal.obstacleY / 700, 1) : 0, // Y position
    temporal.velocityX ? Math.max(Math.min(temporal.velocityX / 100, 1), -1) : 0, // X velocity (normalized)
    temporal.velocityY ? Math.max(Math.min(temporal.velocityY / 100, 1), -1) : 0, // Y velocity (normalized)
    temporal.obstacleSize ? Math.min(temporal.obstacleSize / 200, 1) : 0, // Size/radius
    temporal.predictedIntersection ? 1 : 0, // Will it intersect trajectory?
    temporal.timingWindow ? Math.min(temporal.timingWindow / 5, 1) : 0, // Time window to shoot
  );

  // Shot history (6 values) - last 2 shots
  const history = gameState.shotHistory || { recent: [] };
  for (let i = 0; i < 2; i++) {
    if (i < history.recent.length) {
      const shot = history.recent[i];
      inputs.push(
        shot.hit ? 1 : 0, // hit/miss
        Math.min(shot.damage / 100, 1), // damage dealt
        Math.min(Math.abs(shot.distanceError) / 500, 1), // accuracy
      );
    } else {
      inputs.push(0, 0, 0); // No data for this shot
    }
  }

  // Shot feedback (6 values) - CRITICAL: immediate turn-to-turn feedback
  const feedback = gameState.shotFeedback || {};
  inputs.push(
    feedback.didDamageEnemy ? 1 : 0, // Did I hit enemy last turn?
    feedback.damageDealt ? Math.min(feedback.damageDealt / 100, 1) : 0, // How much damage?
    feedback.didDamageSelf ? 1 : 0, // Did I hurt myself?
    feedback.damageTaken ? Math.min(feedback.damageTaken / 100, 1) : 0, // Self-damage amount
    feedback.myHealthDelta ? Math.max(Math.min(feedback.myHealthDelta / 100, 1), -1) : 0, // My health change
    feedback.enemyHealthDelta ? Math.max(Math.min(feedback.enemyHealthDelta / 100, 1), -1) : 0, // Enemy health change
  );

  return inputs;
}

// PHASE 1: Comprehensive logging for debugging
export function logGameStateInputs(gameState, inputs, verbose = false) {
  if (!verbose) return;

  console.log("\n🔍 INPUT VALIDATION:");
  console.log(`  Total inputs: ${inputs.length} (expected: 66)`);

  // Check for invalid values
  const invalidInputs = inputs.filter((v, i) => isNaN(v) || v === undefined || v === null);
  if (invalidInputs.length > 0) {
    console.warn(`  ⚠️  Found ${invalidInputs.length} invalid inputs!`);
  }

  // Summary by category
  let idx = 0;
  console.log(
    `  Self (3): health=${inputs[0].toFixed(2)}, x=${inputs[1].toFixed(2)}, y=${inputs[2].toFixed(2)}`,
  );
  idx += 3;

  console.log(`  Enemies (16): ${gameState.enemies?.length || 0} active`);
  idx += 16;

  console.log(`  Weapons (3): B=${inputs[idx]}, G=${inputs[idx + 1]}, S=${inputs[idx + 2]}`);
  idx += 3;

  console.log(`  Context (2): turn=${inputs[idx].toFixed(2)}, time=${inputs[idx + 1].toFixed(2)}`);
  idx += 2;

  console.log(`  Ballistics (8): available=${gameState.ballistics ? "yes" : "no"}`);
  idx += 8;

  console.log(`  Terrain (10): sampled=${gameState.terrain?.length || 0} points`);
  idx += 10;

  console.log(`  Obstacles (4): LOS=${inputs[idx] === 1 ? "clear" : "blocked"}`);
  idx += 4;

  console.log(`  ✨ Temporal Obs (8): active=${inputs[idx] === 1 ? "YES" : "no"}`);
  if (gameState.temporalObstacles?.hasMovingObstacle) {
    console.log(`     → Position: (${inputs[idx + 1].toFixed(2)}, ${inputs[idx + 2].toFixed(2)})`);
    console.log(`     → Velocity: (${inputs[idx + 3].toFixed(2)}, ${inputs[idx + 4].toFixed(2)})`);
  }
  idx += 8;

  console.log(`  Shot History (6): available=${gameState.shotHistory?.recent?.length || 0} shots`);
  idx += 6;

  console.log(`  Shot Feedback (6): damaged=${inputs[idx] === 1 ? "YES" : "no"}`);

  // Validate total
  if (inputs.length !== 66) {
    console.error(`  ❌ ERROR: Input length mismatch! Expected 66, got ${inputs.length}`);
  } else {
    console.log(`  ✅ Input length correct: 66`);
  }
}
