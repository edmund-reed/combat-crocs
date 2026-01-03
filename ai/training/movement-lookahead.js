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
 * Move player in specified direction using physics
 * @param {Page} page - Puppeteer page
 * @param {string} direction - "left" or "right"
 * @param {number} distance - Distance to attempt (default 250px)
 * @returns {Promise<Object>} { success, newPos, distanceMoved }
 */
export async function move(page, direction, distance = 250) {
  const velocity = direction === "left" ? -25 : 25;

  const startInfo = await page.evaluate(vel => {
    const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
    if (!scene) return { success: false };

    const playerIndex = scene.turnManager.getCurrentPlayerIndex();
    const player = scene.players[playerIndex];

    scene.matter.body.setVelocity(player.body, {
      x: vel,
      y: player.body.velocity.y,
    });

    return { success: true, startX: player.x, startY: player.y };
  }, velocity);

  if (!startInfo.success) return { success: false };

  // Wait for movement
  await new Promise(resolve => setTimeout(resolve, 200));

  // Stop and get result
  return await page.evaluate(
    (start, dir) => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const player = scene.players[playerIndex];

      // Stop movement
      scene.matter.body.setVelocity(player.body, { x: 0, y: player.body.velocity.y });

      // Measure horizontal progress in intended direction (not just total distance)
      // This prevents getting stuck looping on steep terrain
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

  // Wait for peak height (velocity approaches 0)
  await page
    .waitForFunction(
      () => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        const player = scene.players[scene.turnManager.getCurrentPlayerIndex()];
        if (!player?.body) return false;
        // At peak, vertical velocity is near zero
        return Math.abs(player.body.velocity.y) < 0.5;
      },
      { timeout: 1500 },
    )
    .catch(() => {
      console.log("  ⚠️  Peak detection timeout, using fallback timing");
    });

  // Apply directional movement at peak - SIMULATE HOLDING ARROW KEYS
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
 * Explore ground in both directions until positions repeat
 */
async function exploreGroundFromPosition(page, state, startPos) {
  await teleport(page, startPos);

  // Explore both directions
  for (const direction of ["left", "right"]) {
    console.log(`  → Exploring ${direction}...`);

    let lastCheckpointX = startPos.x;
    let prevClearance = 0;

    while (true) {
      const moveResult = await move(page, direction);

      if (!moveResult.success) {
        console.log(`  ⚠️  Can't move ${direction} anymore`);
        break;
      }

      // Check if we've been here before
      if (state.hasVisited(moveResult.newPos)) {
        console.log(`  ⚠️  Revisited position, stopping ${direction} exploration`);
        break;
      }

      state.markVisited(moveResult.newPos);

      // Measure overhead clearance at EVERY position to find optimal launch spot
      const clearanceData = await page.evaluate(pos => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        if (!scene || !window.TerrainScanner) return { clearance: 0, directions: [] };

        const maxDistance = 2000; // Scan to game boundary
        const scanResult = window.TerrainScanner.scanTerrainDistances(scene, pos.x, pos.y, maxDistance);

        return {
          clearance: scanResult.directions[6] || 0,
          directions: scanResult.directions,
          allDirections: JSON.stringify(scanResult.directions),
        };
      }, moveResult.newPos);

      console.log(
        `  🚶 Moved ${direction} ${moveResult.distanceMoved}px to (${Math.round(
          moveResult.newPos.x,
        )}, ${Math.round(moveResult.newPos.y)}) - clearance: ${Math.round(clearanceData.clearance)}px`,
      );

      // Test shot
      const shotTest = await testShot(page);
      if (shotTest.canShoot) {
        console.log("  ✅ Found valid shot during ground exploration!");
        return {
          finalPosition: moveResult.newPos,
          shotDecision: shotTest.shotResult,
          movementPath: [],
          totalDistance: 0,
        };
      }

      // Create checkpoint at EVERY position (no 80px spacing limit)
      state.addCheckpoint(moveResult.newPos, moveResult.newPos.y, clearanceData.clearance);
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

  // FILTER: Remove positions with insufficient overhead clearance (< 400px)
  // This prevents wasting time jumping from positions with terrain overhead
  let validCheckpoints = sortedCheckpoints.filter(cp => cp.overheadClearance >= 400);

  if (validCheckpoints.length === 0) {
    console.log("  ⚠️  No positions with sufficient clearance (≥400px), using all checkpoints");
    validCheckpoints = sortedCheckpoints; // Fallback to all positions
  } else {
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
  }

  for (const checkpoint of validCheckpoints) {
    console.log(
      `  🦘 Trying jumps from checkpoint (${Math.round(checkpoint.pos.x)}, ${Math.round(
        checkpoint.pos.y,
      )}) - clearance: ${Math.round(checkpoint.overheadClearance)}px`,
    );

    for (const direction of DIRECTIONS) {
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
            state.addCheckpoint(jumpResult.initialLanding, jumpResult.initialLanding.y);
            state.markVisited(jumpResult.initialLanding);

            // Test shot from initial steep landing position
            await teleport(page, jumpResult.initialLanding);
            const steepShotTest = await testShot(page);
            if (steepShotTest.canShoot) {
              console.log("  ✅ Found valid shot from steep landing!");
              return {
                finalPosition: jumpResult.initialLanding,
                shotDecision: steepShotTest.shotResult,
                movementPath: [],
                totalDistance: 0,
              };
            }

            // RECURSIVE CHAINING: Try jumping IMMEDIATELY from steep position to reach stable ground
            // This creates chains: jump → steep land → jump → stable land
            // CRITICAL: Do this BEFORE ground exploration to avoid sliding!
            console.log(`  🔗 Attempting jump chain from steep position...`);

            // Try shorter jumps first from steep position (more likely to find stable ground nearby)
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
                  console.log("  ✅ Found valid shot after jump chain!");
                  return {
                    finalPosition: chainJump.newPos,
                    shotDecision: chainShot.shotResult,
                    movementPath: [],
                    totalDistance: 0,
                  };
                }

                // If chain landed on stable elevated ground, explore from there
                if (chainJump.elevationGain > 10) {
                  state.addCheckpoint(chainJump.newPos, chainJump.newPos.y);
                  const chainGroundResult = await exploreGroundFromPosition(page, state, chainJump.newPos);
                  if (chainGroundResult) return chainGroundResult;
                }
              }
            }

            // Only explore ground from steep position if jump chains didn't work
            // (Steep terrain can cause sliding during ground exploration)
            const steepGroundResult = await exploreGroundFromPosition(page, state, jumpResult.initialLanding);
            if (steepGroundResult) return steepGroundResult;

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
    }
  }

  return null; // No shot found
}
