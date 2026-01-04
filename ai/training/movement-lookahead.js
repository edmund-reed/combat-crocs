// Movement Look-Ahead - State-Driven Exploration System
// Clean architecture with atomic actions, checkpoints, and intelligent orchestration

// =============================================================================
// ATOMIC ACTIONS - Simple, composable building blocks
// =============================================================================

/**
 * Test if we can take a successful shot from current position
 * @param {Page} page - Puppeteer page
 * @returns {Promise<Object>} { canShoot, shotResult, position }
 */
export async function testShot(page) {
  return await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene) return { canShoot: false };

    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];
    const enemies = scene.players.filter(p => p.team !== player.team && p.health > 0);
    const enemy = enemies[0];

    if (!enemy) return { canShoot: false };

    const gameState = {
      self: { x: player.x, y: player.y, team: player.team },
      enemies: [{ x: enemy.x, y: enemy.y }],
      context: { turnNumber: scene.turnManager.turnCount },
    };

    const lookAheadResult = window.__runLookAheadSimulation__(gameState, 0);

    if (!lookAheadResult || !lookAheadResult.predictedLanding) {
      return { canShoot: false };
    }

    return {
      canShoot: lookAheadResult.predictedLanding.canDamage === true,
      shotResult: lookAheadResult,
      position: { x: player.x, y: player.y },
    };
  });
}

/**
 * Move player in specified direction using physics (FLUID MOVEMENT)
 * Holds arrow key like a real player to allow physics-based terrain traversal
 * @param {Page} page - Puppeteer page
 * @param {string} direction - "left" or "right"
 * @param {number} distance - Distance to attempt (default 250px)
 * @returns {Promise<Object>} { success, newPos, distanceMoved }
 */
export async function move(page, direction, distance = 250) {
  // Get starting position and press arrow key
  const startInfo = await page.evaluate(dir => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene) return { success: false };

    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];

    // FLUID MOVEMENT: Hold arrow key down (game applies physics every frame)
    if (dir === "left") {
      scene.cursors.left.isDown = true;
      scene.cursors.right.isDown = false;
    } else {
      scene.cursors.right.isDown = true;
      scene.cursors.left.isDown = false;
    }

    return { success: true, startX: player.x, startY: player.y };
  }, direction);

  if (!startInfo.success) return { success: false };

  // Monitor movement progress and stop when no longer progressing
  let lastX = startInfo.startX;
  let noProgressCount = 0;
  const maxDuration = 1000; // Max 1 second of movement
  const checkInterval = 50; // Check every 50ms
  const maxChecks = maxDuration / checkInterval;

  for (let i = 0; i < maxChecks; i++) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));

    const currentState = await page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
      return { x: player.x, y: player.y };
    });

    // Check if made progress since last check
    const progressSinceLastCheck = Math.abs(currentState.x - lastX);
    if (progressSinceLastCheck < 0.5) {
      noProgressCount++;
      // Stop if no progress for 4 consecutive checks (200ms)
      if (noProgressCount >= 4) {
        break;
      }
    } else {
      noProgressCount = 0; // Reset counter on progress
    }

    lastX = currentState.x;
  }

  // Release arrow keys and get final result
  return await page.evaluate(
    (start, dir) => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const player = scene.players[playerIndex];

      // Release arrow keys
      scene.cursors.left.isDown = false;
      scene.cursors.right.isDown = false;

      // Measure horizontal progress in intended direction
      const horizontalDelta = player.x - start.startX;
      const progressInDirection = dir === "right" ? horizontalDelta : -horizontalDelta;
      const moved = progressInDirection > 5; // Made at least 5px progress in intended direction

      return {
        success: moved,
        newPos: { x: player.x, y: player.y },
        distanceMoved: Math.round(Math.abs(horizontalDelta)),
      };
    },
    startInfo,
    direction,
  );
}

/**
 * Execute a jump with directional hold
 * @param {Page} page - Puppeteer page
 * @param {string} direction - "left", "right", or "none"
 * @param {number} holdDuration - How long to hold direction (ms)
 * @returns {Promise<Object>} { success, newPos, elevationGain }
 */
