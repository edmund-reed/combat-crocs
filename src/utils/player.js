// Player utilities for Combat Crocs

class PlayerManager {
  // Create a crocodile player
  static createPlayer(scene, id, x, y, color) {
    // Choose sprite based on player ID
    const spriteKey = id === 1 ? "croc1" : "croc2";
    console.log(`🐊 Creating Player ${id} with sprite: ${spriteKey}`);

    // Create player sprite
    const playerSprite = scene.add.sprite(x, y, spriteKey);
    playerSprite.setScale(0.12); // Scale down to appropriate game size (~36-48px instead of 300-400px)
    playerSprite.setOrigin(0.5, 0.7); // Center horizontally, slightly below center for ground contact

    // Flip sprite based on player position (Player 1 faces right, Player 2 faces left)
    const shouldFaceLeft = id === 2;
    playerSprite.setFlipX(shouldFaceLeft);

    console.log(
      `🖼️ Created sprite ${spriteKey} at (${x}, ${y}) with scale 0.12, facing ${
        shouldFaceLeft ? "left" : "right"
      }`
    );

    // Create physics body (keep same collision box)
    const body = scene.matter.add.rectangle(x, y, 30, 20, {
      friction: 0.1,
      restitution: 0.1,
      density: 0.01,
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

      // Reset jump ability after landing
      scene.time.addEvent({
        delay: 1000, // Check for landing every second
        callback: () => {
          if (Math.abs(player.body.velocity.y) < 3) {
            player.hasJumpedThisTurn = false;
            console.log("Reset jump ability after landing");
          }
        },
        loop: true,
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
}

window.PlayerManager = PlayerManager;
