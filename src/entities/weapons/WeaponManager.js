// Weapon utilities for Combat Crocs

class WeaponManager {
  static instance = null;

  constructor(scene) {
    this.scene = scene;
  }

  static getInstance(scene) {
    if (!WeaponManager.instance) {
      WeaponManager.instance = new WeaponManager(scene);
    }
    return WeaponManager.instance;
  }

  // Create and fire a weapon
  fireProjectile(player, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      targetX,
      targetY
    );
    const power = 25;

    const velocity = {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    };

    // Create physics body first
    const body = this.scene.matter.add.circle(
      player.x + Math.cos(angle) * 40,
      player.y + Math.sin(angle) * 40,
      5,
      {
        friction: 0.1,
        restitution: 0.8,
      }
    );

    // Create projectile graphics
    const projectile = this.scene.add.graphics({
      x: body.position.x,
      y: body.position.y,
    });
    projectile.fillStyle(0xff0000);
    projectile.fillCircle(0, 0, 5);

    // Add manual debug outline (green circle)
    const debugOutline = this.scene.add.graphics({
      x: body.position.x,
      y: body.position.y,
    });
    debugOutline.lineStyle(2, 0x00ff00); // Green outline
    debugOutline.strokeCircle(0, 0, 5);

    body.projectileOwner = player.id;

    // Set velocity using Matter.js method (not the body method that doesn't exist)
    this.scene.matter.body.setVelocity(body, velocity);

    // Add trail effect
    this.addProjectileTrail(body);

    // Handle collisions
    this.setupProjectileCollision(body, projectile);

    // Store references for position updating and cleanup
    body.projectileGraphics = projectile;
    body.debugOutline = debugOutline;

    // Auto-cleanup timeout (if projectile doesn't hit anything)
    setTimeout(() => {
      if (!body.destroyed && body.world) {
        this.scene.matter.world.remove(body);
        projectile.destroy();
        debugOutline.destroy();
        this.scene.endProjectileTurn();
      }
    }, 5000);

    // Return the created objects for cleanup tracking
    return { body, projectile };
  }

  // Add visual trail to projectile
  addProjectileTrail(projectileBody) {
    this.scene.time.addEvent({
      delay: 100,
      repeat: 10,
      callback: () => {
        if (!projectileBody.destroyed) {
          const trail = this.scene.add.graphics({
            x: projectileBody.position.x,
            y: projectileBody.position.y,
          });
          trail.fillStyle(0xff4500);
          trail.fillCircle(0, 0, 2);
          this.scene.tweens.add({
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
  setupProjectileCollision(projectileBody, projectileGraphics) {
    let hasHit = false;

    this.scene.matter.world.on("collisionstart", (event) => {
      if (!projectileBody.destroyed && !hasHit) {
        event.pairs.forEach((pair) => {
          // Check if this collision involves our projectile
          if (pair.bodyA === projectileBody || pair.bodyB === projectileBody) {
            hasHit = true;

            // Get current weapon to determine explosion properties
            const weapon = WeaponManager.getCurrentWeapon();
            ExplosionManager.getInstance(this.scene).createExplosion(
              projectileBody.position.x,
              projectileBody.position.y,
              projectileBody.projectileOwner,
              weapon
            );
            this.scene.matter.world.remove(projectileBody);
            projectileGraphics.destroy();
            if (projectileBody.debugOutline) {
              projectileBody.debugOutline.destroy();
            }
            // Call endProjectileTurn to advance to next player
            this.scene.endProjectileTurn();
          }
        });
      }
    });
  }

  // Helper: check if two Y ranges overlap
  static yOverlap(y1a, y1b, y2a, y2b) {
    return Math.max(y1a, y2a) < Math.min(y1b, y2b);
  }

  // Track the currently selected weapon
  static getCurrentWeapon() {
    // For now return BAZOOKA, but this can be made dynamic
    return "BAZOOKA";
  }

  // Get weapon definition for current weapon
  static getCurrentWeaponDefinition() {
    const weapon = WeaponManager.getCurrentWeapon();
    return WEAPON_DEFINITIONS[weapon];
  }

  // Backward compatibility: static method that GameScene calls
  static createProjectile(scene, player, targetX, targetY) {
    // Use the instance method
    const instance = WeaponManager.getInstance(scene);
    return instance.fireProjectile(player, targetX, targetY);
  }
}

window.WeaponManager = WeaponManager;
