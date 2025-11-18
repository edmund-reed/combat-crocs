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

  static getCurrentWeapon() {
    return "BAZOOKA";
  }
}

window.WeaponManager = WeaponManager;
