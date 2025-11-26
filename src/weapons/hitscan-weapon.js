// Hitscan weapon system for Combat Crocs
// Handles instant-damage weapons like shotguns

class HitscanWeapon {
  // Create shotgun hitscan shot (no projectile physics, instant damage)
  static createShotgunHitscan(scene, player, targetX, targetY) {
    console.log(
      `🔍 SHOTGUN: createShotgunHitscan called for player ${player.id} at (${player.x}, ${player.y}) aiming at (${targetX}, ${targetY})`,
    );

    // Show all players and their health/status
    console.log(`🔍 Players: ${scene.players.map(p => `${p.id}:${p.health}`).join(", ")}`);

    // Check for hits along the shot line
    const validTargets = scene.players.filter(targetPlayer => targetPlayer.id !== player.id && targetPlayer.health > 0);
    console.log(
      `🎯 Valid targets: ${validTargets.map(p => `${p.id}@(${p.x.toFixed(1)},${p.y.toFixed(1)})`).join(", ")}`,
    );
    const hitPlayer = this.checkShotgunHit(validTargets, player.x, player.y, targetX, targetY);

    if (hitPlayer) {
      // Check if terrain blocks the direct path to target
      const terrainBlocks = WeaponMath.terrainBlocksPath(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);
      if (terrainBlocks) {
        console.log(`🏔️ TERRAIN BLOCK: Path to Player ${hitPlayer.id} blocked - shot cannot reach through platform`);
        // Show blocked shot trail
        this.showShotgunTrail(scene, player.x, player.y, terrainBlocks.x, terrainBlocks.y);
        console.log(`❌ Hit blocked by terrain - no damage`);
      } else {
        // SUCCESS: Player hit! Deal damage
        const damageAmount = Config.WEAPON_CONFIGS.SHOTGUN.damage;
        const healthBefore = hitPlayer.health;
        hitPlayer.health = Math.max(0, hitPlayer.health - damageAmount);
        const healthAfter = hitPlayer.health;

        console.log(
          `🔫 HITSCAN DAMAGE: Player ${hitPlayer.id} took ${damageAmount} damage (${healthBefore} → ${healthAfter})`,
        );
        UIManager.updateHealthBars(scene);

        // Update game end conditions
        scene.checkGameEnd?.();

        // Visualize the successful shot
        this.showShotgunTrail(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);
      }
    } else {
      console.log(`❌ Hitscan MISS: No player hit along shot path`);
      // Visualize the miss
      this.showShotgunTrail(scene, player.x, player.y, targetX, targetY);
    }

    // Allow next shot immediately if ammo remains - behavior-driven
    const shotgunConfig = Config.WEAPON_CONFIGS.SHOTGUN;
    if (shotgunConfig.behaviorFlags.includes("multiShot") && scene.turnManager.weaponAmmo.SHOTGUN >= 1) {
      // Set up next shot immediately (no physics delay for hitscan)
      player.canShoot = true;
      scene.turnManager.turnInProgress = false; // ✅ Critical reset
    } else {
      // No ammo left or single-shot weapon - ensure turn is clean before starting next turn
      scene.turnManager.turnInProgress = false; // ✅ Explicit reset
      scene.turnManager.startTurn();
    }
  }

  // Check for player hit along shotgun line (finds FIRST player hit)
  static checkShotgunHit(players, startX, startY, endX, endY) {
    // Shotgun params
    const maxRange = 1000; // Cap shooting range
    const hitRadius = 25; // How close to line counts as hit

    // Calculate shot vector
    let shotX = endX - startX;
    let shotY = endY - startY;
    const shotLength = Math.sqrt(shotX * shotX + shotY * shotY);

    if (shotLength === 0) return null; // Avoid divide by zero

    // Normalize shot direction
    shotX /= shotLength;
    shotY /= shotLength;

    // Find the FIRST player hit along the shot line
    let closestHit = null;
    let closestDistance = Infinity;

    for (const targetPlayer of players) {
      if (targetPlayer.id === "N/A" || targetPlayer.health <= 0) continue;

      const dx = targetPlayer.x - startX;
      const dy = targetPlayer.y - startY;

      // Project player position onto shot line
      const projection = dx * shotX + dy * shotY;

      // Skip if behind shooter or beyond max range
      if (projection < 0 || projection > maxRange) continue;

      // Calculate perpendicular distance from shot line
      const perpX = startX + projection * shotX;
      const perpY = startY + projection * shotY;
      const distanceToLine = Math.sqrt(Math.pow(targetPlayer.x - perpX, 2) + Math.pow(targetPlayer.y - perpY, 2));

      // Check if player is close enough to the shot line (exact hit detection)
      if (distanceToLine <= hitRadius) {
        // Find the player closest along the shot path (first hit)
        if (projection < closestDistance) {
          closestDistance = projection;
          closestHit = targetPlayer;
        }
      }
    }

    // Hitscan stops at first player hit
    if (closestHit) {
      console.log(`🔫 Shotgun HIT: Player ${closestHit.id} at distance ${closestDistance.toFixed(1)}`);
    }

    return closestHit; // Return first hit, or null if no hit
  }

  // Show visual trail for hitscan shot
  static showShotgunTrail(scene, startX, startY, endX, endY) {
    const trail = scene.add.graphics();
    trail.lineStyle(3, 0xffff00, 0.8);
    trail.moveTo(startX, startY);
    trail.lineTo(endX, endY);
    trail.strokePath();

    // Auto-disappear
    scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 400,
      onComplete: () => trail.destroy(),
    });
  }
}

window.HitscanWeapon = HitscanWeapon;
