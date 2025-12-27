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
   * Fast physics simulation to predict where projectile will land
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
      });
    }

    // Create ghost body for simulation (isSensor = doesn't collide with players)
    const tempBody = scene.matter.add.circle(startX, startY, 8, {
      isSensor: true,
      friction: 0.1,
      restitution: 0.1,
      mass: mass,
    });

    // Set initial velocity
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    scene.matter.body.setVelocity(tempBody, { x: vx, y: vy });

    // Simulate physics steps until collision
    const bodies = scene.matter.world.localWorld.bodies;
    let lastValidPos = { x: tempBody.position.x, y: tempBody.position.y };

    for (let steps = 0; steps < 300; steps++) {
      // Store position BEFORE stepping (critical for offset calculation)
      lastValidPos = { x: tempBody.position.x, y: tempBody.position.y };

      // Step physics forward
      scene.matter.world.step(1000 / 60);

      // Check terrain collision AFTER step (use point query like old code)
      const collisions = Phaser.Physics.Matter.Matter.Query.point(bodies, {
        x: tempBody.position.x,
        y: tempBody.position.y,
      });

      if (collisions.find(c => c.isTerrain)) {
        // CRITICAL: Apply 50px explosion offset (matches PhysicsManager.calculateExplosionPosition)
        const explosionPos = { x: lastValidPos.x, y: lastValidPos.y };
        const vel = tempBody.velocity;

        if (vel.x || vel.y) {
          const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
          if (speed > 0) {
            const offset = 50; // Match PhysicsManager.CONFIG.EXPLOSION_OFFSET
            explosionPos.x -= (vel.x / speed) * offset;
            explosionPos.y -= (vel.y / speed) * offset;
          }
        }

        scene.matter.world.remove(tempBody);

        // Clamp to game boundaries
        const gameWidth = scene.game.config.width;
        const gameHeight = scene.game.config.height;
        explosionPos.x = Math.max(0, Math.min(gameWidth, explosionPos.x));
        explosionPos.y = Math.max(0, Math.min(gameHeight, explosionPos.y));

        return explosionPos;
      }

      // Check out of bounds
      if (tempBody.position.y > scene.game.config.height + 100) {
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
        scene.matter.world.remove(tempBody);
        return lastValidPos;
      }
    }

    // Timeout fallback
    scene.matter.world.remove(tempBody);
    return lastValidPos;
  }
}

export default InstantShotResolver;
