// Instant Shot Resolver for AI Training
// Simulates projectile physics without rendering for massive speed boost

import { Config } from "@config";
import PhysicsManager from "@utils/physics-manager.js";
import ExplosionSystem from "./explosion-system.js";

class InstantShotResolver {
  /**
   * Instantly resolve a bazooka shot by simulating physics
   * Returns landing position without creating actual projectile
   * @param {boolean} noDamage - If true, explosion won't deal damage (for verification)
   */
  static resolveBazookaShot(scene, player, targetX, targetY, noDamage = false) {
    const config = Config.WEAPON_CONFIGS.BAZOOKA;

    // Calculate firing angle
    const angle = Math.atan2(targetY - player.y, targetX - player.x);

    // CRITICAL: Match real projectile velocity (20, not 15!)
    const velocity = 20;

    // CRITICAL: Match real projectile spawn offset (8px from player center)
    const spawnDistance = 8;
    const startX = player.x + Math.cos(angle) * spawnDistance;
    const startY = player.y + Math.sin(angle) * spawnDistance;

    // Simulate projectile physics from SAME starting position as real projectile
    const landingPos = this.simulateProjectilePhysics(
      scene,
      startX,
      startY,
      angle,
      velocity,
      config.mass || 1,
    );

    // Immediately trigger explosion at landing position
    ExplosionSystem.createExplosion(scene, landingPos.x, landingPos.y, player.id, "BAZOOKA", noDamage);

    return landingPos;
  }

  /**
   * Resolve bazooka shot using angle directly (for look-ahead)
   * Avoids angle recalculation to prevent floating-point errors
   * @param {number} angle - Firing angle in radians
   * @param {boolean} noDamage - If true, explosion won't deal damage
   */
  static resolveBazookaFromAngle(scene, player, angle, noDamage = false) {
    const config = Config.WEAPON_CONFIGS.BAZOOKA;

    // CRITICAL: Match real projectile velocity and spawn offset
    const velocity = 20;
    const spawnDistance = 8;
    const startX = player.x + Math.cos(angle) * spawnDistance;
    const startY = player.y + Math.sin(angle) * spawnDistance;

    // Simulate projectile physics
    const landingPos = this.simulateProjectilePhysics(
      scene,
      startX,
      startY,
      angle,
      velocity,
      config.mass || 1,
    );

    // Trigger explosion at landing position
    ExplosionSystem.createExplosion(scene, landingPos.x, landingPos.y, player.id, "BAZOOKA", noDamage);

    return landingPos;
  }

  /**
   * Fast physics simulation to predict where projectile will land
   * USES SOLID BODY + COLLISION EVENTS (matches real projectile exactly)
   */
  static simulateProjectilePhysics(scene, startX, startY, angle, velocity, mass) {
    // DEBUG: Log all physics parameters
    if (window.__TRAINING_MODE__) {
      const worldGravity = scene.matter.world.engine.gravity;
      console.log(`[INSTANT-SHOT] Physics params:`, {
        startPos: `(${startX.toFixed(1)}, ${startY.toFixed(1)})`,
        angle: angle.toFixed(3),
        velocity: velocity,
        mass: mass,
        radius: 8,
        friction: 0.1,
        restitution: 0.1,
        worldGravity: `(${worldGravity.x}, ${worldGravity.y})`,
        timestep: `${1000 / 60}ms`,
        collisionMode: "SOLID_BODY",
      });
    }

    // CRITICAL: Use SOLID body (isSensor: false) to match real projectile
    // This ensures identical collision behavior with both terrain AND decorations
    const tempBody = scene.matter.add.circle(startX, startY, 8, {
      isSensor: false, // SOLID collision (matches real projectile)
      friction: 0.1,
      restitution: 0.1,
      mass: mass,
      isSleeping: false,
      sleepThreshold: Infinity,
      collisionFilter: {
        group: 0,
        mask: 1, // Only collide with terrain (category 1)
        category: 4, // Projectile category
      },
    });

    // Mark as simulation body (not a real projectile)
    tempBody.isSimulation = true;

    // Track collision
    let terrainCollisionDetected = false;
    let collisionPosition = null;
    let collisionVelocity = null;

    // Set up collision listener
    const collisionHandler = event => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;

        // Check if our simulation body hit terrain
        if (bodyA === tempBody || bodyB === tempBody) {
          const otherBody = bodyA === tempBody ? bodyB : bodyA;

          if (otherBody.isTerrain) {
            terrainCollisionDetected = true;
            collisionPosition = { x: tempBody.position.x, y: tempBody.position.y };
            collisionVelocity = { x: tempBody.velocity.x, y: tempBody.velocity.y };
          }
        }
      });
    };

    scene.matter.world.on("collisionstart", collisionHandler);

    // Set initial velocity
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    scene.matter.body.setVelocity(tempBody, { x: vx, y: vy });

    // Simulate physics steps until collision
    let lastValidPos = { x: tempBody.position.x, y: tempBody.position.y };

    for (let steps = 0; steps < 300; steps++) {
      // Check if collision was detected
      if (terrainCollisionDetected) {
        // CRITICAL: Apply 50px explosion offset (matches PhysicsManager.calculateExplosionPosition)
        const explosionPos = { x: collisionPosition.x, y: collisionPosition.y };
        const vel = collisionVelocity;

        if (vel.x || vel.y) {
          const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
          if (speed > 0) {
            const offset = 50; // Match PhysicsManager.CONFIG.EXPLOSION_OFFSET
            explosionPos.x -= (vel.x / speed) * offset;
            explosionPos.y -= (vel.y / speed) * offset;
          }
        }

        // Clean up
        scene.matter.world.off("collisionstart", collisionHandler);
        scene.matter.world.remove(tempBody);

        // Clamp to game boundaries
        const gameWidth = scene.game.config.width;
        const gameHeight = scene.game.config.height;
        explosionPos.x = Math.max(0, Math.min(gameWidth, explosionPos.x));
        explosionPos.y = Math.max(0, Math.min(gameHeight, explosionPos.y));

        return explosionPos;
      }

      // Store position BEFORE stepping
      lastValidPos = { x: tempBody.position.x, y: tempBody.position.y };

      // Step physics forward
      scene.matter.world.step(1000 / 60);

      // Check out of bounds
      if (tempBody.position.y > scene.game.config.height + 100) {
        // Clean up
        scene.matter.world.off("collisionstart", collisionHandler);
        scene.matter.world.remove(tempBody);

        // Clamp to boundaries
        const gameWidth = scene.game.config.width;
        const gameHeight = scene.game.config.height;
        lastValidPos.x = Math.max(0, Math.min(gameWidth, lastValidPos.x));
        lastValidPos.y = Math.max(0, Math.min(gameHeight, lastValidPos.y));

        return lastValidPos;
      }

      // Check if velocity near zero
      const speed = Math.sqrt(tempBody.velocity.x ** 2 + tempBody.velocity.y ** 2);
      if (speed < 0.1 && steps > 10) {
        // Clean up
        scene.matter.world.off("collisionstart", collisionHandler);
        scene.matter.world.remove(tempBody);
        return lastValidPos;
      }
    }

    // Timeout fallback - clean up
    scene.matter.world.off("collisionstart", collisionHandler);
    scene.matter.world.remove(tempBody);
    return lastValidPos;
  }
}

export default InstantShotResolver;
