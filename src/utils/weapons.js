// Weapon utilities for Combat Crocs

class WeaponManager {
  // Simple weapon dispatch system - removes hard-coded weapon references
  static fireWeapon(scene, player, targetX, targetY, weaponType) {
    // Simple dispatch table replaces scattered hard-coded checks
    const weaponMethods = {
      BAZOOKA: (scene, player, targetX, targetY) => this.createProjectile(scene, player, targetX, targetY, weaponType),
      GRENADE: (scene, player, targetX, targetY) => this.createProjectile(scene, player, targetX, targetY, weaponType),
      SHOTGUN: (scene, player, targetX, targetY) => this.createShotgunHitscan(scene, player, targetX, targetY),
      // Future weapons need methods added here as they're implemented
      UZI: () => console.log("❌ UZI not implemented yet"),
      FLAMETHROWER: () => console.log("❌ FLAMETHROWER not implemented yet"),
    };

    const method = weaponMethods[weaponType];
    if (method) {
      return method(scene, player, targetX, targetY);
    } else {
      console.error(`❌ No method for weapon: ${weaponType}`);
      return null;
    }
  }

  // Legacy method for backward compatibility - will be removed
  static createProjectile(scene, player, targetX, targetY, weaponType = "BAZOOKA") {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
    const power = 25;

    // Create physics body with minimal distance from player to prevent obstacle penetration
    const spawnDistance = 8; // Small distance prevents spawning behind obstacles
    const body = scene.matter.add.circle(
      player.x + Math.cos(angle) * spawnDistance,
      player.y + Math.sin(angle) * spawnDistance,
      5,
      { friction: 0.1, restitution: 0.8 },
    );

    // Create projectile graphic
    const projectile = scene.add.graphics({
      x: body.position.x,
      y: body.position.y,
    });
    projectile.fillStyle(0xff0000);
    projectile.fillCircle(0, 0, 5);

    body.projectileOwner = player.id;

    // Set velocity and add trail effect
    scene.matter.body.setVelocity(body, {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    });
    InputManager.addProjectileTrail(scene, body);

    // Handle weapon-specific collision logic
    const weaponConfig = Config.WEAPON_CONFIGS[weaponType];
    if (weaponConfig.behaviorFlags.includes("timerExplosion")) {
      this.setupTimerExplosionCollision(scene, body, weaponConfig, weaponType);
    } else if (weaponConfig.behaviorFlags.includes("explodesOnImpact")) {
      this.setupProjectileCollision(scene, body, projectile, weaponType);
    }
    // Add bounce physics for weapons with bounce flag
    if (weaponConfig.behaviorFlags.includes("bounces")) {
      body.restitution = 0.8; // Add bounce
    }

    // Store graphic reference for cleanup
    body.projectileGraphics = projectile;

    return { body, projectile };
  }

  // Setup collision detection for projectiles
  static setupProjectileCollision(scene, projectileBody, projectileGraphics, weaponType) {
    let hasHit = false;

    scene.matter.world.on("collisionstart", event => {
      if (!projectileBody.destroyed && !hasHit) {
        event.pairs.forEach(pair => {
          // Check if this collision involves our projectile
          if (pair.bodyA === projectileBody || pair.bodyB === projectileBody) {
            console.log("Projectile collision detected!");
            hasHit = true;

            // Position explosion on surface by offsetting opposite to travel direction
            let explosionX = projectileBody.position.x;
            let explosionY = projectileBody.position.y;

            const velocity = projectileBody.velocity;
            if (velocity.x !== 0 || velocity.y !== 0) {
              const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
              if (speed > 0) {
                const dirX = velocity.x / speed;
                const dirY = velocity.y / speed;
                const offset = 50; // Clear platform thickness
                explosionX -= dirX * offset;
                explosionY -= dirY * offset;
              }
            }

            ExplosionSystem.createExplosion(scene, explosionX, explosionY, projectileBody.projectileOwner, weaponType);
            scene.matter.world.remove(projectileBody);
            if (projectileGraphics && typeof projectileGraphics.destroy === "function") {
              projectileGraphics.destroy();
            }
            if (projectileBody.debugOutline && typeof projectileBody.debugOutline.destroy === "function") {
              projectileBody.debugOutline.destroy();
            }
            // Call endProjectileTurn to advance to next player
            scene.endProjectileTurn();
          }
        });
      }
    });
  }