export async function jump(page, direction, holdDuration) {
  // Get starting position and execute jump
  const startPos = await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene) return null;

    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];

    // Execute jump
    const jumpForce = -15; // Config.PLAYER_JUMP_FORCE
    scene.matter.body.setVelocity(player.body, {
      x: player.body.velocity.x,
      y: jumpForce,
    });

    return { startX: player.x, startY: player.y };
  });

  if (!startPos) return { success: false };

  // Wait for NEAR peak height (start movement 450ms earlier than original)
  // This gives better control over jump trajectory
  await page
    .waitForFunction(
      () => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
        if (!player?.body) return false;
        // Start movement well before peak (velocity < 6 for ~450ms earlier)
        return Math.abs(player.body.velocity.y) < 6;
      },
      { timeout: 1500 },
    )
    .catch(() => {
      console.log("  ⚠️  Peak detection timeout, using fallback timing");
    });

  // Apply directional movement BEFORE peak - SIMULATE HOLDING ARROW KEYS
  if (direction !== "none") {
    // Press and HOLD the arrow key down (game will apply movement every frame)
    await page.evaluate(dir => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");

      // Set arrow key to held down state
      if (dir === "left") {
        scene.cursors.left.isDown = true;
        scene.cursors.right.isDown = false;
      } else {
        scene.cursors.right.isDown = true;
        scene.cursors.left.isDown = false;
      }
    }, direction);

    // Hold the key for specified duration (game applies movement every frame)
    await new Promise(resolve => setTimeout(resolve, holdDuration));

    // Release the arrow keys
    await page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      scene.cursors.left.isDown = false;
      scene.cursors.right.isDown = false;
    });
  }

  // TRAJECTORY SAMPLING: Capture positions during descent to detect steep terrain landings
  const trajectory = [];
  let landingDetected = false;
  let initialLanding = null;

  // Sample positions every 50ms during landing
  const maxSamples = 40; // 2 seconds max
  for (let i = 0; i < maxSamples && !landingDetected; i++) {
    await new Promise(resolve => setTimeout(resolve, 50));

    const sample = await page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];

      return {
        x: player.x,
        y: player.y,
        vy: player.body.velocity.y,
        vx: player.body.velocity.x,
        grounded: (player.groundContacts || 0) > 0,
      };
    });

    trajectory.push(sample);

    // Detect initial landing: first grounded contact OR velocity near zero
    if (!initialLanding && sample.grounded) {
      initialLanding = { x: sample.x, y: sample.y };
    }

    // Check if settled (velocity very low)
    const totalVel = Math.sqrt(sample.vx ** 2 + sample.vy ** 2);
    if (totalVel < 0.1) {
      landingDetected = true;
    }
  }

  // Get final resting position
  const finalResult = await page.evaluate(start => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];

    return {
      finalPos: { x: player.x, y: player.y },
      elevationGain: start.startY - player.y, // Positive if higher
    };
  }, startPos);

  // Return both initial landing (if different) and final position
  return {
    success: true,
    newPos: finalResult.finalPos,
    elevationGain: finalResult.elevationGain,
    initialLanding: initialLanding, // May be different from final if slid off
    trajectory: trajectory, // Full trajectory for debugging
  };
}

/**
 * Teleport player to specific position
 * @param {Page} page - Puppeteer page
 * @param {Object} position - {x, y}
 * @returns {Promise<Object>} { success }
 */
export async function teleport(page, position) {
  await page.evaluate(pos => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];

    player.x = pos.x;
    player.y = pos.y;

    if (player.body) {
      scene.matter.body.setPosition(player.body, { x: pos.x, y: pos.y });
      scene.matter.body.setVelocity(player.body, { x: 0, y: 0 });
    }
  }, position);

  return { success: true };
}

/**
 * Measure overhead clearance (vertical space above position)
 * @param {Page} page - Puppeteer page
 * @param {Object} position - {x, y}
 * @returns {Promise<number>} Distance to terrain above (pixels)
 */
