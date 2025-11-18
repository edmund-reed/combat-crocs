// Weapon utilities for Combat Crocs

class WeaponManager {
  // Create and fire a weapon
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
    weaponType === "GRENADE"
      ? this.setupGrenadeCollision(scene, body, weaponType)
      : this.setupProjectileCollision(scene, body, weaponType);

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

  // Setup collision for grenades (timer-based explosion)
  static setupGrenadeCollision(scene, projectileBody, weaponType) {
    scene.turnManager.setupGrenadeCollision(scene, projectileBody, weaponType);
  }

  // Create shotgun hitscan shot (no projectile physics, instant damage)
  static createShotgunHitscan(scene, player, targetX, targetY) {
    // First check for terrain intersection (blocks shot if obstructed)
    const terrainIntersection = this.checkTerrainHitscan(scene, player.x, player.y, targetX, targetY);
    if (terrainIntersection) {
      // Visualize blocked shot
      this.showShotgunTrail(scene, player.x, player.y, terrainIntersection.x, terrainIntersection.y);
      // No damage, update turn - terrain blocked shot should allow retry
      if (scene.turnManager.weaponAmmo.SHOTGUN >= 1) {
        player.canShoot = true; // Force allow for retry
        scene.turnManager.turnInProgress = false; // ✅ Immediate reset
      } else {
        scene.turnManager.turnInProgress = false; // ✅ Explicit reset
        scene.turnManager.startTurn(); // End shotgun turn immediately
      }
      return; // End early - terrain blocks shot
    }

    // Check for hit along the shot line (exclude shooter from possible targets)
    const validTargets = scene.players.filter(targetPlayer => targetPlayer.id !== player.id);
    const hitPlayer = this.checkShotgunHit(validTargets, player.x, player.y, targetX, targetY);

    if (hitPlayer) {
      console.log(`🔫 Shotgun HIT: Player ${hitPlayer.id} for ${Config.WEAPON_TYPES.SHOTGUN.damage} damage`);
      hitPlayer.health = Math.max(0, hitPlayer.health - Config.WEAPON_TYPES.SHOTGUN.damage);
      UIManager.updateHealthBars(scene);

      // Update game end conditions
      scene.checkGameEnd?.();
    } else {
      console.log(`❌ Shotgun MISS: No player hit`);
    }

    // Visualize the shot (optional)
    this.showShotgunTrail(scene, player.x, player.y, targetX, targetY);

    // Allow next shot immediately if ammo remains
    if (scene.turnManager.weaponAmmo.SHOTGUN >= 1) {
      // Set up next shot immediately (no physics delay for hitscan)
      player.canShoot = true;
      scene.turnManager.turnInProgress = false; // ✅ Critical reset
    } else {
      // No ammo left - ensure turn is clean before starting next turn
      scene.turnManager.turnInProgress = false; // ✅ Explicit reset
      console.log(" Shotgun turn ended, starting next player");
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

  static getCurrentWeapon() {
    return "BAZOOKA";
  }
}

window.WeaponManager = WeaponManager;
