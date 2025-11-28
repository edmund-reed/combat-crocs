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

    const body = PhysicsManager.createProjectileBody(
      scene,
      player.x + Math.cos(angle) * spawnDistance,
      player.y + Math.sin(angle) * spawnDistance,
      weaponType,
    );

    const projectile = scene.add.graphics({ x: body.position.x, y: body.position.y });
    projectile.fillStyle(0xff0000).fillCircle(0, 0, 5);

    body.projectileOwner = player.id;
    body.projectileGraphics = projectile;

    PhysicsManager.applyProjectileVelocity(scene, body, angle, power);
    InputManager.addProjectileTrail(scene, body);

    const weaponConfig = Config.WEAPON_CONFIGS[weaponType];
    const { behaviorFlags } = weaponConfig;

    if (behaviorFlags.includes("timerExplosion")) {
      this.setupTimerExplosionCollision(scene, body, weaponConfig, weaponType);
    } else if (behaviorFlags.includes("explodesOnImpact")) {
      this.setupProjectileCollision(scene, body, projectile, weaponType);
    }

    return { body, projectile };
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

  // Setup collision detection for projectiles that explode on impact
  static setupProjectileCollision = (scene, projectileBody, projectileGraphics, weaponType) => {
    let hasHit = false;

    scene.matter.world.on("collisionstart", event => {
      if (projectileBody.destroyed || hasHit) return;

      const collision = event.pairs.find(pair => pair.bodyA === projectileBody || pair.bodyB === projectileBody);

      if (!collision) return;

      console.log("💥 Projectile collision!");
      hasHit = true;

      const { x: explosionX, y: explosionY } = PhysicsManager.calculateExplosionPosition(projectileBody);
      ExplosionSystem.createExplosion(scene, explosionX, explosionY, projectileBody.projectileOwner, weaponType);

      scene.matter.world.remove(projectileBody);
      projectileGraphics?.destroy?.();
      projectileBody.debugOutline?.destroy?.();
      scene.endProjectileTurn();
    });
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
