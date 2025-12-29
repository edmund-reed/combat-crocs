// Browser Injections - Code to inject into browser for AI decision making
// These functions return strings that get evaluated in the browser context

/**
 * Get look-ahead simulation injection code
 * Tests multiple angles and picks the best shot that will damage enemy
 * CRITICAL: Uses InstantShotResolver directly for 100% accuracy
 * @returns {string} - Code to inject
 */
export function getLookAheadSimulationInjection() {
  return `
    // Look-ahead simulation - test angles and find best shot
    // USES EXACT SAME LOGIC AS INSTANT SHOT (InstantShotResolver)
    window.__runLookAheadSimulation__ = function(gameState, networkAngle) {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      if (!scene) {
        console.log("[AI] ERROR: GameScene not found for look-ahead simulation");
        return null;
      }

      // Verify InstantShotResolver is available
      if (!window.InstantShotResolver) {
        console.error("[AI] ERROR: InstantShotResolver not available in browser context");
        return null;
      }

      // CLI LOGGING: Show network decision (turn 3 only)
      if (gameState.context?.turnNumber === 3 && gameState.self.team === 1) {
        console.log(
          \`\\n🎯 [LOOK-AHEAD] Network suggested angle: \${((networkAngle * 180) / Math.PI).toFixed(0)}°\`
        );
      }

      // Get enemy and player positions
      const enemy = gameState.enemies?.[0];
      if (!enemy) {
        console.log("[AI] No enemy found for look-ahead, returning skip action");
        return {
          weapon: "BAZOOKA",
          aimAngle: 0,
          movement: "none",
          actionType: "skip",
          targetIndex: 0,
          power: 0,
        };
      }
      
      const enemyPos = { x: enemy.x, y: enemy.y };
      const playerPos = { x: gameState.self.x, y: gameState.self.y };

      // Generate 37 candidate angles: network's suggestion + 36 evenly spaced (every 10°)
      const anglesToTest = [networkAngle]; // Network angle first
      for (let i = 0; i < 36; i++) {
        anglesToTest.push((i * 10 * Math.PI) / 180); // 36 angles: 0°, 10°, 20°, ... 350°
      }

      // Get weapon config
      const weaponConfig = window.CombatCrocs.config.WEAPON_CONFIGS.BAZOOKA;
      const DAMAGE_RADIUS = weaponConfig.damageRadius || 140;

      // Get the actual player object (needed for resolveBazookaShot)
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const player = scene.players[playerIndex];

      let bestAngle = networkAngle;
      let minDistToEnemy = Infinity;
      const candidateDetails = [];
      const validShots = []; // Shots that can actually damage enemy

      // Test each candidate angle using EXACT same function as instant shot
      for (const angle of anglesToTest) {
        // CRITICAL: Pass angle DIRECTLY to avoid recalculation errors
        // This eliminates floating-point errors from double angle calculation
        const landing = window.InstantShotResolver.resolveBazookaFromAngle(
          scene,
          player,
          angle,
          true  // noDamage - simulation only
        );

        // Calculate distance to enemy
        const dxToEnemy = landing.x - enemyPos.x;
        const dyToEnemy = landing.y - enemyPos.y;
        const distToEnemy = Math.sqrt(dxToEnemy * dxToEnemy + dyToEnemy * dyToEnemy);

        // Calculate distance to self
        const dxToSelf = landing.x - playerPos.x;
        const dyToSelf = landing.y - playerPos.y;
        const distToSelf = Math.sqrt(dxToSelf * dxToSelf + dyToSelf * dyToSelf);

        // Check if this shot can actually damage enemy
        const withinRadius = distToEnemy <= DAMAGE_RADIUS;
        const clearLOS = !window.PhysicsManager.isExplosionBlocked(
          landing.x,
          landing.y,
          enemyPos.x,
          enemyPos.y,
          scene
        );
        const canDamageEnemy = withinRadius && clearLOS;

        candidateDetails.push({
          angle: angle,
          angleDegrees: (angle * 180) / Math.PI,
          landingX: Math.round(landing.x),
          landingY: Math.round(landing.y),
          distanceToEnemy: Math.round(distToEnemy),
          distanceToSelf: Math.round(distToSelf),
          withinRadius: withinRadius,
          clearLOS: clearLOS,
          canDamage: canDamageEnemy,
          selected: false,
        });

        // Track valid shots separately
        if (canDamageEnemy) {
          validShots.push({ angle, distToEnemy });
        }

        // Track overall closest
        if (distToEnemy < minDistToEnemy) {
          minDistToEnemy = distToEnemy;
        }
      }

      // THREE-TIER SELECTION:
      // 1. If we have valid shots (can damage enemy), pick closest one
      // 2. If no valid shots, try to find one with clear LOS (even if out of range)
      // 3. Otherwise, fallback to closest shot overall
      if (validShots.length > 0) {
        // Found shots that can damage enemy - pick closest
        validShots.sort((a, b) => a.distToEnemy - b.distToEnemy);
        bestAngle = validShots[0].angle;
      } else {
        // No valid shots - try to find clear LOS shot (better chance on next turn)
        const clearLOSShots = candidateDetails.filter(c => c.clearLOS);
        if (clearLOSShots.length > 0) {
          clearLOSShots.sort((a, b) => a.distanceToEnemy - b.distanceToEnemy);
          bestAngle = clearLOSShots[0].angle;
        } else {
          // Worst case: pick closest overall
          candidateDetails.sort((a, b) => a.distanceToEnemy - b.distanceToEnemy);
          bestAngle = candidateDetails[0].angle;
        }
      }

      // Mark selected candidate
      for (const candidate of candidateDetails) {
        if (Math.abs(candidate.angle - bestAngle) < 0.001) {
          candidate.selected = true;
          break;
        }
      }

      // CLI LOGGING
      if (gameState.context?.turnNumber === 3 && gameState.self.team === 1) {
        const selected = candidateDetails.find(c => c.selected);
        if (selected) {
          const validCount = candidateDetails.filter(c => c.canDamage).length;
          const selectionType = selected.canDamage ? "VALID" : "FALLBACK";
          
          console.log(
            \`  ✅ SELECTED (\${selectionType}): \${selected.angleDegrees.toFixed(0)}° - \` +
              \`\${selected.distanceToEnemy}px from enemy\`,
          );
          console.log(\`     Valid shots found: \${validCount}/37 (can damage enemy)\`);
          
          if (selected.canDamage) {
            console.log(\`     ✓ Within radius (\${DAMAGE_RADIUS}px) and clear LOS\`);
          } else {
            console.log(\`     ⚠ No valid shots - using closest attempt\`);
          }
          
          const networkWasGood = Math.abs(selected.angle - networkAngle) < 0.001;
          if (networkWasGood) {
            console.log(\`  🎯 Network's angle was optimal!\`);
          } else {
            const networkAngleDeg = ((networkAngle * 180) / Math.PI).toFixed(0);
            const networkCandidate = candidateDetails[0]; // Network angle is always first
            console.log(
              \`  🔄 Improved from network's \${networkAngleDeg}° (\${networkCandidate.distanceToEnemy}px away, canDamage: \${networkCandidate.canDamage}) to \${selected.angleDegrees.toFixed(0)}°\`
            );
          }
          console.log();
        }
      }

      // Get the selected candidate's landing position for verification
      const selectedCandidate = candidateDetails.find(c => c.selected);
      
      return {
        weapon: "BAZOOKA",
        aimAngle: bestAngle,
        aimAngleDegrees: (bestAngle * 180) / Math.PI,
        movement: "none",
        actionType: "shoot",
        targetIndex: 0,
        power: 1.0,
        explorationUsed: Math.abs(bestAngle - networkAngle) > 0.001, // Did look-ahead override network?
        candidatesChecked: candidateDetails.length,
        bestDistanceToEnemy: Math.round(minDistToEnemy),
        candidates: candidateDetails,
        // CRITICAL: Store predicted landing for verification
        predictedLanding: selectedCandidate ? {
          x: selectedCandidate.landingX,
          y: selectedCandidate.landingY,
          distToEnemy: selectedCandidate.distanceToEnemy,
          withinRadius: selectedCandidate.withinRadius,
          clearLOS: selectedCandidate.clearLOS,
          canDamage: selectedCandidate.canDamage,
        } : null,
      };
    };
  `;
}

