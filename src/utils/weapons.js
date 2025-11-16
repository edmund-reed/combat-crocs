// Weapon utilities for Combat Crocs

class WeaponManager {
  // Create and fire a weapon
  static createProjectile(
    scene,
    player,
    targetX,
    targetY,
    weaponType = "BAZOOKA"
  ) {
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      targetX,
      targetY
    );
    const power = 25;

    // Create physics body with safe positioning to avoid immediate collision
    const spawnDistance = 45;
    const body = scene.matter.add.circle(
      player.x + Math.cos(angle) * spawnDistance,
      player.y + Math.sin(angle) * spawnDistance,
      5,
      { friction: 0.1, restitution: 0.8 }
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
    this.addProjectileTrail(scene, body);

    // Handle weapon-specific collision logic
    weaponType === "GRENADE"
      ? this.setupGrenadeCollision(scene, body, projectile, weaponType)
      : this.setupProjectileCollision(scene, body, projectile, weaponType);

    // Store graphic reference for cleanup
    body.projectileGraphics = projectile;

    return { body, projectile };
  }

  // Add visual trail to projectile
  static addProjectileTrail(scene, projectileBody) {
    scene.time.addEvent({
      delay: 100,
      repeat: 10,
      callback: () => {
        if (!projectileBody.destroyed) {
          const trail = scene.add.graphics({
            x: projectileBody.position.x,
            y: projectileBody.position.y,
          });
          trail.fillStyle(0xff4500);
          trail.fillCircle(0, 0, 2);
          scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 500,
            onComplete: () => trail && trail.destroy(),
          });
        }
      },
    });
  }

  // Setup collision detection for projectiles
  static setupProjectileCollision(
    scene,
    projectileBody,
    projectileGraphics,
    weaponType
  ) {
    let hasHit = false;

    scene.matter.world.on("collisionstart", (event) => {
      if (!projectileBody.destroyed && !hasHit) {
        event.pairs.forEach((pair) => {
          // Check if this collision involves our projectile
          if (pair.bodyA === projectileBody || pair.bodyB === projectileBody) {
            console.log("Projectile collision detected!");
            hasHit = true;
            this.createExplosion(
              scene,
              projectileBody.position.x,
              projectileBody.position.y,
              projectileBody.projectileOwner,
              weaponType
            );
            scene.matter.world.remove(projectileBody);
            projectileGraphics.destroy();
            if (projectileBody.debugOutline) {
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
  static setupGrenadeCollision(
    scene,
    projectileBody,
    projectileGraphics,
    weaponType
  ) {
    projectileBody.weaponType = weaponType;
    projectileBody.timerId = setTimeout(
      () => this.grenadeDetonate(scene, projectileBody),
      3000
    );
  }

  // Detonate grenade timer explosion
  static grenadeDetonate(scene, projectileBody) {
    WeaponManager.createExplosion(
      scene,
      projectileBody.position.x,
      projectileBody.position.y,
      projectileBody.projectileOwner,
      projectileBody.weaponType || "GRENADE"
    );

    // Cleanup
    scene.matter.world.remove(projectileBody);
    projectileBody.projectileGraphics?.destroy();

    if (projectileBody.timerId) {
      clearTimeout(projectileBody.timerId);
    }

    scene.endProjectileTurn();
  }

  // Create explosion effect
  static createExplosion(
    scene,
    x,
    y,
    projectileOwner = null,
    weaponType = "BAZOOKA"
  ) {
    const weaponConfig = Config.WEAPON_TYPES[weaponType];
    const radius = weaponConfig.radius;
    console.log(
      `ACTUAL EXPLOSION at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      }. Radius: ${radius}`
    );

    // Explosion graphics
    const explosion = scene.add.graphics({ x: x, y: y });
    explosion.fillStyle(0xff4500);
    explosion.fillCircle(0, 0, radius);

    scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage nearby players (check for terrain protection)
    scene.players.forEach((player, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      console.log(
        `Player ${index + 1} distance: ${distance.toFixed(1)}, health: ${
          player.health
        }`
      );

      if (distance < radius) {
        // Apply the same terrain blocking check to ALL crocs (including the shooter)
        const blockedByTerrain = WeaponManager.isExplosionBlockedByTerrain(
          scene,
          x,
          y,
          player.x,
          player.y,
          projectileOwner,
          player.id
        );

        if (!blockedByTerrain) {
          // Apply damage with distance falloff
          const maxDamage = weaponConfig.damage;
          const damage = Math.max(
            0,
            maxDamage - (distance / radius) * (maxDamage * 0.75)
          );
          console.log(
            `${projectileOwner === player.id ? "🎯 OWN" : "💥"} Player ${
              index + 1
            } hit for ${damage} damage`
          );

          player.health = Math.max(0, player.health - damage);
          UIManager.updateHealthBars(scene);

          // Check if the game should end after damage
          scene.checkGameEnd?.();
        } else {
          console.log(
            `🛡️ Player ${index + 1} protected by terrain from explosion`
          );
        }
      }
    });

    // Screen shake
    scene.cameras.main.shake(200, 0.02);

    return projectileOwner;
  }

  // Check if terrain blocks the explosion path to a player
  static isExplosionBlockedByTerrain(
    scene,
    explosionX,
    explosionY,
    playerX,
    playerY,
    projectileOwner,
    playerId
  ) {
    // Simple terrain blocking check - check if there's a platform between explosion and player

    console.log(
      `Checking terrain blocking: explosion(${explosionX.toFixed(
        0
      )}, ${explosionY.toFixed(0)}) to player(${playerX.toFixed(
        0
      )}, ${playerY.toFixed(0)})`
    );

    // Platform positions from TerrainManager (hardcoded for now)
    const platforms = [
      { x: 400, y: 575, width: 200, height: 50, name: "Left Platform" },
      { x: 700, y: 525, width: 150, height: 50, name: "Middle Platform" },
      { x: 950, y: 475, width: 100, height: 50, name: "Right Platform" },
    ];

    // Find the landing platform (where missile exploded)
    const landingPlatform = platforms.find((platform) => {
      const platLeft = platform.x - platform.width / 2;
      const platRight = platform.x + platform.width / 2;
      const platTop = platform.y - platform.height / 2;
      const platBottom = platform.y + platform.height / 2;

      return (
        explosionX >= platLeft &&
        explosionX <= platRight &&
        explosionY >= platTop &&
        explosionY <= platBottom
      );
    });

    // Check other platforms for terrain blocking - landing platform never blocks
    const blockingPlatforms = landingPlatform
      ? platforms.filter((p) => p !== landingPlatform)
      : platforms;

    console.log(
      `Landing platform: ${
        landingPlatform ? landingPlatform.name : "None"
      }, checking ${blockingPlatforms.length} platforms for terrain blocking`
    );

    // Check ALL platforms using consistent geometric blocking rules
    for (const platform of platforms) {
      const isLanding = platform === landingPlatform;
      const blocked = this.platformBlocksPath(
        platform,
        explosionX,
        explosionY,
        playerX,
        playerY,
        projectileOwner,
        playerId,
        isLanding
      );

      if (blocked) {
        console.log(
          `❌ BLOCKED by ${platform.name} at (${platform.x}, ${platform.y})`
        );
        return true;
      } else {
        console.log(
          `✅ ${platform.name} at (${platform.x}, ${platform.y}) does NOT block`
        );
      }
    }

    console.log("✅ No terrain blocking found");
    return false;
  }

  // Check if a specific platform blocks damage to a player
  // Pure geometric line-of-sight blocking
  static platformBlocksPath(
    platform,
    explosionX,
    explosionY,
    playerX,
    playerY,
    projectileOwner,
    playerId,
    isLandingPlatform
  ) {
    const { x: platX, y: platY, width: platW, height: platH } = platform;

    // Platform bounds (axis-aligned rectangle)
    const platLeft = platX - platW / 2;
    const platRight = platX + platW / 2;
    const platTop = platY - platH / 2;
    const platBottom = platY + platH / 2;

    console.log(
      `Platform check: explosion(${explosionX.toFixed(0)}, ${explosionY.toFixed(
        0
      )}) → ` +
        `player(${playerX.toFixed(0)}, ${playerY.toFixed(0)}) vs platform ${
          platform.name
        } ` +
        `(rect: ${platLeft.toFixed(0)}-${platRight.toFixed(
          0
        )}, ${platTop.toFixed(0)}-${platBottom.toFixed(0)})`
    );

    // Pure geometric line-of-sight blocking - if line crosses any platform edge, blocked
    const lineSegment = {
      x1: explosionX,
      y1: explosionY,
      x2: playerX,
      y2: playerY,
    };

    // Left edge: x = platLeft, y between platTop and platBottom
    if (
      this.lineIntersectsVertical(lineSegment, platLeft, platTop, platBottom)
    ) {
      console.log(`🛡️ BLOCKED: Crosses left edge (geometric)`);
      return true;
    }

    // Right edge: x = platRight, y between platTop and platBottom
    if (
      this.lineIntersectsVertical(lineSegment, platRight, platTop, platBottom)
    ) {
      console.log(`🛡️ BLOCKED: Crosses right edge (geometric)`);
      return true;
    }

    // Top edge: y = platTop, x between platLeft and platRight
    if (
      this.lineIntersectsHorizontal(lineSegment, platTop, platLeft, platRight)
    ) {
      console.log(`🛡️ BLOCKED: Crosses top edge (geometric)`);
      return true;
    }

    // Bottom edge: y = platBottom, x between platLeft and platRight
    // Landing platforms never block from bottom edge (surface explosions don't block downward)
    if (
      this.lineIntersectsHorizontal(
        lineSegment,
        platBottom,
        platLeft,
        platRight
      ) &&
      !isLandingPlatform // Non-landing platforms can block from bottom edge when deeply penetrated
    ) {
      console.log(`🛡️ BLOCKED: Crosses bottom edge (geometric)`);
      return true;
    }

    console.log(`❌ Platform not blocking`);
    return false;
  }

  // Check if line segment intersects a vertical line segment
  static lineIntersectsVertical(line, vertX, vertY1, vertY2) {
    const { x1, y1, x2, y2 } = line;

    // Line must cross x = vertX
    if ((x1 <= vertX && x2 <= vertX) || (x1 >= vertX && x2 >= vertX)) {
      return false; // Both points on same side of vertical line
    }

    // Calculate intersection y-value
    const t = (vertX - x1) / (x2 - x1);
    const intersectY = y1 + t * (y2 - y1);

    // Check if intersection point is within vertical line segment
    return (
      intersectY >= Math.min(vertY1, vertY2) &&
      intersectY <= Math.max(vertY1, vertY2)
    );
  }

  // Check if line segment intersects a horizontal line segment
  static lineIntersectsHorizontal(line, horizY, horizX1, horizX2) {
    const { x1, y1, x2, y2 } = line;

    // Line must cross y = horizY
    if ((y1 <= horizY && y2 <= horizY) || (y1 >= horizY && y2 >= horizY)) {
      return false; // Both points on same side of horizontal line
    }

    // Calculate intersection x-value
    const t = (horizY - y1) / (y2 - y1);
    const intersectX = x1 + t * (x2 - x1);

    // Check if intersection point is within horizontal line segment
    return (
      intersectX >= Math.min(horizX1, horizX2) &&
      intersectX <= Math.max(horizX1, horizX2)
    );
  }

  static getCurrentWeapon() {
    return "BAZOOKA";
  }
}

window.WeaponManager = WeaponManager;
