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
        console.log("[AI] No enemy found for look-ahead");
        return null;
      }
      
      const enemyPos = { x: enemy.x, y: enemy.y };
      const playerPos = { x: gameState.self.x, y: gameState.self.y };

      // Generate 37 candidate angles: network's suggestion + 36 evenly spaced (every 10°)
      const anglesToTest = [networkAngle]; // Network angle first
      for (let deg = 0; deg < 360; deg += 10) {
        anglesToTest.push((deg * Math.PI) / 180);
      }

      // Get weapon config
      const weaponConfig = window.CombatCrocs.config.WEAPON_CONFIGS.BAZOOKA;
      const velocity = weaponConfig.initialVelocity || 15;
      const DAMAGE_RADIUS = weaponConfig.damageRadius || 140;

      let bestAngle = networkAngle;
      let minDistToEnemy = Infinity;
      const candidateDetails = [];
      const validShots = []; // Shots that can actually damage enemy

      // Test each candidate angle using EXACT InstantShotResolver logic
      for (const angle of anglesToTest) {
        // CRITICAL: Use exact same function as real instant shot
        const landing = window.InstantShotResolver.simulateProjectilePhysics(
          scene,
          playerPos.x,
          playerPos.y,
          angle,
          velocity,
          1 // mass
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

      // TWO-TIER SELECTION:
      // 1. If we have valid shots (can damage enemy), pick closest one
      // 2. Otherwise, fallback to closest shot overall (better than nothing)
      if (validShots.length > 0) {
        // Found shots that can damage enemy - pick closest
        validShots.sort((a, b) => a.distToEnemy - b.distToEnemy);
        bestAngle = validShots[0].angle;
      } else {
        // No valid shots - fallback to closest attempt
        candidateDetails.sort((a, b) => a.distanceToEnemy - b.distanceToEnemy);
        bestAngle = candidateDetails[0].angle;
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
