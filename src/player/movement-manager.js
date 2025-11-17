// Movement Manager for Combat Crocs
// Handles player movement, controls, and jumping logic

class MovementManager {
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
    const realVelocityX = scene.turnInProgress && player.hasJumpedThisTurn ? 0 : velocityX;

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
      console.log(`🦘 PLAYER JUMPED! (Velocity Y: ${player.body.velocity.y.toFixed(2)})`);

      // Mark as having jumped this turn
      player.hasJumpedThisTurn = true;

      // Reset jump ability after landing (one-time check)
      player.jumpResetTimer = scene.time.addEvent({
        delay: 200, // Check more frequently
        callback: () => MovementManager.checkJumpReset(scene, player),
        repeat: 25, // Check up to 5 seconds, stop repeating when landed
      });
    } else if (spaceKey.isDown && !canJump) {
      console.log(`❌ Jump blocked - On ground: ${isActuallyOnGround}, Already jumped: ${player.hasJumpedThisTurn}`);
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
        `Ground check: Y=${player.y.toFixed(1)}, Velocity Y=${player.body.velocity.y.toFixed(
          3,
        )}, On ground=${lowVelocity}`,
      );
      player.lastGroundCheckResult = lowVelocity;
    }

    return lowVelocity;
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
}

window.MovementManager = MovementManager;
