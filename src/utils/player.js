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
      `🖼️ Created sprite ${spriteKey} at (${x}, ${y}) with scale 0.12, facing ${
        shouldFaceLeft ? "left" : "right"
      }`
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

  // Handle player movement CONTROLS (separate from physics) - called only for current player
  static handleMovement(scene, player, cursors, spaceKey) {
    let velocityX = 0;

    if (cursors.left.isDown) {
      velocityX = -Config.PLAYER_SPEED;
    } else if (cursors.right.isDown) {
      velocityX = Config.PLAYER_SPEED;
    }

    // Apply horizontal movement - always set velocity even when 0 to stop immediately
    // During projectile flight, disable horizontal movement for cleaner visual jumping
    const realVelocityX =
      scene.turnInProgress && player.hasJumpedThisTurn ? 0 : velocityX;

    scene.matter.body.setVelocity(player.body, {
      x: realVelocityX, // Only allow horizontal movement if not jumping during projectile flight
      y: player.body.velocity.y, // Keep current vertical velocity (gravity/fall momentum)
    });

    // Flip sprite based on movement direction
    if (velocityX < 0) {
      // Moving left
      player.graphics.setFlipX(true);
      player.facingLeft = true;
    } else if (velocityX > 0) {
      // Moving right
      player.graphics.setFlipX(false);
      player.facingLeft = false;
    }
    // If velocityX is 0, keep current facing direction

    // Simple ground collision check - only allow jump if player has low vertical velocity
    const isActuallyOnGround = Math.abs(player.body.velocity.y) < 5;
    const canJump = isActuallyOnGround && player.hasJumpedThisTurn !== true;

    if (spaceKey.isDown && canJump) {
      scene.matter.body.setVelocity(player.body, {
        x: player.body.velocity.x,
        y: -Config.PLAYER_JUMP_FORCE,
      });
      console.log(
        `🦘 PLAYER JUMPED! (Velocity Y: ${player.body.velocity.y.toFixed(2)})`
      );

      // Mark as having jumped this turn
      player.hasJumpedThisTurn = true;

      // Reset jump ability after landing (one-time check)
      player.jumpResetTimer = scene.time.addEvent({
        delay: 200, // Check more frequently
        callback: () => this.checkJumpReset(scene, player),
        repeat: 25, // Check up to 5 seconds, stop repeating when landed
      });
    } else if (spaceKey.isDown && !canJump) {
      console.log(
        `❌ Jump blocked - On ground: ${isActuallyOnGround}, Already jumped: ${player.hasJumpedThisTurn}`
      );
    }

    // Add slight rotation based on movement
    const rotation = velocityX * 0.03;
    player.graphics.setRotation(rotation);
  }

  // Check if player is on ground - more robust detection
  static isOnGround(player) {
    // Check if velocity is low (close to zero) - the main indicator of being on ground
    const lowVelocity = Math.abs(player.body.velocity.y) < 3;

    // Only log when jumping or landing (not every frame while standing)
    if (!lowVelocity || player.lastGroundCheckResult !== lowVelocity) {
      console.log(
        `Ground check: Y=${player.y.toFixed(
          1
        )}, Velocity Y=${player.body.velocity.y.toFixed(
          3
        )}, On ground=${lowVelocity}`
      );
      player.lastGroundCheckResult = lowVelocity;
    }

    return lowVelocity;
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

  // Check for jump reset after player lands
  static checkJumpReset(scene, player) {
    if (Math.abs(player.body.velocity.y) < 3) {
      player.hasJumpedThisTurn = false;
      console.log("✅ Jump ability reset after landing");
      // Stop the timer
      if (player.jumpResetTimer) {
        player.jumpResetTimer.remove(false);
        player.jumpResetTimer = null;
      }
    }
  }

  // Assign random spawn positions to all players
  static assignRandomSpawnPositions(scene, players) {
    const playerCount = players.length;
    const minDistance = 140; // Minimum distance between players

    // Define high-altitude spawn positions (well above all terrain)
    // This ensures characters spawn in unobstructed airspace and fall onto terrain
    const spawnLevels = [
      { y: Config.GAME_HEIGHT - 400, name: "Above All Terrain" }, // Way above everything
    ];

    // Wide safe air space across entire battlefield (well above all terrain)
    const airSpawnAreas = [
      { level: 0, minX: 80, maxX: 1120 }, // Wide safe air space
    ];

    console.log(
      `Spawning ${playerCount} players in free airspace above all terrain`
    );

    // Generate dense spawn points in open airspace (guaranteed no collision)
    const allSpawnPoints = [];
    airSpawnAreas.forEach((area) => {
      for (let x = area.minX; x <= area.maxX; x += 15) {
        // Less dense for air
        allSpawnPoints.push({
          x: x,
          y: spawnLevels[area.level].y,
          levelName: spawnLevels[area.level].name,
        });
      }
    });

    console.log(
      `Generated ${allSpawnPoints.length} guaranteed collision-free spawn points`
    );

    // Shuffle spawn points for randomness
    for (let i = allSpawnPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSpawnPoints[i], allSpawnPoints[j]] = [
        allSpawnPoints[j],
        allSpawnPoints[i],
      ];
    }

    // Assign players to positions
    for (let i = 0; i < playerCount; i++) {
      const player = players[i];

      // Find first available spawn point that's far enough from placed players
      let assignedPosition = null;
      for (const spawnPoint of allSpawnPoints) {
        const tooClose = players
          .slice(0, i)
          .some(
            (placedPlayer) =>
              Math.abs(spawnPoint.x - placedPlayer.x) < minDistance
          );

        if (!tooClose) {
          assignedPosition = spawnPoint;
          break;
        }
      }

      // Emergency fallback if no position found
      if (!assignedPosition) {
        console.warn(`Emergency placement for ${player.id}`);
        // Place at a random available spot ignoring minimum distance
        const fallbackIndex = Math.floor(Math.random() * allSpawnPoints.length);
        assignedPosition = allSpawnPoints[fallbackIndex];
      }

      // Update player position and physics
      player.x = assignedPosition.x;
      player.y = assignedPosition.y;
      player.graphics.setPosition(player.x, player.y);
      scene.matter.body.setPosition(player.body, { x: player.x, y: player.y });

      console.log(
        `Assigned ${player.id} to ${assignedPosition.levelName} at (${assignedPosition.x}, ${assignedPosition.y})`
      );
    }

    console.log("All player positions assigned successfully!");
  }
}

window.PlayerManager = PlayerManager;
