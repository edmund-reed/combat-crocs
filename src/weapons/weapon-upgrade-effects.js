// Visual effects for weapon upgrades

class WeaponUpgradeEffects {
  // Get explosion color based on weapon level
  static getExplosionColor(level) {
    const colors = {
      1: 0xffff00, // Yellow (Level 1)
      2: 0xff8800, // Orange (Level 2)
      3: 0xff0000, // Red (Level 3)
    };
    return colors[level] || colors[1];
  }

  // Create enhanced explosion graphics with level-based visuals
  static createEnhancedExplosion(scene, x, y, radius, level) {
    const color = this.getExplosionColor(level);
    const explosion = scene.add.graphics({ x, y });

    // Main explosion circle
    explosion.fillStyle(color, 0.8);
    explosion.fillCircle(0, 0, radius);

    // Add glow effect for upgraded weapons
    if (level >= 2) {
      const glowRadius = radius + 20;
      explosion.fillStyle(color, 0.3);
      explosion.fillCircle(0, 0, glowRadius);
    }

    // Extra particles for Level 3
    if (level === 3) {
      this.createGoldParticles(scene, x, y, radius);
    }

    // Animate explosion
    scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    return explosion;
  }

  // Create particle effect for max level explosions
  static createGoldParticles(scene, x, y, radius) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = radius * 0.7;
      const particleX = x + Math.cos(angle) * distance;
      const particleY = y + Math.sin(angle) * distance;

      const particle = scene.add.graphics();
      particle.fillStyle(0xffd700, 1);
      particle.fillCircle(particleX, particleY, 4);
      particle.setDepth(100);

      // Animate particles outward
      scene.tweens.add({
        targets: particle,
        x: particleX + Math.cos(angle) * 30,
        y: particleY + Math.sin(angle) * 30,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Screen flash effect for level-ups
  static showLevelUpFlash(scene) {
    const flash = scene.add.graphics();
    flash.fillStyle(0xffd700, 0.3);
    flash.fillRect(0, 0, scene.game.config.width, scene.game.config.height);
    flash.setDepth(1999);

    scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }
}

export default WeaponUpgradeEffects;