  // Projectile detonation for timer-based weapons (grenades)
  static detonateProjectile(scene, projectileBody) {
    if (projectileBody.destroyed) return; // Already detonated

    console.log(`💥 Timer detonation: Grenade exploding`);

    // Use stored weapon type
    const weaponType = projectileBody.weaponType || "GRENADE";

    // Create explosion at projectile position
    ExplosionSystem.createExplosion(
      scene,
      projectileBody.position.x,
      projectileBody.position.y,
      projectileBody.projectileOwner,
      weaponType,
    );

    // Clean up projectile body
    scene.matter.world.remove(projectileBody);

    // Remove visual projectile graphics
    if (projectileBody.projectileGraphics && typeof projectileBody.projectileGraphics.destroy === "function") {
      projectileBody.projectileGraphics.destroy();
    }

    // End turn after explosion
    scene.endProjectileTurn();
  }

  // Generic timer explosion collision (replaces grenade-specific logic)
  static setupTimerExplosionCollision(scene, projectileBody, weaponConfig, weaponType) {
    projectileBody.weaponConfig = weaponConfig;
    projectileBody.weaponType = weaponType; // Also store the weapon type for detonation
    // Default 3 seconds if not specified
    const delayMs = weaponConfig.delay || 3000;
    projectileBody.timerId = setTimeout(() => this.detonateProjectile(scene, projectileBody), delayMs);
    // Register for automatic cleanup
    MemoryManager.registerCleanup(scene, projectileBody.timerId, "timeouts");
  }

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
      const terrainBlocks = this.terrainBlocksPath(scene, player.x, player.y, hitPlayer.x, hitPlayer.y);
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

  // Check for terrain intersection with hitscan shot
  static checkTerrainHitscan(scene, startX, startY, endX, endY) {
    // Get terrain platforms (assume they're stored in scene as platform segments)
    // Platforms are typically rectangles with x, y, width, height
    const platforms = scene.currentMapPlatforms || [];

    // Calculate shot vector
    const shotX = endX - startX;
    const shotY = endY - startY;
    const shotLength = Math.sqrt(shotX * shotX + shotY * shotY);

    if (shotLength === 0) return null;

    // Normalize direction
    const dirX = shotX / shotLength;
    const dirY = shotY / shotLength;

    // Check intersection with each platform
    for (const platform of platforms) {
      // Simple bbox line intersection
      const intersection = this.lineRectIntersection(
        startX,
        startY,
        endX,
        endY,
        platform.x,
        platform.y,
        platform.width,
        platform.height,
      );

      if (intersection) {
        return intersection; // Return hit point
      }
    }

    return null; // No terrain hit
  }

  // Simple line-rectangle intersection (returns intersection point)
  static lineRectIntersection(lineStartX, lineStartY, lineEndX, lineEndY, rectX, rectY, rectWidth, rectHeight) {
    const rectLeft = rectX;
    const rectRight = rectX + rectWidth;
    const rectTop = rectY;
    const rectBottom = rectY + rectHeight;

    // Function to get intersection with a line segment
    const getIntersection = (p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) => {
      const denom = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);
      if (denom === 0) return null; // Parallel lines

      const t = ((p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x)) / denom;
      const u = -((p1x - p2x) * (p1y - p3y) - (p1y - p2y) * (p1x - p3x)) / denom;

      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
          x: p1x + t * (p2x - p1x),
          y: p1y + t * (p2y - p1y),
        };
      }
      return null;
    };

    // Check all four rectangle edges
    const lineX1 = lineStartX,
      lineY1 = lineStartY,
      lineX2 = lineEndX,
      lineY2 = lineEndY;

    // Left edge
    const hitLeft = getIntersection(lineX1, lineY1, lineX2, lineY2, rectLeft, rectTop, rectLeft, rectBottom);
    if (hitLeft) return hitLeft;

    // Right edge
    const hitRight = getIntersection(lineX1, lineY1, lineX2, lineY2, rectRight, rectTop, rectRight, rectBottom);
    if (hitRight) return hitRight;

    // Top edge
    const hitTop = getIntersection(lineX1, lineY1, lineX2, lineY2, rectLeft, rectTop, rectRight, rectTop);
    if (hitTop) return hitTop;

    // Bottom edge
    const hitBottom = getIntersection(lineX1, lineY1, lineX2, lineY2, rectLeft, rectBottom, rectRight, rectBottom);
    if (hitBottom) return hitBottom;

    return null; // No intersection
  }

  // Check if terrain blocks the direct path between two points (bulletproof terrain)
  static terrainBlocksPath(scene, startX, startY, endX, endY) {
    const platforms = scene.currentMapPlatforms || [];

    // Check if the line segment intersects ANY platform rectangle
    for (const platform of platforms) {
      const intersection = this.lineRectIntersection(
        startX,
        startY,
        endX,
        endY,
        platform.x,
        platform.y,
        platform.width,
        platform.height,
      );

      if (intersection) {
        return intersection; // Terrain intersection found - blocks the shot
      }
    }

    return null; // Clear path - no terrain intersections
  }

  static getCurrentWeapon() {
    return "BAZOOKA";
  }
}

window.WeaponManager = WeaponManager;
