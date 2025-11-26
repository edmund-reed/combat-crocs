// Weapon utilities for Combat Crocs

class WeaponManager {
  // Weapon dispatch system
  static fireWeapon(scene, player, targetX, targetY, weaponType) {
    const weaponMethods = {
      BAZOOKA: (scene, player, targetX, targetY) => this.createProjectile(scene, player, targetX, targetY, weaponType),
      GRENADE: (scene, player, targetX, targetY) => this.createProjectile(scene, player, targetX, targetY, weaponType),
      SHOTGUN: (scene, player, targetX, targetY) => HitscanWeapon.createShotgunHitscan(scene, player, targetX, targetY),
    };

    const method = weaponMethods[weaponType];
    if (method) {
      return method(scene, player, targetX, targetY);
    } else {
      console.error(`❌ No method for weapon: ${weaponType}`);
      return null;
    }
  }

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

    // Handle weapon-specific collision logic (behavior-driven)
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

  // Generic timer explosion collision (replaces grenade-specific logic)
  static setupTimerExplosionCollision(scene, projectileBody, weaponConfig, weaponType) {
    projectileBody.weaponConfig = weaponConfig;
    projectileBody.weaponType = weaponType; // Store the weapon type for detonation
    // Default 3 seconds if not specified
    const delayMs = weaponConfig.delay || 3000;
    projectileBody.timerId = setTimeout(() => this.detonateProjectile(scene, projectileBody), delayMs);
    // Register for automatic cleanup
    MemoryManager.registerCleanup(scene, projectileBody.timerId, "timeouts");
  }

  // Projectile detonation for timer-based weapons (grenades)
  static detonateProjectile(scene, projectileBody) {
    if (projectileBody.destroyed) return; // Already detonated

    console.log(`💥 Timer detonation`);

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

    // Clean up projectile
    this._cleanupProjectile(scene, projectileBody);

    // End turn after explosion
    scene.endProjectileTurn();
  }

  // Shared projectile cleanup logic
  static _cleanupProjectile(scene, projectileBody) {
    scene.matter.world.remove(projectileBody);

    if (projectileBody.projectileGraphics && typeof projectileBody.projectileGraphics.destroy === "function") {
      projectileBody.projectileGraphics.destroy();
    }

    if (projectileBody.debugOutline && typeof projectileBody.debugOutline.destroy === "function") {
      projectileBody.debugOutline.destroy();
    }
  }

  static getCurrentWeapon() {
    return "BAZOOKA";
  }
}

window.WeaponManager = WeaponManager;