/**
 * Get training mode setup injection
 * Enables fast training optimizations
 * @returns {string} - Code to inject
 */
export function getTrainingModeInjection() {
  return `
    // Set training mode flags for speed optimizations
    window.__TRAINING_MODE__ = true;
    window.__SKIP_ANIMATIONS__ = true;
    window.__INSTANT_BAZOOKA__ = true;

    console.log("[AI] Training mode enabled: instant bazooka, physics simulation ready");
  `;
}

/**
 * Get movement assistance injection
 * Provides pathfinding functions that run in browser context
 * Two-phase: ground movement first, then jumping if needed
 * @returns {string} - Code to inject
 */
export function getMovementAssistanceInjection() {
  return `
    // Movement Assistance - Pathfinding in browser context
    // Has access to real game physics, terrain, and InstantShotResolver
    
    /**
     * Find best movement path to reach optimal shooting position
     * Phase 1: Ground movement (walk left/right)
     * Phase 2: Jump movement (if ground fails)
     */
    window.__findBestMovementPath__ = function(playerPos, enemyPos, scene) {
      // Phase 1: Try ground movement first
      const groundPath = __findBestGroundPosition__(playerPos, enemyPos, scene);
      
      if (groundPath && groundPath.canHit) {
        return {
          ...groundPath,
          requiresJump: false,
          phase: 'ground',
        };
      }
      
      // Phase 2: Try jumping
      const jumpPath = __findBestJumpPosition__(playerPos, enemyPos, scene);
      
      if (jumpPath && jumpPath.canHit) {
        return {
          ...jumpPath,
          requiresJump: true,
          phase: 'jump',
        };
      }
      
      // Fallback: stay and shoot from current position
      const currentShot = __testShotFromPosition__(playerPos, enemyPos, scene);
      return {
        position: playerPos,
        method: 'stay',
        direction: 'none',
        distance: 0,
        requiresJump: false,
        canHit: currentShot.canHit,
        shotAngle: currentShot.bestAngle || 0,
        distToEnemy: currentShot.distToEnemy || 1000,
        score: 0,
        phase: 'fallback',
        holdTime: 0,
        heightGain: 0,
      };
    };
    
    /**
     * Phase 1: Find best ground position (walk left/right)
     * Now with terrain collision detection!
     */
    window.__findBestGroundPosition__ = function(playerPos, enemyPos, scene) {
      const candidates = [];
      const STEP_SIZE = 100;
      const MAX_STEPS = 5;
      
      // Get terrain bodies for collision detection (like TerrainScanner)
      const bodies = scene?.matter?.world?.localWorld?.bodies;
      const Query = bodies ? Phaser.Physics.Matter.Matter.Query : null;
      
      // Helper: Check if position is inside terrain
      const isInsideTerrain = (pos) => {
        if (!Query) return false;
        const hitBodies = Query.point(bodies, pos);
        return hitBodies.some(body => body.isTerrain);
      };
      
      // Helper: Find nearest valid position before terrain
      const findNearestValid = (startX, targetX, y) => {
        if (!Query) return targetX;
        
        const stepDir = targetX > startX ? 10 : -10;
        let testX = startX;
        
        while (Math.abs(testX - targetX) > Math.abs(stepDir)) {
          testX += stepDir;
          if (isInsideTerrain({ x: testX, y })) {
            return testX - stepDir; // Return last valid position
          }
        }
        return targetX; // No collision, return target
      };
      
      // Test current position first
      const currentShot = __testShotFromPosition__(playerPos, enemyPos, scene);
      if (currentShot.canHit) {
        candidates.push({
          position: playerPos,
          method: 'stay',
          direction: 'none',
          distance: 0,
          shotAngle: currentShot.bestAngle,
          distToEnemy: currentShot.distToEnemy,
          canHit: true,
          score: __scorePosition__(playerPos, enemyPos) + 100,
          holdTime: 0,
          heightGain: 0,
        });
      }
      
      // Scan left - STOP at terrain
      for (let step = 1; step <= MAX_STEPS; step++) {
        const targetX = playerPos.x - step * STEP_SIZE;
        if (targetX < 50) break;
        
        const testPos = { x: targetX, y: playerPos.y };
        
        // Check if target OR path contains terrain
        if (isInsideTerrain(testPos)) {
          // Find nearest valid position before terrain
          const validX = findNearestValid(playerPos.x, targetX, playerPos.y);
          if (Math.abs(validX - playerPos.x) > 50) { // Only if moved significantly
            const validPos = { x: validX, y: playerPos.y };
            const shotResult = __testShotFromPosition__(validPos, enemyPos, scene);
            if (shotResult.canHit) {
              candidates.push({
                position: validPos,
                method: 'walk_left',
                direction: 'left',
                distance: Math.abs(validX - playerPos.x),
                shotAngle: shotResult.bestAngle,
                distToEnemy: shotResult.distToEnemy,
                canHit: true,
                score: __scorePosition__(validPos, enemyPos),
                holdTime: 0,
                heightGain: 0,
              });
            }
          }
          break; // Stop scanning left - hit terrain
        }
        
        // Position is valid, test shot
        const shotResult = __testShotFromPosition__(testPos, enemyPos, scene);
        if (shotResult.canHit) {
          candidates.push({
            position: testPos,
            method: 'walk_left',
            direction: 'left',
            distance: step * STEP_SIZE,
            shotAngle: shotResult.bestAngle,
            distToEnemy: shotResult.distToEnemy,
            canHit: true,
            score: __scorePosition__(testPos, enemyPos),
            holdTime: 0,
            heightGain: 0,
          });
        }
      }
      
      // Scan right - STOP at terrain
      for (let step = 1; step <= MAX_STEPS; step++) {
        const targetX = playerPos.x + step * STEP_SIZE;
        if (targetX > 1150) break;
        
        const testPos = { x: targetX, y: playerPos.y };
        
        // Check if target OR path contains terrain
        if (isInsideTerrain(testPos)) {
          // Find nearest valid position before terrain
          const validX = findNearestValid(playerPos.x, targetX, playerPos.y);
          if (Math.abs(validX - playerPos.x) > 50) { // Only if moved significantly
            const validPos = { x: validX, y: playerPos.y };
            const shotResult = __testShotFromPosition__(validPos, enemyPos, scene);
            if (shotResult.canHit) {
              candidates.push({
                position: validPos,
                method: 'walk_right',
                direction: 'right',
                distance: Math.abs(validX - playerPos.x),
                shotAngle: shotResult.bestAngle,
                distToEnemy: shotResult.distToEnemy,
                canHit: true,
                score: __scorePosition__(validPos, enemyPos),
                holdTime: 0,
                heightGain: 0,
              });
            }
          }
          break; // Stop scanning right - hit terrain
        }
        
        // Position is valid, test shot
        const shotResult = __testShotFromPosition__(testPos, enemyPos, scene);
        if (shotResult.canHit) {
          candidates.push({
            position: testPos,
            method: 'walk_right',
            direction: 'right',
            distance: step * STEP_SIZE,
            shotAngle: shotResult.bestAngle,
            distToEnemy: shotResult.distToEnemy,
            canHit: true,
            score: __scorePosition__(testPos, enemyPos),
            holdTime: 0,
            heightGain: 0,
          });
        }
      }
      
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0];
    };
    
    /**
     * Phase 2: Find best jump position
     */
    window.__findBestJumpPosition__ = function(playerPos, enemyPos, scene) {
      const candidates = [];
      const holdDurations = [100, 200, 300, 400, 500, 600];
      
      for (const direction of ['left', 'right']) {
        for (const holdTime of holdDurations) {
          // Simulate jump landing
          const landingPos = __simulateJump__(playerPos, direction, holdTime, scene);
          
          // Check if gained height
          const gainedHeight = landingPos.y < playerPos.y;
          if (!gainedHeight) continue;
          
          // Test shot from landing position
          const shotResult = __testShotFromPosition__(landingPos, enemyPos, scene);
          if (shotResult.canHit) {
            candidates.push({
              position: landingPos,
              method: \`jump_\${direction}\`,
              direction: direction,
              distance: Math.abs(landingPos.x - playerPos.x),
              holdTime: holdTime,
              heightGain: playerPos.y - landingPos.y,
              shotAngle: shotResult.bestAngle,
              distToEnemy: shotResult.distToEnemy,
              canHit: true,
              score: __scorePosition__(landingPos, enemyPos) + 200,
            });
          }
        }
      }
      
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0];
    };
    
    /**
     * Test if a position can hit enemy (reuses look-ahead logic)
     */
    window.__testShotFromPosition__ = function(pos, enemyPos, scene) {
      if (!window.InstantShotResolver) {
        return { canHit: false, bestAngle: 0, distToEnemy: 1000 };
      }
      
      const weaponConfig = window.CombatCrocs.config.WEAPON_CONFIGS.BAZOOKA;
      const DAMAGE_RADIUS = weaponConfig.damageRadius || 140;
      
      let bestAngle = 0;
      let minDist = Infinity;
      let foundValidShot = false;
      
      // Test 37 angles (every 10 degrees)
      for (let i = 0; i < 37; i++) {
        const angle = (i * 10 * Math.PI) / 180;
        
        // Simulate shot from this position
        const landing = __simulateShotFromPosition__(pos, angle, scene);
        
        const distToEnemy = Math.sqrt(
          Math.pow(landing.x - enemyPos.x, 2) + Math.pow(landing.y - enemyPos.y, 2)
        );
        
        const withinRadius = distToEnemy <= DAMAGE_RADIUS;
        const clearLOS = !window.PhysicsManager.isExplosionBlocked(
          landing.x, landing.y, enemyPos.x, enemyPos.y, scene
        );
        
        if (withinRadius && clearLOS) {
          foundValidShot = true;
          if (distToEnemy < minDist) {
            minDist = distToEnemy;
            bestAngle = angle;
          }
        }
      }
      
      return {
        canHit: foundValidShot,
        bestAngle: bestAngle,
        distToEnemy: minDist,
      };
    };
    
    /**
     * Simulate shot from a position using InstantShotResolver
     */
    window.__simulateShotFromPosition__ = function(pos, angle, scene) {
      // Create temporary player object at test position
      const testPlayer = {
        x: pos.x,
        y: pos.y,
        team: 1,
      };
      
      // Use InstantShotResolver to predict landing
      return window.InstantShotResolver.resolveBazookaFromAngle(
        scene,
        testPlayer,
        angle,
        true // noDamage - simulation only
      );
    };
    
    /**
     * Simulate jump trajectory with REAL Phaser physics
     * Uses actual Matter.js engine like InstantShotResolver
     */
    window.__simulateJump__ = function(startPos, direction, holdTime, scene) {
      if (!scene?.matter) {
        // Fallback if scene not available
        return startPos;
      }
      
      // Use REAL game constants from Config
      const jumpForce = 15;  // Config.PLAYER_JUMP_FORCE
      const horizontalSpeed = 5; // Config.PLAYER_SPEED
      
      // Create temporary physics body (sensor so it doesn't collide)
      const tempBody = scene.matter.add.circle(startPos.x, startPos.y, 20, {
        isSensor: true, // Don't collide with terrain
        friction: 0.5,
        frictionAir: 0.01,
        restitution: 0.2,
      });
      
      // Mark as simulation body
      tempBody.isSimulation = true;
      
      // Set initial velocity (match MovementManager logic)
      const horizontalVel = direction === 'left' ? -horizontalSpeed : 
                           direction === 'right' ? horizontalSpeed : 0;
      scene.matter.body.setVelocity(tempBody, { x: horizontalVel, y: -jumpForce });
      
      const startY = startPos.y;
      const TIME_STEP = 1000 / 60; // 60 FPS
      let timeElapsed = 0;
      
      // Simulate holding direction for holdTime
      while (timeElapsed < holdTime && timeElapsed < 2000) {
        scene.matter.world.step(TIME_STEP);
        timeElapsed += TIME_STEP;
      }
      
      // Stop horizontal movement after holdTime
      scene.matter.body.setVelocity(tempBody, { 
        x: 0, 
        y: tempBody.velocity.y 
      });
      
      // Continue simulation until landed
      let steps = 0;
      const maxSteps = 100;
      while (steps < maxSteps) {
        scene.matter.world.step(TIME_STEP);
        
        // Check if landed (y velocity positive and below/at start height)
        if (tempBody.velocity.y > 0 && tempBody.position.y >= startY) {
          break;
        }
        
        steps++;
      }
      
      const landing = {
        x: Math.round(tempBody.position.x),
        y: Math.round(tempBody.position.y),
      };
      
      // Clean up temp body
      scene.matter.world.remove(tempBody);
      
      return landing;
    };
    
    /**
     * Score position based on distance to enemy
     */
    window.__scorePosition__ = function(pos, enemyPos) {
      let score = 0;
      const dist = Math.sqrt(
        Math.pow(pos.x - enemyPos.x, 2) + Math.pow(pos.y - enemyPos.y, 2)
      );
      
      // Sweet spot: 200-600px
      if (dist >= 200 && dist <= 600) {
        score += 1000 - Math.abs(dist - 400);
      } else if (dist < 200) {
        score -= 200 - dist;
      } else {
        score -= (dist - 600) / 2;
      }
      
      // Bonus for high ground
      if (pos.y < enemyPos.y - 100) {
        score += 200;
      }
      
      return score;
    };
    
    console.log('[AI] Movement assistance injected and ready');
  `;
}
