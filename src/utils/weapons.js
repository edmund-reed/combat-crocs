// Weapon utilities for Combat Crocs

class WeaponManager {
  // Weapon dispatch system
  static fireWeapon = (scene, player, targetX, targetY, weaponType) => {
    const weaponMethods = {
      BAZOOKA: (scene, player, targetX, targetY) => this.createProjectile(scene, player, targetX, targetY, weaponType),
      GRENADE: (scene, player, targetX, targetY) => this.createProjectile(scene, player, targetX, targetY, weaponType),
      SHOTGUN: (scene, player, targetX, targetY) => HitscanWeapon.createShotgunHitscan(scene, player, targetX, targetY),
    };

    const method = weaponMethods[weaponType];
    if (method) return method(scene, player, targetX, targetY);
    console.error(`❌ No method for weapon: ${weaponType}`);
    return null;
  };

  // Create and fire a weapon
  static createProjectile = (scene, player, targetX, targetY, weaponType = "BAZOOKA") => {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
    const power = 25;
    const spawnDistance = 8;

    const body = scene.matter.add.circle(
      player.x + Math.cos(angle) * spawnDistance,
      player.y + Math.sin(angle) * spawnDistance,
      5,
      { friction: 0.1, restitution: 0.8 },
    );

    const projectile = scene.add.graphics({ x: body.position.x, y: body.position.y });
    projectile.fillStyle(0xff0000).fillCircle(0, 0, 5);

    body.projectileOwner = player.id;

    scene.matter.body.setVelocity(body, {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    });

    InputManager.addProjectileTrail(scene, body);

    const weaponConfig = Config.WEAPON_CONFIGS[weaponType];
    const { behaviorFlags } = weaponConfig;

    if (behaviorFlags.includes("timerExplosion")) {
      this.setupTimerExplosionCollision(scene, body, weaponConfig, weaponType);
    } else if (behaviorFlags.includes("explodesOnImpact")) {
      this.setupProjectileCollision(scene, body, projectile, weaponType);
    }

    if (behaviorFlags.includes("bounces")) body.restitution = 0.8;
    body.projectileGraphics = projectile;

    return { body, projectile };
  };

  // Calculate explosion position offset from projectile
  static calculateExplosionPosition = body => {
    const { position, velocity } = body;
    let { x, y } = position;

    if (velocity.x || velocity.y) {
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      if (speed > 0) {
        const offset = 50;
        x -= (velocity.x / speed) * offset;
        y -= (velocity.y / speed) * offset;
      }
    }

    return { x, y };
  };

  // Handle collision cleanup and explosion
  static handleCollisionCleanup = (scene, projectileBody, projectileGraphics, weaponType) => {
    const { x: explosionX, y: explosionY } = this.calculateExplosionPosition(projectileBody);

    ExplosionSystem.createExplosion(scene, explosionX, explosionY, projectileBody.projectileOwner, weaponType);
    scene.matter.world.remove(projectileBody);
    projectileGraphics?.destroy?.();
    projectileBody.debugOutline?.destroy?.();
    scene.endProjectileTurn();
  };

  // Check if projectile is involved in collision
  static isProjectileInvolved = ({ bodyA, bodyB }, projectileBody) =>
    bodyA === projectileBody || bodyB === projectileBody;

  // Setup collision detection for projectiles
  static setupProjectileCollision = (scene, projectileBody, projectileGraphics, weaponType) => {
    let hasHit = false;

    scene.matter.world.on("collisionstart", event => {
      if (projectileBody.destroyed || hasHit) return;

      const collision = event.pairs.find(pair => this.isProjectileInvolved(pair, projectileBody));
      if (!collision) return;

      console.log("💥 Projectile collision!");
      hasHit = true;
      this.handleCollisionCleanup(scene, projectileBody, projectileGraphics, weaponType);
    });
  };

  // Generic timer explosion collision (replaces grenade-specific logic)
  static setupTimerExplosionCollision = (scene, projectileBody, weaponConfig, weaponType) => {
    Object.assign(projectileBody, { weaponConfig, weaponType });
    const delayMs = weaponConfig.delay || 3000;
    projectileBody.timerId = setTimeout(() => this.detonateProjectile(scene, projectileBody), delayMs);
    MemoryManager.registerCleanup(scene, projectileBody.timerId, "timeouts");
  };

  // Projectile detonation for timer-based weapons (grenades)
  static detonateProjectile = (scene, projectileBody) => {
    if (projectileBody.destroyed) return;

    console.log("💥 Timer detonation");
    const weaponType = projectileBody.weaponType || "GRENADE";
    const { position } = projectileBody;

    ExplosionSystem.createExplosion(scene, position.x, position.y, projectileBody.projectileOwner, weaponType);
    this._cleanupProjectile(scene, projectileBody);
    scene.endProjectileTurn();
  };

  // Shared projectile cleanup logic
  static _cleanupProjectile = (scene, projectileBody) => {
    scene.matter.world.remove(projectileBody);
    projectileBody.projectileGraphics?.destroy?.();
    projectileBody.debugOutline?.destroy?.();
  };

  static getCurrentWeapon = () => "BAZOOKA";
}

window.WeaponManager = WeaponManager;