export async function measureOverheadClearance(page, position) {
  return await page.evaluate(pos => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene || !window.TerrainScanner) return 0;

    // Raycast upward to find distance to terrain
    const maxDistance = 2000; // Scan to game boundary (not capped at 300!)
    const scanResult = window.TerrainScanner.scanTerrainDistances(scene, pos.x, pos.y, maxDistance);

    // Index 6 is UP direction (270°) in the directions array
    // Array order: [right(0°), down-right(45°), down(90°), down-left(135°), left(180°), up-left(225°), up(270°), up-right(315°)]
    return scanResult.directions[6] || 0;
  }, position);
}

// =============================================================================
// STATE MANAGEMENT - Track exploration progress
// =============================================================================

class ExplorationState {
  constructor() {
    this.visitedPositions = new Set(); // Exact position tracking (pixel precision)
    this.checkpoints = []; // { pos, elevation, score }
    this.currentCheckpoint = null;
  }

  /**
   * Convert position to unique key (exact pixel position)
   */
  posToKey(pos) {
    return `${Math.round(pos.x)},${Math.round(pos.y)}`;
  }

  /**
   * Check if position has been visited
   */
  hasVisited(pos) {
    return this.visitedPositions.has(this.posToKey(pos));
  }

  /**
   * Mark position as visited
   */
  markVisited(pos) {
    this.visitedPositions.add(this.posToKey(pos));
  }

  /**
   * Add a checkpoint (position of interest)
   */
  addCheckpoint(pos, elevation, overheadClearance = 0, isEdge = false) {
    const score = elevation; // Higher is better
    this.checkpoints.push({ pos: { ...pos }, elevation, overheadClearance, score, isEdge });
    const edgeMarker = isEdge ? " 🔆 EDGE" : "";
    console.log(
      `  📍 Added checkpoint at (${Math.round(pos.x)}, ${Math.round(pos.y)}), elevation: ${Math.round(
        elevation,
      )}${edgeMarker}`,
    );
  }

  /**
   * Get best checkpoint (highest elevation)
   */
  getBestCheckpoint() {
    if (this.checkpoints.length === 0) return null;
    return this.checkpoints.reduce((best, cp) => (cp.score > best.score ? cp : best));
  }
}

// =============================================================================
// ORCHESTRATOR - Intelligent exploration coordinator
// =============================================================================

/**
 * Main exploration function - finds best shooting position
 * @param {Page} page - Puppeteer page
 * @param {Object} gameState - Current game state
 * @returns {Promise<Object>} { finalPosition, shotDecision, movementPath, totalDistance }
 */
export async function findBestShootingPosition(page, gameState) {
  console.log("  🔍 Movement look-ahead: Searching for optimal shooting position...");

  // PROPER FIX: Check if game has ended or no enemies alive BEFORE starting exploration
  const gameStatus = await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene) return { canContinue: false, reason: "no_scene" };

    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const currentPlayer = scene.players[playerIndex];
    const enemies = scene.players.filter(p => p.team !== currentPlayer.team && p.health > 0);

    // Check if game ended or no enemies
    if (scene.gameEnded) {
      return { canContinue: false, reason: "game_ended" };
    }

    if (enemies.length === 0) {
      return { canContinue: false, reason: "no_enemies" };
    }

    return { canContinue: true };
  });

  if (!gameStatus.canContinue) {
    console.log(`  ⚠️  Cannot explore: ${gameStatus.reason}, using fallback`);

    // Return minimal fallback decision
    const origin = await page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
      return { x: player.x, y: player.y };
    });

    return {
      finalPosition: origin,
      shotDecision: { weapon: "BAZOOKA", aimAngle: 0, movement: "none", actionType: "skip" },
      movementPath: [],
      totalDistance: 0,
    };
  }

  const state = new ExplorationState();

  // Get starting position
  const origin = await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
    return { x: player.x, y: player.y };
  });

  state.addCheckpoint(origin, origin.y); // Origin is first checkpoint
  state.markVisited(origin);

  // Test from origin
  console.log("  📍 Testing origin position...");
  const originShot = await testShot(page);
  if (originShot.canShoot) {
    console.log("  ✅ Can shoot safely from origin!");
    return {
      finalPosition: origin,
      shotDecision: originShot.shotResult,
      movementPath: [],
      totalDistance: 0,
    };
  }

  // =============================================================================
  // PHASE 1: Ground Exploration
  // =============================================================================
  console.log("  🚶 Phase 1: Ground exploration");

  const result = await exploreGroundFromPosition(page, state, origin);
  if (result) return result;

  // =============================================================================
  // PHASE 2: Jump Exploration from Checkpoints
  // =============================================================================
  console.log("  🦘 Phase 2: Jump exploration from checkpoints");

  const jumpResult = await exploreJumpsFromCheckpoints(page, state);
  if (jumpResult) return jumpResult;

  // =============================================================================
  // PHASE 3: Fallback
  // =============================================================================
  console.log("  🎯 Phase 3: Fallback to best position");

  const best = state.getBestCheckpoint() || { pos: origin };
  await teleport(page, best.pos);

  const fallbackShot = await testShot(page);

  if (fallbackShot.shotResult?.predictedLanding?.distToSelf < 150) {
    console.log("  ⚠️  Fallback shot too dangerous, skipping turn");
    return {
      finalPosition: best.pos,
      shotDecision: { weapon: "BAZOOKA", aimAngle: 0, movement: "none", actionType: "skip" },
      movementPath: [],
      totalDistance: 0,
    };
  }

  console.log("  ⚠️  Using fallback shot");
  return {
    finalPosition: best.pos,
    shotDecision: fallbackShot.shotResult || { aimAngle: 0, movement: "none" },
    movementPath: [],
    totalDistance: 0,
  };
}

