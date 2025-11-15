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
        // Apply damage with distance falloff (no complex terrain blocking for now)
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
      }
    });

    // Screen shake
    scene.cameras.main.shake(200, 0.02);

    return projectileOwner;
  }

  // TODO: Add terrain blocking logic later if needed

  static getCurrentWeapon() {
    return "BAZOOKA";
  }
}

window.WeaponManager = WeaponManager;
