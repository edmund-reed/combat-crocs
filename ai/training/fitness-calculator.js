// Fitness Calculator - Balanced scoring for AI training
// Goals: Avoid self-damage AND attack enemy

/**
 * Calculate fitness score for a game
 * @param {Object} gameStats - Game statistics including turnData
 * @param {Object} decision - Decision metadata (optional)
 * @returns {Object} - Fitness metrics
 */
export function calculateFitness(gameStats, decision) {
  // Defensive check: Handle game crashes or initialization failures
  // Mark as ERROR so it's filtered out, not counted against the network
  if (!gameStats || !gameStats.turnData) {
    console.warn("[FITNESS] Invalid gameStats, marking as error (not penalizing network)");
    return {
      fitness: -1000,
      enemyDamageDealt: 0,
      selfDamage: 100,
      turns: 0,
      damagePerTurn: 0,
      error: true, // Mark as error to filter out
    };
  }

  let fitness = 100; // Base survival

  // === ACCURATE DAMAGE TRACKING FROM SHOT FEEDBACK ===
  // Each turn's shotFeedback shows what happened THAT TURN (not previous)
  // Team 1's feedback shows what Team 1 did
  const turnData = gameStats.turnData || [];

  let selfDamage = 0;
  let enemyDamageDealt = 0;

  // Look at OUR turns (team 1) - our feedback shows what WE did
  for (let i = 0; i < turnData.length; i++) {
    const turn = turnData[i];

    if (turn.team === 1 && turn.inputs?.shotFeedback) {
      const feedback = turn.inputs.shotFeedback;

      // Our feedback shows the result of our OWN shot
      if (feedback.didDamageSelf) {
        // We damaged ourselves
        selfDamage += feedback.damageTaken || 0;
      }

      if (feedback.didDamageEnemy) {
        // We damaged the enemy
        enemyDamageDealt += feedback.damageDealt || 0;
      }
    }
  }

  // === SELF DAMAGE PENALTY (avoid hurting yourself) ===
  fitness -= selfDamage * 8; // Strong penalty - self-preservation is critical!

  // === ENEMY DAMAGE REWARD (attack the opponent) ===
  fitness += enemyDamageDealt * 4; // Strong reward, but balanced with self-preservation

  // === SUPERVISED LEARNING BONUS (angle prediction accuracy) ===
  // Reward network for predicting angles close to look-ahead's choice
  // This provides dense feedback every turn (not just when network wins)
  if (decision && decision.networkAngle !== undefined && decision.aimAngle !== undefined) {
    // Calculate angular difference (accounting for wraparound)
    let angleDiff = Math.abs(decision.networkAngle - decision.aimAngle);
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff; // Shortest path around circle
    }

    // Convert to degrees for easier understanding
    const angleDiffDegrees = (angleDiff * 180) / Math.PI;

    // Quadratic decay with 45° cutoff - no reward for poor predictions
    // 0° = 600, 15° = 334, 30° = 150, 45° = 0, >45° = 0
    let angleAccuracyBonus = 0;
    if (angleDiffDegrees <= 45) {
      // Smooth quadratic decay provides strong gradient near optimal
      angleAccuracyBonus = 600 * Math.pow(1 - angleDiffDegrees / 45, 2);
    }
    // Else: >45° off = 0 points (don't reinforce bad predictions)

    fitness += angleAccuracyBonus;
  }

  // === DAMAGE EFFICIENCY BONUS (reward damage per turn) ===
  const turns = gameStats.turns || 50;
  const damagePerTurn = turns > 0 ? enemyDamageDealt / turns : 0;

  if (damagePerTurn > 0) {
    // Bonus for high damage efficiency
    // 40+ HP/turn = excellent (games end in ~2 turns)
    // 20 HP/turn = good (games end in ~5 turns)
    // 10 HP/turn = okay (games end in ~10 turns)
    let efficiencyBonus = 0;

    if (damagePerTurn >= 40) {
      efficiencyBonus = 100; // Major bonus for ultra-fast kills
    } else if (damagePerTurn >= 20) {
      efficiencyBonus = 50; // Good bonus for fast kills
    } else if (damagePerTurn >= 10) {
      efficiencyBonus = 25; // Small bonus for decent efficiency
    } else {
      efficiencyBonus = damagePerTurn * 2; // Linear scaling below 10 HP/turn
    }

    fitness += efficiencyBonus;
  }

  // === WIN BONUS (achieved through skill, not luck) ===
  // Only give win bonus if we actively damaged the enemy
  if (gameStats.winner === 1) {
    if (enemyDamageDealt > 30) {
      // Earned win through combat
      fitness += 150; // Major bonus for legitimate victory
    } else {
      // Won passively (enemy killed itself) - small bonus
      fitness += 30; // Discourage "do nothing and wait" strategy
    }
  }

  return { fitness, enemyDamageDealt, selfDamage, turns, damagePerTurn };
}

/**
 * Calculate aggregate statistics for a network across multiple games
 * @param {Array<Object>} gameResults - Array of game results
 * @returns {Object} - Aggregate statistics
 */
export function aggregateNetworkStats(gameResults) {
  const validResults = gameResults.filter(r => !r.error);
  const gamesPlayed = validResults.length;

  if (gamesPlayed === 0) {
    return {
      avgFitness: -1000,
      avgSelfDamage: 100,
      avgEnemyDamage: 0,
      avgDamagePerTurn: 0,
      wins: 0,
      gamesPlayed: 0,
    };
  }

  const totalFitness = validResults.reduce((sum, r) => sum + r.fitness, 0);
  const totalSelfDamage = validResults.reduce((sum, r) => sum + r.selfDamage, 0);
  const totalEnemyDamage = validResults.reduce((sum, r) => sum + r.enemyDamage, 0);
  const totalDamagePerTurn = validResults.reduce((sum, r) => sum + (r.damagePerTurn || 0), 0);
  const totalWins = validResults.reduce((sum, r) => sum + (r.won ? 1 : 0), 0);

  return {
    avgFitness: totalFitness / gamesPlayed,
    avgSelfDamage: totalSelfDamage / gamesPlayed,
    avgEnemyDamage: totalEnemyDamage / gamesPlayed,
    avgDamagePerTurn: totalDamagePerTurn / gamesPlayed,
    wins: totalWins,
    gamesPlayed: gamesPlayed,
  };
}
