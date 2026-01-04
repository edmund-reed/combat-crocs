// Movement Assistance - Pathfinding for optimal shooting positions
// Two-phase approach: ground movement first, then jumping if needed
// Provides "teacher" guidance for supervised learning (like look-ahead for shooting)

/**
 * Find the best movement path to reach a shooting position
 * Phase 1: Scan ground positions (walk left/right)
 * Phase 2: If no ground position works, try jumping
 * @param {Object} playerPos - Current player position {x, y}
 * @param {Object} enemyPos - Enemy position {x, y}
 * @param {Function} testShotFromPosition - Function to test if position can hit enemy
 * @param {Object} scene - Phaser scene (for terrain detection)
 * @returns {Object} - Best movement path with method, position, etc.
 */
export function findBestMovementPath(playerPos, enemyPos, testShotFromPosition, scene) {
  // Phase 1: Try ground movement first (simpler, faster)
  const groundPath = findBestGroundPosition(playerPos, enemyPos, testShotFromPosition, scene);

  if (groundPath && groundPath.canHit) {
    return {
      ...groundPath,
      requiresJump: false,
      phase: "ground",
    };
  }

  // Phase 2: No ground positions work - try jumping
  const jumpPath = findBestJumpPosition(playerPos, enemyPos, testShotFromPosition, scene);

  if (jumpPath && jumpPath.canHit) {
    return {
      ...jumpPath,
      requiresJump: true,
      phase: "jump",
    };
  }

  // Fallback: Stay at current position and shoot (best effort)
  const currentShot = testShotFromPosition(playerPos, enemyPos);
  return {
    position: playerPos,
    method: "stay",
    direction: "none",
    distance: 0,
    requiresJump: false,
    canHit: currentShot.canHit,
    shotAngle: currentShot.bestAngle || 0,
    distToEnemy: currentShot.distToEnemy || 1000,
    score: 0,
    phase: "fallback",
    holdTime: 0,
    heightGain: 0,
  };
}

/**
 * Phase 1: Find best ground position (walk left/right)
 * Scans in 100px steps until terrain blocks path
 * @param {Object} playerPos - Current position {x, y}
 * @param {Object} enemyPos - Enemy position {x, y}
 * @param {Function} testShotFromPosition - Shot testing function
 * @param {Object} scene - Phaser scene
 * @returns {Object} - Best ground path or null
 */
