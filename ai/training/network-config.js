// Neural Network Configuration for Combat Crocs AI

export const NETWORK_CONFIG = {
  // Network architecture
  inputs: 24,
  outputs: 6,

  // Input breakdown (24 total)
  inputSchema: {
    self: 3, // health, x, y
    enemies: 16, // 4 enemies × (health, distance, angle, threat)
    weapons: 3, // bazooka, grenade, shotgun ammo
    context: 2, // turn number, time remaining
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

  return inputs;
}
