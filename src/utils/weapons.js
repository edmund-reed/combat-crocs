// Weapon utilities for Combat Crocs

class WeaponManager {
  static instance = null;

  constructor(scene) {
    this.scene = scene;
    console.log("🎯 WeaponManager initialized");
  }

  static getInstance(scene) {
    if (!WeaponManager.instance) {
      WeaponManager.instance = new WeaponManager(scene);
    }
    return WeaponManager.instance;
  }

  // Create and fire a weapon
  fireProjectile(player, targetX, targetY) {
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      targetX,
      targetY
    );
    const power = 25;

    const velocity = {
      x: Math.cos(angle) * power,
      y: Math.sin(angle) * power,
    };

    // Create physics body first
    const body = this.scene.matter.add.circle(
      player.x + Math.cos(angle) * 40,
      player.y + Math.sin(angle) * 40,
      5,
      {
        friction: 0.1,
        restitution: 0.8,
      }
    );

    // Create projectile graphics
    const projectile = this.scene.add.graphics({
      x: body.position.x,
      y: body.position.y,
    });
    projectile.fillStyle(0xff0000);
    projectile.fillCircle(0, 0, 5);

    // Add manual debug outline (green circle)
    const debugOutline = this.scene.add.graphics({
      x: body.position.x,
      y: body.position.y,
    });
    debugOutline.lineStyle(2, 0x00ff00); // Green outline
    debugOutline.strokeCircle(0, 0, 5);

    body.projectileOwner = player.id;

    // Set velocity using Matter.js method (not the body method that doesn't exist)
    this.scene.matter.body.setVelocity(body, velocity);

    // Add trail effect
    this.addProjectileTrail(body);

    // Handle collisions
    this.setupProjectileCollision(body, projectile);

    // Store references for position updating and cleanup
    body.projectileGraphics = projectile;
    body.debugOutline = debugOutline;

    // Auto-cleanup timeout (if projectile doesn't hit anything)
    setTimeout(() => {
      if (!body.destroyed && body.world) {
        console.log("Projectile timeout reached, cleaning up and ending turn");
        this.scene.matter.world.remove(body);
        projectile.destroy();
        debugOutline.destroy();
        this.scene.endProjectileTurn();
      }
    }, 5000);