export function findBestGroundPosition(playerPos, enemyPos, testShotFromPosition, scene) {
  const candidates = [];
  const STEP_SIZE = 100; // 100px per step
  const MAX_STEPS = 5; // Test up to 500px in each direction

  // Test current position first
  const currentShot = testShotFromPosition(playerPos, enemyPos);
  if (currentShot.canHit) {
    candidates.push({
      position: playerPos,
      method: "stay",
      direction: "none",
      distance: 0,
      shotAngle: currentShot.bestAngle,
      distToEnemy: currentShot.distToEnemy,
      canHit: true,
      score: scorePosition(playerPos, enemyPos) + 100, // Bonus for not moving
      holdTime: 0,
      heightGain: 0,
    });
  }

  // Scan left in 100px steps
  for (let step = 1; step <= MAX_STEPS; step++) {
    const testPos = {
      x: playerPos.x - step * STEP_SIZE,
      y: playerPos.y,
    };

    // Stop if hit map edge
    if (testPos.x < 50) break;

    // TODO: Add terrain collision check here when in browser
    // For now, assume path is clear (we'll handle in browser context)

    // Test if we can hit enemy from this position
    const shotResult = testShotFromPosition(testPos, enemyPos);

    if (shotResult.canHit) {
      candidates.push({
        position: testPos,
        method: "walk_left",
        direction: "left",
        distance: step * STEP_SIZE,
        shotAngle: shotResult.bestAngle,
        distToEnemy: shotResult.distToEnemy,
        canHit: true,
        score: scorePosition(testPos, enemyPos),
        holdTime: 0,
        heightGain: 0,
      });
    }
  }

  // Scan right in 100px steps
  for (let step = 1; step <= MAX_STEPS; step++) {
    const testPos = {
      x: playerPos.x + step * STEP_SIZE,
      y: playerPos.y,
    };

    // Stop if hit map edge
    if (testPos.x > 1150) break;

    // Test if we can hit enemy from this position
    const shotResult = testShotFromPosition(testPos, enemyPos);

    if (shotResult.canHit) {
      candidates.push({
        position: testPos,
        method: "walk_right",
        direction: "right",
        distance: step * STEP_SIZE,
        shotAngle: shotResult.bestAngle,
        distToEnemy: shotResult.distToEnemy,
        canHit: true,
        score: scorePosition(testPos, enemyPos),
        holdTime: 0,
        heightGain: 0,
      });
    }
  }

  // Return best candidate (highest score)
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

/**
 * Phase 2: Find best jump position (jump + hold direction)
 * Tests 12 jump trajectories: 6 left + 6 right with varying hold times
 * Only returns positions that gained height (reached platform)
 * @param {Object} playerPos - Current position {x, y}
 * @param {Object} enemyPos - Enemy position {x, y}
 * @param {Function} testShotFromPosition - Shot testing function
 * @param {Object} scene - Phaser scene
 * @returns {Object} - Best jump path or null
 */
export function findBestJumpPosition(playerPos, enemyPos, testShotFromPosition, scene) {
  const candidates = [];
  const holdDurations = [100, 200, 300, 400, 500, 600]; // ms to hold direction

  // Test jump trajectories in both directions
  for (const direction of ["left", "right"]) {
    for (const holdTime of holdDurations) {
      // Simulate jump trajectory
      // Note: In browser context, we'll use the actual physics simulation
      // For now, we'll use a simplified prediction
      const landingPos = predictJumpLanding(playerPos, direction, holdTime);

      // Check if jump gained height (reached platform)
      const gainedHeight = landingPos.y < playerPos.y; // Lower Y = higher in Phaser

      if (!gainedHeight) continue; // Skip if didn't reach higher ground

      // Test if we can hit enemy from landing position
      const shotResult = testShotFromPosition(landingPos, enemyPos);

      if (shotResult.canHit) {
        candidates.push({
          position: landingPos,
          method: `jump_${direction}`,
          direction: direction,
          distance: Math.abs(landingPos.x - playerPos.x),
          holdTime: holdTime,
          heightGain: playerPos.y - landingPos.y,
          shotAngle: shotResult.bestAngle,
          distToEnemy: shotResult.distToEnemy,
          canHit: true,
          score: scorePosition(landingPos, enemyPos) + 200, // Bonus for elevation
        });
      }
    }
  }

  // Return best jump candidate
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

/**
 * Score a position based on distance to enemy and tactical factors
 * Higher score = better position
 * @param {Object} pos - Position to score {x, y}
 * @param {Object} enemyPos - Enemy position {x, y}
 * @returns {number} - Score (higher is better)
 */
export function scorePosition(pos, enemyPos) {
  let score = 0;

  // Calculate distance to enemy
  const dist = Math.sqrt(Math.pow(pos.x - enemyPos.x, 2) + Math.pow(pos.y - enemyPos.y, 2));

  // Sweet spot: 200-600px from enemy
  // Too close = self-damage risk, too far = harder to hit
  if (dist >= 200 && dist <= 600) {
    // Prefer ~400px (middle of sweet spot)
    score += 1000 - Math.abs(dist - 400);
  } else if (dist < 200) {
    // Too close - danger zone
    score -= 200 - dist; // Worse the closer we get
  } else {
    // Too far
    score -= (dist - 600) / 2; // Linear penalty
  }

  // Bonus for elevated positions (if higher than enemy)
  if (pos.y < enemyPos.y - 100) {
    score += 200; // High ground advantage
  }

  return score;
}

/**
 * Simplified jump prediction (placeholder)
 * In browser, we'll use the actual physics simulation
 * @param {Object} startPos - Starting position
 * @param {string} direction - 'left' or 'right'
 * @param {number} holdTime - How long to hold direction (ms)
 * @returns {Object} - Predicted landing position {x, y}
 */
function predictJumpLanding(startPos, direction, holdTime) {
  // Simplified jump prediction
  // Actual physics will be handled in browser with simulateJump()

  const HORIZONTAL_SPEED = 160; // px/s
  const JUMP_DURATION = 1000; // ~1 second for full jump arc

  // Calculate horizontal displacement
  const holdSeconds = holdTime / 1000;
  const horizontalDist = HORIZONTAL_SPEED * holdSeconds;

  let landingX = startPos.x;
  if (direction === "left") {
    landingX = startPos.x - horizontalDist;
  } else if (direction === "right") {
    landingX = startPos.x + horizontalDist;
  }

  // Clamp to map bounds
  landingX = Math.max(50, Math.min(1150, landingX));

  // Assume we gain some height (will be validated in browser)
  const landingY = startPos.y - 50; // Assume platform is 50px higher

  return { x: Math.round(landingX), y: Math.round(landingY) };
}

/**
 * Calculate distance between two positions
 * @param {Object} pos1 - First position {x, y}
 * @param {Object} pos2 - Second position {x, y}
 * @returns {number} - Distance in pixels
 */
export function distance(pos1, pos2) {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}
