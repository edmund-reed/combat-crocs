/**
 * ExplosionRenderer.js - Visual explosion effects and graphics
 * Handles particle effects, screen shake, and visual feedback for explosions
 */

class ExplosionRenderer {
  constructor(scene) {
    this.scene = scene;
    console.log("💥 ExplosionRenderer initialized - handling visual effects");
  }

  /**
   * Create visual explosion effect at location
   */
  createExplosionEffect(x, y, projectileOwner = null) {
    console.log(
      `ACTUAL EXPLOSION EFFECT at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      }`
    );

    // Animated explosion graphics
    const explosion = this.scene.add.graphics({ x: x, y: y });
    explosion.fillStyle(0xff4500); // Orange-red explosion color
    explosion.fillCircle(0, 0, 200); // Full radius for visual effect

    // Animate the explosion outward then inward
    this.scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300, // 0.3 seconds
      onComplete: () => explosion.destroy(),
    });

    // Screen shake for impact feedback
    this.scene.cameras.main.shake(200, 0.02); // Subtle shake

    return projectileOwner;
  }

  /**
   * Create particle explosion effect (future enhancement)
   */
  createParticleExplosion(x, y, radius = 200, particleCount = 20) {
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics({ x: x, y: y });

      // Random particle properties
      const particleSize = Math.random() * 8 + 4;
      const particleColor = Math.random() > 0.5 ? 0xff4500 : 0xffaa00;

      particle.fillStyle(particleColor);
      particle.fillCircle(0, 0, particleSize);

      // Random direction and speed
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 300 + 100;
      const distance = radius * Math.random();

      // Animate particle outward
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        scaleX: 0,
        scaleY: 0,
        duration: 800,
        onComplete: () => particle.destroy(),
      });

      particles.push(particle);
    }

    // Additional screen shake for particle explosions
    this.scene.cameras.main.shake(150, 0.015);

    return particles;
  }

  /**
   * Create muzzle flash effect for weapons
   */
  createMuzzleFlash(x, y, angle, weaponType = "bazooka") {
    // Different flash effects based on weapon
    const flashSize = weaponType === "shotgun" ? 15 : 10;

    const flash = this.scene.add.graphics({ x: x, y: y });
    flash.fillStyle(0xffff00); // Yellow flash
    flash.fillCircle(0, 0, flashSize);

    // Expand and fade
    this.scene.tweens.add({
      targets: flash,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    return flash;
  }

  /**
   * Create hit effect for projectiles
   */
  createHitEffect(x, y, isTerrainHit = false) {
    const hit = this.scene.add.graphics({ x: x, y: y });

    // Different colors for terrain vs player hits
    const hitColor = isTerrainHit ? 0x8b4513 : 0xff0000; // Brown vs red
    const hitSize = 12;

    // Small expanding circle
    hit.fillStyle(hitColor);
    hit.fillCircle(0, 0, hitSize);

    this.scene.tweens.add({
      targets: hit,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => hit.destroy(),
    });

    return hit;
  }

  /**
   * Create destruction effect for terrain/objects
   */
  createTerrainDestruction(x, y, radius = 50) {
    // Debris particles
    const debrisCount = Math.floor(Math.random() * 8) + 5;

    for (let i = 0; i < debrisCount; i++) {
      const debris = this.scene.add.graphics({
        x: x + (Math.random() - 0.5) * radius * 2,
        y: y + (Math.random() - 0.5) * radius * 2,
      });

      // Random debris colors (dirt, stone, grass)
      const debrisColors = [0x8b4513, 0x696969, 0x228b22];
      const debrisColor =
        debrisColors[Math.floor(Math.random() * debrisColors.length)];

      debris.fillStyle(debrisColor);
      const size = Math.random() * 4 + 2;
      debris.fillRect(-size / 2, -size / 2, size, size);

      // Debris flies outward and falls
      const distance = radius + Math.random() * radius;
      const angle = Math.random() * Math.PI * 2;

      this.scene.tweens.add({
        targets: debris,
        x: debris.x + Math.cos(angle) * distance,
        y: debris.y + Math.sin(angle) * distance,
        rotation: Math.random() * 4,
        alpha: 0,
        duration: 1000 + Math.random() * 500,
        onComplete: () => debris.destroy(),
      });
    }

    // Dust cloud effect
    const dustCloud = this.scene.add.graphics({ x: x, y: y });
    dustCloud.fillStyle(0x8b7355, 0.6); // Semi-transparent tan
    dustCloud.fillCircle(0, 0, radius / 2);

    this.scene.tweens.add({
      targets: dustCloud,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 800,
      onComplete: () => dustCloud.destroy(),
    });
  }
}

window.ExplosionRenderer = ExplosionRenderer;
