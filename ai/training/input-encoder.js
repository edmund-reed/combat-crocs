// Input Encoder - 25 inputs for Supervised Learning AI
// Converts game state into neural network inputs

/**
 * Encode game state into 25 inputs for the neural network
 * @param {Object} gameState - Current game state
 * @returns {Array<number>} - 25 normalized inputs
 */
export function encodeSelfDamageGameState(gameState) {
  const inputs = [];

  // === CURRENT STATE (15 inputs) ===
  // Self position & health (3)
  inputs.push(gameState.self.x);
  inputs.push(gameState.self.y);
  inputs.push(gameState.self.health / gameState.self.maxHealth);

  // Enemy position & health (3)
  const enemy = gameState.enemies && gameState.enemies[0];
  if (enemy) {
    inputs.push(enemy.x || 0);
    inputs.push(enemy.y || 0);
    inputs.push((enemy.health || 0) / (enemy.maxHealth || 100));
  } else {
    inputs.push(0);
    inputs.push(0);
    inputs.push(0);
  }

  // Enemy distance (1) - helps with range estimation
  const enemyDistance = enemy
    ? Math.sqrt(Math.pow(gameState.self.x - enemy.x, 2) + Math.pow(gameState.self.y - enemy.y, 2))
    : 1400;
  inputs.push(enemyDistance);

  // Terrain distances (8 directions)
  const terrainDists = gameState.terrain || [1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400];
  inputs.push(...terrainDists);

  // === FEEDBACK FROM LAST ACTION (9 inputs) ===
  const lastDecision = gameState.lastDecision || {};
  const feedback = gameState.shotFeedback || {};

  // Last aim angle (SUPERVISED LEARNING TARGET)
  inputs.push(lastDecision.aimAngle || 0);

  // Explosion position
  inputs.push(feedback.explosionX || 0);
  inputs.push(feedback.explosionY || 0);

  // Distance metrics
  const explosionDistFromSelf = feedback.explosionX
    ? Math.sqrt(
        Math.pow(gameState.self.x - feedback.explosionX, 2) +
          Math.pow(gameState.self.y - feedback.explosionY, 2),
      )
    : 1000;
  inputs.push(explosionDistFromSelf);

  const explosionDistFromEnemy =
    feedback.explosionX && enemy
      ? Math.sqrt(Math.pow(enemy.x - feedback.explosionX, 2) + Math.pow(enemy.y - feedback.explosionY, 2))
      : 1000;
  inputs.push(explosionDistFromEnemy);

  // Damage feedback
  inputs.push(feedback.damageTaken || 0);
  inputs.push(feedback.damageDealt || 0);

  // Hit flag
  const didHitEnemy = feedback.didDamageEnemy ? 1 : 0;
  inputs.push(didHitEnemy);

  // === SUPERVISED LEARNING TARGET (1 input) ===
  // Chosen angle from look-ahead (the "correct answer")
  const chosenAngle = gameState.chosenAngle || 0;
  inputs.push(chosenAngle);

  // Total: 25 inputs (15 state + 9 feedback + 1 target)
  return inputs;
}

/**
 * Get human-readable labels for the 25 inputs
 * @returns {Array<string>} - Input labels
 */
export function getInputLabels() {
  return [
    "selfX",
    "selfY",
    "selfHealthPercent",
    "enemyX",
    "enemyY",
    "enemyHealthPercent",
    "enemyDistance",
    "terrainRight",
    "terrainUpRight",
    "terrainUp",
    "terrainUpLeft",
    "terrainLeft",
    "terrainDownLeft",
    "terrainDown",
    "terrainDownRight",
    "lastAimAngle",
    "explosionX",
    "explosionY",
    "explosionDistFromSelf",
    "explosionDistFromEnemy",
    "damageTaken",
    "damageDealt",
    "didHitEnemy",
    "chosenAngle",
  ];
}

/**
 * Create labeled input object for logging
 * @param {Object} gameState - Game state
 * @param {Array<number>} inputArray - 24 input values
 * @returns {Object} - Structured input data with labels
 */
export function createLabeledInputObject(gameState, inputArray) {
  const labels = getInputLabels();
  const labeled = {};

  labels.forEach((label, index) => {
    labeled[label] = inputArray[index];
  });

  // Create human-readable structure showing the exact model inputs
  return {
    modelInputs: inputArray, // RAW 24-value array fed to network
    inputLabels: labeled, // Same values with labels
    structuredData: {
      self: {
        x: labeled.selfX,
        y: labeled.selfY,
        healthPercent: labeled.selfHealthPercent,
      },
      enemy: {
        x: labeled.enemyX,
        y: labeled.enemyY,
        healthPercent: labeled.enemyHealthPercent,
      },
      lastDecision: {
        actionType: labeled.lastActionType,
        movement: labeled.lastMovement,
        aimAngle: labeled.lastAimAngle,
        aimAngleDegrees: (labeled.lastAimAngle * 180) / Math.PI,
      },
      explosion: {
        x: labeled.explosionX,
        y: labeled.explosionY,
        distanceFromSelf: labeled.explosionDistFromSelf,
        distanceFromEnemy: labeled.explosionDistFromEnemy,
        damageTaken: labeled.damageTaken,
        damageDealt: labeled.damageDealt,
        didHitEnemy: labeled.didHitEnemy,
      },
      terrain: {
        directions: [
          labeled.terrainRight,
          labeled.terrainUpRight,
          labeled.terrainUp,
          labeled.terrainUpLeft,
          labeled.terrainLeft,
          labeled.terrainDownLeft,
          labeled.terrainDown,
          labeled.terrainDownRight,
        ],
        directionNames: ["right", "upRight", "up", "upLeft", "left", "downLeft", "down", "downRight"],
      },
    },
  };
}