    // Return the created objects for cleanup tracking
    return { body, projectile };
  }

  // Add visual trail to projectile
  static addProjectileTrail(scene, projectileBody) {
    scene.time.addEvent({
      delay: 100,
      repeat: 10,
      callback: () => {
        if (!projectileBody.destroyed) {
          const trail = scene.add.graphics({
            x: projectileBody.position.x,
            y: projectileBody.position.y,
          });
          trail.fillStyle(0xff4500);
          trail.fillCircle(0, 0, 2);
          scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 500,
            onComplete: () => trail && trail.destroy(),
          });
        }
      },
    });
  }

  // Setup collision detection for projectiles
  static setupProjectileCollision(scene, projectileBody, projectileGraphics) {
    let hasHit = false;

    scene.matter.world.on("collisionstart", (event) => {
      if (!projectileBody.destroyed && !hasHit) {
        event.pairs.forEach((pair) => {
          // Check if this collision involves our projectile
          if (pair.bodyA === projectileBody || pair.bodyB === projectileBody) {
            console.log("Projectile collision detected!");
            hasHit = true;
            this.createExplosion(
              scene,
              projectileBody.position.x,
              projectileBody.position.y,
              projectileBody.projectileOwner
            );
            scene.matter.world.remove(projectileBody);
            projectileGraphics.destroy();
            if (projectileBody.debugOutline) {
              projectileBody.debugOutline.destroy();
            }
            // Call endProjectileTurn to advance to next player
            scene.endProjectileTurn();
          }
        });
      }
    });
  }

  // Create explosion effect
  static createExplosion(scene, x, y, projectileOwner = null) {
    const radius = 200; // Much larger for development testing
    console.log(
      `ACTUAL EXPLOSION at (${x.toFixed(1)}, ${y.toFixed(1)}) from ${
        projectileOwner ? `Player ${projectileOwner}` : "timeout"
      }. Radius: ${radius}`
    );

    // Explosion graphics
    const explosion = scene.add.graphics({ x: x, y: y });
    explosion.fillStyle(0xff4500);
    explosion.fillCircle(0, 0, radius);

    scene.tweens.add({
      targets: explosion,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage nearby players (check for terrain protection)
    scene.players.forEach((player, index) => {
      const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
      console.log(
        `Player ${index + 1} distance: ${distance.toFixed(1)}, health: ${
          player.health
        }`
      );

      if (distance < radius) {
        // Special case: If this is the shooter's own explosion, no terrain protection
        const isOwnExplosion = projectileOwner === player.id;
        const blockedByTerrain = isOwnExplosion
          ? false
          : this.isExplosionBlockedByTerrain(scene, x, y, player.x, player.y);

        if (!blockedByTerrain) {
          const damage = Math.max(0, 100 - (distance / radius) * 75);
          console.log(
            `${isOwnExplosion ? "🎯 OWN" : "💥"} Player ${
              index + 1
            } hit for ${damage} damage`
          );
          player.health = Math.max(0, player.health - damage);
          scene.updateHealthDisplay();
        } else {
          console.log(
            `🛡️ Player ${index + 1} protected by terrain from explosion`
          );
        }
      }
    });

    // Screen shake
    scene.cameras.main.shake(200, 0.02);

    return projectileOwner;
  }

  // Check if terrain blocks the explosion path to a player
  static isExplosionBlockedByTerrain(
    scene,
    explosionX,
    explosionY,
    playerX,
    playerY
  ) {
    // Simple terrain blocking check - check if there's a platform between explosion and player

    console.log(
      `Checking terrain blocking: explosion(${explosionX.toFixed(
        0
      )}, ${explosionY.toFixed(0)}) to player(${playerX.toFixed(
        0
      )}, ${playerY.toFixed(0)})`
    );

    // Platform positions from TerrainManager (hardcoded for now)
    const platforms = [
      { x: 400, y: 575, width: 200, height: 50, name: "Left Platform" },
      { x: 700, y: 525, width: 150, height: 50, name: "Middle Platform" },
      { x: 950, y: 475, width: 100, height: 50, name: "Right Platform" },
    ];

    // Check each platform
    for (const platform of platforms) {
      const blocked = this.platformBlocksPath(
        platform,
        explosionX,
        explosionY,
        playerX,
        playerY
      );

      if (blocked) {
        console.log(
          `❌ BLOCKED by ${platform.name} at (${platform.x}, ${platform.y})`
        );
        return true;
      } else {
        console.log(
          `✅ ${platform.name} at (${platform.x}, ${platform.y}) does NOT block`
        );
      }
    }

    console.log("✅ No terrain blocking found");
    return false;
  }

  // Check if a specific platform blocks the line of sight
  static platformBlocksPath(
    platform,
    explosionX,
    explosionY,
    playerX,
    playerY
  ) {
    const { x: platX, y: platY, width: platW, height: platH } = platform;

    console.log(
      `Checking platform ${platform.name}: explosion(${explosionX.toFixed(
        0
      )}, ${explosionY.toFixed(0)}) vs player(${playerX.toFixed(
        0
      )}, ${playerY.toFixed(0)})`
    );

    // Platform bounds
    const platLeft = platX - platW / 2;
    const platRight = platX + platW / 2;
    const platTop = platY - platH / 2;
    const platBottom = platY + platH / 2;

    // Calculate if platform is BETWEEN explosion and player (line-of-sight blocking)
    // This is geometric line segment intersection, but simplified:

    // Check if the platform blocks the direct path from explosion to player
    const explosionSide =
      explosionY <= platTop
        ? "above"
        : explosionY >= platBottom
        ? "below"
        : "beside";
    const playerSide =
      playerY <= platTop ? "above" : playerY >= platBottom ? "below" : "beside";

    console.log(
      `Explosion position: ${explosionSide} platform, Player position: ${playerSide} platform`
    );

    // PROTECTION LOGIC: Shield only when platform physically blocks blast path

    // ✅ PROTECT: Platform BETWEEN explosion and player
    if (explosionSide === "above" && playerSide === "below") {
      console.log(
        `🎯 PROTECTION: Platform above blocks explosion from reaching below`
      );
      return true;
    }

    // ✅ PROTECT: Platform beside blocks horizontal blast
    if (explosionSide === "beside" && playerSide === "below") {
      console.log(
        `🎯 PROTECTION: Platform beside blocks explosion from reaching below`
      );
      return true;
    }

    // ❌ NO PROTECTION: Explosion and player on same "vertical side"
    // Special case: Player shooting upward at platform above them
    if (explosionSide === "below" && playerSide === "below") {
      console.log(
        `❌ NO PROTECTION: Explosion below platform, player below - no shield`
      );
      return false;
    }

    // Side-by-side or above-together scenarios
    if (explosionSide === playerSide) {
      console.log(
        `❌ NO PROTECTION: Explosion (${explosionSide}) same side as player (${playerSide})`
      );
      return false;
    }

    // Add protection for traditional horizontal scenarios
    const explosionLeftOfPlatform = explosionX < platLeft;
    const playerRightOfPlatform = playerX > platRight;
    if (explosionLeftOfPlatform && playerRightOfPlatform) {
      console.log(
        `🛡️ HORIZONTAL PROTECTION: Right side shielded from explosion`
      );
      return true;
    }

    const explosionRightOfPlatform = explosionX > platRight;
    const playerLeftOfPlatform = playerX < platLeft;
    if (explosionRightOfPlatform && playerLeftOfPlatform) {
      console.log(
        `🛡️ HORIZONTAL PROTECTION: Left side shielded from explosion`
      );
      return true;
    }

    console.log(`❌ No line-of-sight protection from ${platform.name}`);
    return false;
  }

  // Helper: check if two Y ranges overlap
  static yOverlap(y1a, y1b, y2a, y2b) {
    return Math.max(y1a, y2a) < Math.min(y1b, y2b);
  }

  static getCurrentWeapon() {
    return "BAZOOKA";
  }

  // Backward compatibility: static method that GameScene calls
  static createProjectile(scene, player, targetX, targetY) {
    // Use the instance method
    const instance = WeaponManager.getInstance(scene);
    return instance.fireProjectile(player, targetX, targetY);
  }
}

window.WeaponManager = WeaponManager;
