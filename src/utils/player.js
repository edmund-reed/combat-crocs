// Player utilities for Combat Crocs

class PlayerManager {
  // Create a crocodile player
  static createPlayer(scene, id, x, y, color) {
    // Choose sprite based on team (all players on same team use same sprite)
    let spriteKey = "croc1"; // Default sprite

    if (typeof id === "string" && id.length >= 2) {
      // Team-based ID system: A1, A2, B1, B2, etc.
      const team = id.charAt(0);
      // All Team A players use croc1, all Team B players use croc2
      spriteKey = team === "A" ? "croc1" : "croc2";
    } else {
      // Legacy numeric ID system for backward compatibility
      spriteKey = id === 1 ? "croc1" : "croc2";
    }

    console.log(`🐊 Creating Player ${id} with sprite: ${spriteKey}`);

    // Create player sprite
    const playerSprite = scene.add.sprite(x, y, spriteKey);
    playerSprite.setScale(0.12); // Scale down to appropriate game size (~36-48px instead of 300-400px)
    playerSprite.setOrigin(0.5, 0.7); // Center horizontally, slightly below center for ground contact

    // Flip sprite based on team (Team A faces right, Team B faces left)
    const shouldFaceLeft = typeof id === "string" && id.startsWith("B");
    playerSprite.setFlipX(shouldFaceLeft);

    console.log(
      `🖼️ Created sprite ${spriteKey} at (${x}, ${y}) with scale 0.12, facing ${shouldFaceLeft ? "left" : "right"}`,
    );

    // Create physics body with collision settings
    const body = scene.matter.add.rectangle(x, y, 30, 20, {
      friction: 0.1,
      restitution: 0.1,
      density: 0.01,
      // Players don't collide with each other, only with terrain
      collisionFilter: {
        group: 0, // No group - allows custom collision control
        mask: 1, // Only collide with category 1 (terrain)
        category: 2, // Players are in category 2
      },
    });

    const player = {
      id: id,
      graphics: playerSprite, // Use sprite instead of procedural graphics
      body: body,
      x: x,
      y: y,
      health: 100,
      color: color,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
      facingLeft: shouldFaceLeft, // Track which direction sprite is facing
    };

    return player;
  }

  // Update player position sync
  static updatePositionSync(player) {
    player.x = player.body.position.x;
    player.y = player.body.position.y;
    player.graphics.setPosition(player.x, player.y);
  }

  // Update player physics (gravity, velocity) for ALL players - called every frame
  static updatePlayerPhysics(scene, player) {
    // Update position sync
    player.x = player.body.position.x;
    player.y = player.body.position.y;
    player.graphics.setPosition(player.x, player.y);

    // Enforce screen boundaries for ALL players
    if (player.x < 30 || player.x > Config.GAME_WIDTH - 30) {
      const clampedX = Math.max(35, Math.min(Config.GAME_WIDTH - 35, player.x));
      scene.matter.body.setPosition(player.body, { x: clampedX, y: player.y });
      player.x = clampedX;
      player.graphics.setPosition(player.x, player.y);
    }
  }

  // Reset player for new turn
  static resetForTurn(player) {
    player.canMove = false;
    player.canShoot = false;
  }

  // Setup player for their turn
  static activateForTurn(player) {
    player.canMove = true;
    player.canShoot = true;
  }

  // Assign random spawn positions to all players (delegated to SpawnManager)
  static assignRandomSpawnPositions(scene, players) {
    SpawnManager.assignRandomSpawnPositions(scene, players);
  }
}

window.PlayerManager = PlayerManager;
