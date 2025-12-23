// Instant Shot Resolver for AI Training
// Simulates projectile physics without rendering for massive speed boost

import { Config } from "@config";
import PhysicsManager from "@utils/physics-manager.js";
import ExplosionSystem from "./explosion-system.js";

class InstantShotResolver {
  /**
   * Instantly resolve a bazooka shot by simulating physics
   * Returns landing position without creating actual projectile
   */
  static resolveBazookaShot(scene, player, targetX, targetY) {
    const config = Config.WEAPON_CONFIGS.BAZOOKA;

    // Calculate firing angle
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const velocity = config.initialVelocity || 15;

    // Simulate projectile physics
    const landingPos = this.simulateProjectilePhysics(
      scene,
      player.x,
      player.y,
      angle,
      velocity,
      config.mass || 1,
    );

    // Immediately trigger explosion at landing position
    ExplosionSystem.createExplosion(scene, landingPos.x, landingPos.y, player.id, "BAZOOKA");

    return landingPos;
  }

  /**
   * Fast physics simulation to predict where projectile will land
   */
  static simulateProjectilePhysics(scene, startX, startY, angle, velocity, mass) {
    // Create temporary ghost body for simulation
    const tempBody = scene.matter.add.circle(startX, startY, 8, {
      isSensor: true, // Ghost - doesn't affect real world
      friction: 0.1,
      restitution: 0.1,
      mass: mass,
    });

    // Set initial velocity
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    scene.matter.body.setVelocity(tempBody, { x: vx, y: vy });

    // Simulate physics steps until collision
    let steps = 0;
    const maxSteps = 300; // Safety limit (~5 seconds of physics)
    const bodies = scene.matter.world.localWorld.bodies;

    while (steps < maxSteps) {
      // Step physics forward by one frame
      scene.matter.world.step(1000 / 60); // 60 FPS

      // Check for terrain collision
      const collisions = Phaser.Physics.Matter.Matter.Query.point(bodies, {
        x: tempBody.position.x,
        y: tempBody.position.y,
      });

      const terrainHit = collisions.find(c => c.isTerrain);
      if (terrainHit) {
        const landingPos = { x: tempBody.position.x, y: tempBody.position.y };
        scene.matter.world.remove(tempBody);
        return landingPos;
      }

      // Check if out of bounds (fell off map)
      if (tempBody.position.y > scene.game.config.height + 100) {
        const landingPos = { x: tempBody.position.x, y: scene.game.config.height };
        scene.matter.world.remove(tempBody);
        return landingPos;
      }

      // Check if velocity is nearly zero (resting)
      const speed = Math.sqrt(
        tempBody.velocity.x * tempBody.velocity.x + tempBody.velocity.y * tempBody.velocity.y,
      );
      if (speed < 0.1 && steps > 10) {
        const landingPos = { x: tempBody.position.x, y: tempBody.position.y };
        scene.matter.world.remove(tempBody);
        return landingPos;
      }

      steps++;
    }

    // Fallback: timeout, use current position
    const fallbackPos = { x: tempBody.position.x, y: tempBody.position.y };
    scene.matter.world.remove(tempBody);
    return fallbackPos;
  }
}

export default InstantShotResolver;