/**
 * Explore ground in both directions with continuous sampling
 * Tests shots and measures clearance every 25px during fluid movement
 */
async function exploreGroundFromPosition(page, state, startPos) {
  await teleport(page, startPos);

  // Get enemy position to prioritize exploration toward enemy
  const enemyInfo = await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];
    const enemies = scene.players.filter(p => p.team !== player.team && p.health > 0);
    const enemy = enemies[0];

    if (!enemy) return null;
    return {
      x: enemy.x,
      y: enemy.y,
      direction: enemy.x > player.x ? "right" : "left",
    };
  });

  // ENEMY-DIRECTED EXPLORATION: Try enemy direction first, then opposite
  const enemyDirection = enemyInfo?.direction;
  const oppositeDir = enemyDirection === "left" ? "right" : "left";
  const directions = enemyDirection ? [enemyDirection, oppositeDir] : ["left", "right"];

  // Track starting distance/elevation for regression detection
  const startDistToEnemy = enemyInfo ? Math.abs(startPos.x - enemyInfo.x) : 0;
  const startElevation = startPos.y;

  // Explore both directions (enemy direction first)
  for (const direction of directions) {
    console.log(`  → Exploring ${direction}...`);

    // Start fluid movement
    const moveStarted = await page.evaluate(dir => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      if (!scene) return { success: false };

      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const player = scene.players[playerIndex];

      // Hold arrow key down for fluid movement
      if (dir === "left") {
        scene.cursors.left.isDown = true;
        scene.cursors.right.isDown = false;
      } else {
        scene.cursors.right.isDown = true;
        scene.cursors.left.isDown = false;
      }

      return { success: true, startX: player.x, startY: player.y };
    }, direction);

    if (!moveStarted.success) continue;

    let lastCheckpointX = startPos.x;
    let noProgressCount = 0;
    let lastX = startPos.x;

    // NET PROGRESS TRACKING: Track furthest point reached to detect true loops vs oscillation
    let furthestXReached = startPos.x;
    let timeSinceAdvancing = 0; // Time since last net advancement

    const maxDuration = 2000; // Max 2 seconds of movement
    const checkInterval = 20; // Check every 20ms (increased from 50ms for better sampling)
    const maxChecks = maxDuration / checkInterval;

    // Continuous movement with sampling every 25px
    for (let i = 0; i < maxChecks; i++) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const currentState = await page.evaluate(() => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
        return { x: player.x, y: player.y };
      });

      // Check if made progress IN INTENDED DIRECTION (tolerates backward slip on steep terrain)
      const horizontalDelta = currentState.x - lastX;
      const progressInDirection = direction === "right" ? horizontalDelta : -horizontalDelta;

      // Only count as "no progress" if not moving forward in intended direction
      // Small threshold (0.3px) tolerates minor slip while climbing
      if (progressInDirection < 0.3) {
        noProgressCount++;
        // MAXIMUM TOLERANCE: Stop if no forward progress for 30 consecutive checks (600ms at 20ms intervals)
        // This allows player extensive time to slip and recover while climbing very steep terrain
        if (noProgressCount >= 30) {
          break;
        }
      } else {
        noProgressCount = 0; // Reset counter on forward progress
      }

      // NET ADVANCEMENT CHECK: Track if we've advanced beyond furthest point reached
      // This prevents oscillation from stopping exploration while detecting true loops
      const netAdvancement =
        direction === "right" ? currentState.x - furthestXReached : furthestXReached - currentState.x;

      if (netAdvancement > 5) {
        // Advanced 5px beyond previous frontier - making net progress!
        // Low threshold allows small forward movements on steep terrain to reset timer
        furthestXReached = currentState.x;
        timeSinceAdvancing = 0; // Reset timer
      } else {
        timeSinceAdvancing += checkInterval; // Accumulate time
      }

      // Stop if no net advancement for 1000ms (true loop or wall, not just oscillation)
      if (timeSinceAdvancing > 1000) {
        console.log(`  ⚠️  No net advancement for 1000ms, stopping ${direction} exploration`);
        break;
      }

      // Sample position every 15px traveled (reduced from 25px for better coverage)
      // This ensures we capture narrow escape zones (e.g., 100px wide gaps)
      const distanceFromLastCheckpoint = Math.abs(currentState.x - lastCheckpointX);
      if (distanceFromLastCheckpoint >= 15) {
        // DEBUG: Log sampling details
        console.log(
          `  🔍 [DEBUG] Sampling at x=${Math.round(currentState.x)} (gap: ${Math.round(
            distanceFromLastCheckpoint,
          )}px from last checkpoint at x=${Math.round(lastCheckpointX)})`,
        );

        // NOTE: Removed "revisited position" check - net advancement tracking handles loops
        state.markVisited(currentState);

        // Measure overhead clearance at this position
        const clearanceData = await page.evaluate(pos => {
          const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
          if (!scene || !window.TerrainScanner) return { clearance: 0 };

          const maxDistance = 2000; // Scan to game boundary
          const scanResult = window.TerrainScanner.scanTerrainDistances(scene, pos.x, pos.y, maxDistance);

          return {
            clearance: scanResult.directions[6] || 0,
            allDirections: scanResult.directions, // DEBUG: Get all directions
          };
        }, currentState);

        const distanceMoved = Math.round(Math.abs(currentState.x - startPos.x));
        console.log(
          `  🚶 Moved ${direction} ${distanceMoved}px to (${Math.round(currentState.x)}, ${Math.round(
            currentState.y,
          )}) - clearance: ${Math.round(clearanceData.clearance)}px [ALL: ${clearanceData.allDirections
            ?.map(d => Math.round(d))
            .join(",")}]`,
        );

        // REGRESSION DETECTION: Check if this position represents significant regression
        // (moving away from enemy AND losing elevation - e.g., falling off platform)
        const currentDistToEnemy = enemyInfo ? Math.abs(currentState.x - enemyInfo.x) : 0;
        const elevationLoss = currentState.y - startElevation; // Positive = lost height
        const distanceRegression = currentDistToEnemy - startDistToEnemy; // Positive = further from enemy

        const isSignificantRegression = enemyInfo && elevationLoss > 50 && distanceRegression > 100;

        if (isSignificantRegression) {
          console.log(
            `  ⚠️  Detected regression: lost ${Math.round(elevationLoss)}px height, ${Math.round(
              distanceRegression,
            )}px further from enemy - discarding position`,
          );
          // Don't add checkpoint, don't test shot - this is a bad path
          // Stop this direction exploration
          break;
        }

        // Test shot at this position
        const shotTest = await testShot(page);
        if (shotTest.canShoot) {
          // Release arrow keys before returning
          await page.evaluate(() => {
            const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
            scene.cursors.left.isDown = false;
            scene.cursors.right.isDown = false;
          });

          console.log("  ✅ Found valid shot during ground exploration!");
          return {
            finalPosition: currentState,
            shotDecision: shotTest.shotResult,
            movementPath: [],
            totalDistance: 0,
          };
        }

        // Create checkpoint at this position (only if not regressed)
        state.addCheckpoint(currentState, currentState.y, clearanceData.clearance);

        lastCheckpointX = currentState.x;
      }

      lastX = currentState.x;
    }

    // Release arrow keys
    await page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      scene.cursors.left.isDown = false;
      scene.cursors.right.isDown = false;
    });

    if (noProgressCount >= 4) {
      console.log(`  ⚠️  Can't move ${direction} anymore`);
    }

    // Return to start for opposite direction
    await teleport(page, startPos);
  }

  return null; // No shot found
}

