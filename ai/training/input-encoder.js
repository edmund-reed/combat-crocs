// Input Encoder - 24 inputs for Strategic AI
// Converts game state into neural network inputs

/**
 * Encode game state into 24 inputs for the neural network
 * @param {Object} gameState - Current game state
 * @returns {Array<number>} - 24 normalized inputs
 */
export function encodeSelfDamageGameState(gameState) {
  const inputs = [];

  // === CURRENT STATE (14 inputs) ===
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

  // Terrain distances (8 directions)
  const terrainDists = gameState.terrain || [1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400];
  inputs.push(...terrainDists);

  // === FEEDBACK FROM LAST ACTION (10 inputs) ===
  const lastDecision = gameState.lastDecision || {};
  const feedback = gameState.shotFeedback || {};

  // Last action type (0 = move, 1 = shoot)
  inputs.push(lastDecision.actionType === "shoot" ? 1 : 0);

  // Last movement distance (-1 to +1, normalized)
  const lastMovement = lastDecision.movement || "none";
  let movementValue = 0;
  if (lastMovement === "left") movementValue = -0.5;
  else if (lastMovement === "right") movementValue = 0.5;
  inputs.push(movementValue);

  // Last aim angle
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

  // Total: 24 inputs (14 state + 10 feedback)
  return inputs;
}

/**
 * Get human-readable labels for the 24 inputs
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
    "terrainRight",
    "terrainUpRight",
    "terrainUp",
    "terrainUpLeft",
    "terrainLeft",
    "terrainDownLeft",
    "terrainDown",
    "terrainDownRight",
    "lastActionType",
    "lastMovement",
    "lastAimAngle",
    "explosionX",
    "explosionY",
    "explosionDistFromSelf",
    "explosionDistFromEnemy",
    "damageTaken",
    "damageDealt",
    "didHitEnemy",
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
