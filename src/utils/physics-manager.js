// Centralized Physics Manager for Combat Crocs
// Single source of truth for all physics behavior and collision handling

import { Config } from "@config";
import { ExplosionPhysics } from "@weapons";

class PhysicsManager {
  static CATEGORIES = { TERRAIN: 1, PLAYERS: 2, PROJECTILES: 4 };
  static CONFIG = {
    GRAVITY: 1,
    FRICTION: { PLAYER: 0.1, PROJECTILE: 0.1, TERRAIN: 1.0 },
    RESTITUTION: { PLAYER: 0.1, PROJECTILE: 0.8 },
    DENSITY: { PLAYER: 0.01 },
    EXPLOSION_OFFSET: 50,
  };

  static initializePhysics = scene => {
    scene.matter.world.setBounds(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);
    scene.matter.world.setGravity(0, Config.GRAVITY); // Direct use of final gravity value
  };

  static createPlayerBody = (scene, x, y) =>
    scene.matter.add.rectangle(x, y, 30, 20, {
      friction: this.CONFIG.FRICTION.PLAYER,
      restitution: this.CONFIG.RESTITUTION.PLAYER,
      density: this.CONFIG.DENSITY.PLAYER,
      collisionFilter: {
        group: 0,
        mask: this.CATEGORIES.TERRAIN,
        category: this.CATEGORIES.PLAYERS,
      },
    });

  static createProjectileBody = (scene, x, y, weaponType = "BAZOOKA") => {
    const restitution = Config.WEAPON_CONFIGS[weaponType].behaviorFlags.includes("bounces")
      ? this.CONFIG.RESTITUTION.PROJECTILE
      : 0.1;

    return scene.matter.add.circle(x, y, 5, {
      friction: this.CONFIG.FRICTION.PROJECTILE,
      restitution,
      collisionFilter: {
        group: 0,
        mask: this.CATEGORIES.TERRAIN | this.CATEGORIES.PLAYERS,
        category: this.CATEGORIES.PROJECTILES,
      },
    });
  };

  static createTerrainBody = (scene, x, y, width, height) =>
    scene.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      friction: this.CONFIG.FRICTION.TERRAIN,
      frictionStatic: this.CONFIG.FRICTION.TERRAIN,
      collisionFilter: { category: this.CATEGORIES.TERRAIN },
    });

  // Set projectile velocity and apply physics
  static applyProjectileVelocity = (scene, projectileBody, angle, power) => {
    scene.matter.body.setVelocity(projectileBody, {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    });
  };

  // Delegate to existing ExplosionPhysics for terrain blocking
  static isExplosionBlocked = (explosionX, explosionY, playerX, playerY, platforms) =>
    ExplosionPhysics.isExplosionBlockedByTerrain(explosionX, explosionY, playerX, playerY, platforms);

  // Calculate explosion position on terrain surface (opposite to travel direction)
  static calculateExplosionPosition = body => {
    const { position, velocity } = body;
    let { x, y } = position;

    if (velocity.x || velocity.y) {
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      if (speed > 0) {
        const offset = this.CONFIG.EXPLOSION_OFFSET;
        x -= (velocity.x / speed) * offset;
        y -= (velocity.y / speed) * offset;
      }
    }

    return { x, y };
  };
}

export default PhysicsManager;