/**
 * Try jump combinations from all checkpoints
 */
async function exploreJumpsFromCheckpoints(page, state) {
  const DURATIONS = [300, 500, 750, 1000];

  // Get enemy position and direction
  const enemyInfo = await page.evaluate(() => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];
    const enemies = scene.players.filter(p => p.team !== player.team && p.health > 0);
    const enemy = enemies[0];

    if (!enemy) return null;
    return {
      x: enemy.x,
      y: enemy.y,
      direction: enemy.x > player.x ? "right" : "left",
    };
  });

  // Prioritize enemy direction, then opposite (no "none" - only directional jumps)
  const enemyDirection = enemyInfo?.direction;
  const oppositeDir = enemyDirection === "left" ? "right" : "left";
  const DIRECTIONS = enemyDirection ? [enemyDirection, oppositeDir] : ["left", "right"];

  // MULTI-TIER CHECKPOINT SORTING:
  // 1st Priority: HIGHEST overhead clearance (most space above)
  // 2nd Priority: CLOSEST to enemy (nearest to target terrain)
  const enemyX = enemyInfo?.x || 0;

  const sortedCheckpoints = enemyInfo
    ? [...state.checkpoints].sort((a, b) => {
        // Priority 1: HIGHEST overhead clearance (with 10px buffer)
        // Positions with similar clearance (within 10px) are considered equal
        const clearanceDiff = Math.abs(a.overheadClearance - b.overheadClearance);
        if (clearanceDiff > 10) {
          return b.overheadClearance - a.overheadClearance;
        }

        // Priority 2: CLOSEST to enemy (nearest to target terrain)
        const aDistToEnemy = Math.abs(a.pos.x - enemyX);
        const bDistToEnemy = Math.abs(b.pos.x - enemyX);
        return aDistToEnemy - bDistToEnemy;
      })
    : state.checkpoints;

  // DEBUG: Log all checkpoint clearances for diagnosis
  console.log(`  📊 All checkpoints (sorted by clearance → proximity):`);
  for (const cp of sortedCheckpoints) {
    const distToEnemy = Math.abs(cp.pos.x - enemyX);
    console.log(
      `    (${Math.round(cp.pos.x)}, ${Math.round(cp.pos.y)}): clearance ${Math.round(
        cp.overheadClearance,
      )}px, dist ${Math.round(distToEnemy)}px from enemy`,
    );
  }

  // CONTEXT-AWARE CLEARANCE THRESHOLD:
  // - Ground level (y > 450): Require 400px clearance (avoid hitting ceilings)
  // - Elevated (y ≤ 450): Require 250px clearance (navigate overhangs on elevated terrain)
  const originElevation = state.checkpoints[0]?.pos.y || 500; // First checkpoint is origin
  const minClearance = originElevation > 450 ? 400 : 250;

  console.log(
    `  📏 Using ${minClearance}px clearance threshold (elevation: ${Math.round(originElevation)}px)`,
  );

  const validCheckpoints = sortedCheckpoints.filter(cp => cp.overheadClearance >= minClearance);

  if (validCheckpoints.length === 0) {
    console.log(
      `  ⚠️  No positions with sufficient clearance (≥${minClearance}px), skipping jump exploration`,
    );
    return null; // Skip jump phase entirely
  }

  console.log(
    `  ✅ Found ${validCheckpoints.length}/${sortedCheckpoints.length} positions with good clearance`,
  );

  // BUFFER LOGIC: Among max clearance positions, avoid the absolute closest (likely at terrain edge)
  // Pick 2nd closest to give ~25-50px buffer from where terrain clearance starts dropping
  if (validCheckpoints.length >= 2) {
    const maxClearance = validCheckpoints[0].overheadClearance;
    const maxClearancePositions = validCheckpoints.filter(
      cp => Math.abs(cp.overheadClearance - maxClearance) <= 10,
    );

    if (maxClearancePositions.length >= 2) {
      console.log(`  🛡️  Using 2nd closest position (buffer from terrain edge)`);
      // Swap first two in validCheckpoints to pick 2nd closest
      const temp = validCheckpoints[0];
      validCheckpoints[0] = validCheckpoints[1];
      validCheckpoints[1] = temp;
    }
  }

  // GROUP BY CLEARANCE TIERS: Group positions by clearance (50px granularity)
  // This ensures we try BOTH directions from best positions before moving to worse positions
  const tierMap = new Map();
  for (const cp of validCheckpoints) {
    const tier = Math.floor(cp.overheadClearance / 50) * 50;
    if (!tierMap.has(tier)) {
      tierMap.set(tier, []);
    }
    tierMap.get(tier).push(cp);
  }

  // Sort tiers by clearance (best first)
  const sortedTiers = [...tierMap.keys()].sort((a, b) => b - a);
  console.log(`  📊 Grouped into ${sortedTiers.length} clearance tiers: ${sortedTiers.join(", ")}px`);

  // Track which checkpoints we've already explored from to prevent looping back
  const exploredCheckpoints = new Set();

  // Exhaust each tier completely before moving to next tier
  for (const tier of sortedTiers) {
    const tierPositions = tierMap.get(tier);
    console.log(`  🎯 Exploring tier ${tier}px (${tierPositions.length} positions)`);

    // SPATIAL EXPLORATION: Try one direction from ALL positions before trying opposite direction
    // This finds intermediate platforms (e.g., palm tree) that lead to final goal (e.g., metal coaster)
    for (const direction of DIRECTIONS) {
      console.log(`  🧭 Trying ${direction} jumps from all tier positions`);

      for (const checkpoint of tierPositions) {
        const checkpointKey = `${Math.round(checkpoint.pos.x)},${Math.round(checkpoint.pos.y)}`;
        const directionCheckpointKey = `${direction}_${checkpointKey}`;

        // Skip if we've already explored THIS DIRECTION from this checkpoint
        if (exploredCheckpoints.has(directionCheckpointKey)) {
          continue;
        }

        console.log(
          `  🦘 Trying ${direction} from (${Math.round(checkpoint.pos.x)}, ${Math.round(
            checkpoint.pos.y,
          )}) - clearance: ${Math.round(checkpoint.overheadClearance)}px`,
        );

        for (const duration of DURATIONS) {
          // Teleport to checkpoint for each attempt
          await teleport(page, checkpoint.pos);

          const jumpResult = await jump(page, direction, duration);

          if (!jumpResult.success) continue;

          // Skip if already visited
          if (state.hasVisited(jumpResult.newPos)) continue;

          state.markVisited(jumpResult.newPos);
          console.log(
            `  🦘 Jumped ${direction} (${duration}ms) → (${Math.round(jumpResult.newPos.x)}, ${Math.round(
              jumpResult.newPos.y,
            )}), gain: ${Math.round(jumpResult.elevationGain)}px`,
          );

          // STEEP TERRAIN FIX: If initial landing differs from final, mark it as checkpoint too
          if (jumpResult.initialLanding && !state.hasVisited(jumpResult.initialLanding)) {
            const deltaX = Math.abs(jumpResult.initialLanding.x - jumpResult.newPos.x);
            const deltaY = Math.abs(jumpResult.initialLanding.y - jumpResult.newPos.y);
            const slid = deltaX > 10 || deltaY > 10;

            if (slid) {
              console.log(
                `  ⚡ Detected steep landing: (${Math.round(jumpResult.initialLanding.x)}, ${Math.round(
                  jumpResult.initialLanding.y,
                )}) → slid to final`,
              );
              // DON'T add to exploredCheckpoints - steep positions are handled inline
              state.addCheckpoint(jumpResult.initialLanding, jumpResult.initialLanding.y);
              state.markVisited(jumpResult.initialLanding);

              // Test shot from initial steep landing position (but DON'T return yet!)
              await teleport(page, jumpResult.initialLanding);
              const steepShotTest = await testShot(page);

              // RECURSIVE CHAINING: Try jumping IMMEDIATELY from steep position to climb higher
              // This creates chains: jump → steep land → jump → higher stable ground
              // PRIORITY: Climb higher first, then use steep shot as fallback
              console.log(`  🔗 Attempting jump chain from steep position to climb higher...`);

              let foundBetterPosition = false;
              const CHAIN_DURATIONS = [750, 1500];
              for (const chainDir of DIRECTIONS) {
                for (const chainDuration of CHAIN_DURATIONS) {
                  await teleport(page, jumpResult.initialLanding);

                  const chainJump = await jump(page, chainDir, chainDuration);
                  if (!chainJump.success || state.hasVisited(chainJump.newPos)) continue;

                  state.markVisited(chainJump.newPos);
                  console.log(
                    `  🔗 Chained jump ${chainDir} (${chainDuration}ms) → (${Math.round(
                      chainJump.newPos.x,
                    )}, ${Math.round(chainJump.newPos.y)})`,
                  );

                  // Test shot from chained position
                  const chainShot = await testShot(page);
                  if (chainShot.canShoot) {
                    console.log("  ✅ Found valid shot after jump chain (higher position)!");
                    foundBetterPosition = true;
                    return {
                      finalPosition: chainJump.newPos,
                      shotDecision: chainShot.shotResult,
                      movementPath: [],
                      totalDistance: 0,
                    };
                  }

                  // If chain landed on stable elevated ground, explore from there
                  // DON'T add chain positions to exploredCheckpoints - they're handled inline
                  if (chainJump.elevationGain > 10) {
                    state.addCheckpoint(chainJump.newPos, chainJump.newPos.y);
                    const chainGroundResult = await exploreGroundFromPosition(page, state, chainJump.newPos);
                    if (chainGroundResult) {
                      foundBetterPosition = true;
                      return chainGroundResult;
                    }
                  }
                }
              }

              // Only explore ground from steep position if jump chains didn't find better
              if (!foundBetterPosition) {
                const steepGroundResult = await exploreGroundFromPosition(
                  page,
                  state,
                  jumpResult.initialLanding,
                );
                if (steepGroundResult) return steepGroundResult;
              }

              // FALLBACK: Use steep shot only if chaining and ground exploration failed
              if (steepShotTest.canShoot) {
                console.log("  ✅ Using steep landing shot (no higher position found)");
                return {
                  finalPosition: jumpResult.initialLanding,
                  shotDecision: steepShotTest.shotResult,
                  movementPath: [],
                  totalDistance: 0,
                };
              }

              // Return to final position for normal flow
              await teleport(page, jumpResult.newPos);
            }
          }

          // Test shot from final position
          const shotTest = await testShot(page);
          if (shotTest.canShoot) {
            console.log("  ✅ Found valid shot after jump!");
            return {
              finalPosition: jumpResult.newPos,
              shotDecision: shotTest.shotResult,
              movementPath: [],
              totalDistance: 0,
            };
          }

          // If gained elevation, add as checkpoint and explore ground from here
          if (jumpResult.elevationGain > 10) {
            state.addCheckpoint(jumpResult.newPos, jumpResult.newPos.y);

            const groundResult = await exploreGroundFromPosition(page, state, jumpResult.newPos);
            if (groundResult) return groundResult;
          }
        }

        // Mark checkpoint as explored after trying all durations in this direction
        exploredCheckpoints.add(checkpointKey);
      }
    }
  }

  return null; // No shot found
}
