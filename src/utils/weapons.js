import { Config } from "@config";
import { HitscanWeapon, ExplosionSystem } from "@weapons";
import { InputManager, StateManager, Logger, PhysicsManager } from "@utils";

class WeaponManager {
  static fireWeapon = (scene, player, targetX, targetY, weaponType) => {
    const config = Config.WEAPON_CONFIGS[weaponType];
    if (!config) {
      Logger.error(`Unknown weapon type: ${weaponType}`);
      return null;
    }

    return config.behaviorFlags.includes("hitscan")
      ? HitscanWeapon.createShotgunHitscan(scene, player, targetX, targetY)
      : this.createProjectile(scene, player, targetX, targetY, weaponType);
  };

  static createProjectile = (scene, player, targetX, targetY, weaponType = "BAZOOKA") => {
    const config = Config.WEAPON_CONFIGS[weaponType];
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
    const spawnDistance = 8;

    const body = PhysicsManager.createProjectileBody(
      scene,
      player.x + Math.cos(angle) * spawnDistance,
      player.y + Math.sin(angle) * spawnDistance,
      weaponType,
    );

    // Property-based rendering
    const projectile =
      config.renderType === "sprite"
        ? scene.add.sprite(body.position.x, body.position.y, config.spriteKey).setScale(config.spriteScale)
        : scene.add.graphics({ x: body.position.x, y: body.position.y }).fillStyle(0xff0000).fillCircle(0, 0, 5);

    // Hide held weapon sprite only for thrown weapons (grenade)
    if (config.hasHeldSprite && config.projectileUsesHeldSprite) {
      player.weaponSprite?.setVisible(false);
    }

    Object.assign(body, { projectileOwner: player.id, projectileGraphics: projectile, weaponConfig: config });

    PhysicsManager.applyProjectileVelocity(scene, body, angle, 25);
    InputManager.addProjectileTrail(scene, body);

    const { behaviorFlags } = Config.WEAPON_CONFIGS[weaponType];

    if (behaviorFlags.includes("timerExplosion")) {
      this.setupTimerExplosionCollision(scene, body, Config.WEAPON_CONFIGS[weaponType], weaponType);
    } else if (behaviorFlags.includes("explodesOnImpact")) {
      this.setupProjectileCollision(scene, body, projectile, weaponType);
    }

    return { body, projectile };
  };

  static setupTimerExplosionCollision = (scene, projectileBody, weaponConfig, weaponType) => {
    Object.assign(projectileBody, { weaponConfig, weaponType });
    projectileBody.timerId = setTimeout(
      () => this.detonateProjectile(scene, projectileBody),
      weaponConfig.delay || 3000,
    );
    StateManager.registerCleanup(scene, projectileBody.timerId, "timeouts");
  };

  static detonateProjectile = (scene, projectileBody) => {
    if (projectileBody.destroyed) return;
    Logger.weaponEvent("Timer detonation");
    ExplosionSystem.createExplosion(
      scene,
      projectileBody.position.x,
      projectileBody.position.y,
      projectileBody.projectileOwner,
      projectileBody.weaponType,
    );
    this._cleanupProjectile(scene, projectileBody);
    scene.endProjectileTurn();
  };

  static setupProjectileCollision = (scene, projectileBody, projectileGraphics, weaponType) => {
    let hasHit = false;
    scene.matter.world.on("collisionstart", event => {
      if (projectileBody.destroyed || hasHit) return;
      const collision = event.pairs.find(pair => pair.bodyA === projectileBody || pair.bodyB === projectileBody);
      if (!collision) return;

      Logger.weaponEvent("Projectile collision!");
      hasHit = true;
      const { x, y } = PhysicsManager.calculateExplosionPosition(projectileBody);
      ExplosionSystem.createExplosion(scene, x, y, projectileBody.projectileOwner, weaponType);
      scene.matter.world.remove(projectileBody);
      projectileGraphics?.destroy?.();
      projectileBody.debugOutline?.destroy?.();
      scene.endProjectileTurn();
    });
  };

  static _cleanupProjectile = (scene, projectileBody) => {
    scene.matter.world.remove(projectileBody);
    projectileBody.projectileGraphics?.destroy?.();
    projectileBody.debugOutline?.destroy?.();
  };

  static getCurrentWeapon = () => "BAZOOKA";
}

export default WeaponManager;
