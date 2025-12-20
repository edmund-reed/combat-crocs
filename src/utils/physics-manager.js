import { Config } from "@config";
import { ExplosionPhysics } from "@weapons";

class PhysicsManager {
  static ExplosionPhysics = ExplosionPhysics;
  static CATEGORIES = { TERRAIN: 1, PLAYERS: 2, PROJECTILES: 4, HEALTH_PACKS: 8 };
  static CONFIG = {
    GRAVITY: 1,
    FRICTION: { PLAYER: 1.0, PROJECTILE: 0.1, TERRAIN: 1.0 },
    RESTITUTION: { PLAYER: 0.1, PROJECTILE: 0.8 },
    DENSITY: { PLAYER: 0.01 },
    EXPLOSION_OFFSET: 50,
  };

  static initializePhysics = scene => {
    scene.matter.world.setBounds(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);
    scene.matter.world.setGravity(0, Config.GRAVITY);

    // Optimize physics engine for accurate collision detection
    const engine = scene.matter.world.engine;

    // Increase iterations for better collision resolution
    engine.positionIterations = 10; // Increased from 8 (default 6)
    engine.velocityIterations = 8; // Increased from 6 (default 4)
    engine.constraintIterations = 4; // Better constraint solving (default 2)

    // Disable collision slop to prevent any penetration tolerance
    // Slop allows small penetrations for performance - we want zero
    engine.slop = 0; // Default is 0.05

    ["collisionstart", "collisionend"].forEach((event, delta) =>
      scene.matter.world.on(event, e =>
        e.pairs.forEach(({ bodyA, bodyB }) => {
          this.#handleGroundContact(scene, bodyA, bodyB, delta ? -1 : 1);
          this.#handleGroundContact(scene, bodyB, bodyA, delta ? -1 : 1);
        }),
      ),
    );
  };

  static #handleGroundContact(scene, maybePlayerBody, maybeTerrainBody, delta) {
    if (!maybePlayerBody || !maybeTerrainBody) return;

    if (
      maybePlayerBody.collisionFilter?.category !== this.CATEGORIES.PLAYERS ||
      maybeTerrainBody.collisionFilter?.category !== this.CATEGORIES.TERRAIN
    ) {
      return;
    }

    const player = scene.players?.find(p => p.body === maybePlayerBody);
    if (!player) return;

    player.groundContacts = Math.max(0, (player.groundContacts || 0) + delta);
    if (player.groundContacts > 0) player.jumpLocked = false;
  }

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

    // Increased radius from 5px to 8px - larger projectiles are harder to tunnel through gaps
    const body = scene.matter.add.circle(x, y, 8, {
      friction: this.CONFIG.FRICTION.PROJECTILE,
      restitution,
      isSensor: false, // Not a sensor - solid collision
      isSleeping: false, // Never sleep - always check collisions
      sleepThreshold: Infinity, // Prevent sleeping entirely
      collisionFilter: {
        group: 0,
        mask: this.CATEGORIES.TERRAIN | this.CATEGORIES.PLAYERS,
        category: this.CATEGORIES.PROJECTILES,
      },
    });

    // Mark as high-speed projectile for better collision detection
    body.isProjectile = true;

    return body;
  };

  static createTerrainBody = (scene, x, y, width, height) => {
    const body = scene.matter.add.rectangle(x, y, width, height, {
      isStatic: true,
      friction: this.CONFIG.FRICTION.TERRAIN,
      frictionStatic: this.CONFIG.FRICTION.TERRAIN,
      collisionFilter: { category: this.CATEGORIES.TERRAIN },
    });

    // Tag for explosion LOS raycasts
    body.isTerrain = true;
    body.terrainName = "Terrain";

    return body;
  };

  // Set projectile velocity and apply physics
  static applyProjectileVelocity = (scene, projectileBody, angle, power) => {
    scene.matter.body.setVelocity(projectileBody, {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    });
  };

  // Delegate to existing ExplosionPhysics for terrain blocking
  static isExplosionBlocked = (explosionX, explosionY, playerX, playerY, scene) =>
    ExplosionPhysics.isExplosionBlockedByTerrain(explosionX, explosionY, playerX, playerY, scene);

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

  static updateRotatingTerrain = scene => {
    // Drive any kinematic rotating terrain bodies (e.g. donut)
    const MatterBody = Phaser.Physics.Matter.Matter.Body;
    scene.matter.world.getAllBodies().forEach(body => {
      if (body?.isKinematicSpinner) {
        // Scale down rotation speed to make values more intuitive (0.2 = slow, 1.0 = fast)
        const scaledAngularVelocity = (body.spinnerAngularVelocity || 0) * 0.1;
        MatterBody.setAngularVelocity(body, scaledAngularVelocity);
      }
    });
  };

  static updateWeaponProjectiles = scene => {
    const MAX_VELOCITY = 50; // Cap max velocity to prevent tunneling
    const MatterBody = Phaser.Physics.Matter.Matter.Body;

    scene.matter.world.getAllBodies().forEach(body => {
      if (!body.projectileGraphics || body.destroyed) return;

      // Cap velocity to prevent tunneling through thin terrain
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      if (speed > MAX_VELOCITY) {
        const scale = MAX_VELOCITY / speed;
        MatterBody.setVelocity(body, {
          x: body.velocity.x * scale,
          y: body.velocity.y * scale,
        });
      }

      body.projectileGraphics.setPosition(body.position.x, body.position.y);

      if (body.weaponConfig?.hasPhysicsRotation) {
        const rotationSpeed = speed * 0.01;
        body.projectileGraphics.rotation += rotationSpeed * (body.velocity.x < 0 ? -1 : 1);
      } else {
        body.projectileGraphics.setRotation(body.angle);
      }

      body.debugOutline?.setPosition(body.position.x, body.position.y);
    });
  };

  static updatePhysicsBodies = scene => {
    this.updateRotatingTerrain(scene);
    this.updateWeaponProjectiles(scene);
  };
}

export default PhysicsManager;
