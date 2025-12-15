// Movement Manager for Combat Crocs
// Handles player movement, controls, and jumping logic

import { Config } from "@config";

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

    // Jump is allowed only when the player is actually contacting terrain.
    const isGrounded = (player.groundContacts || 0) > 0;
    const nowMs = scene.time.now;
    const canJump = isGrounded && !player.jumpLocked && nowMs - (player.lastJumpAtMs || 0) >= 500; // hard cooldown

    if (spaceKey.isDown && canJump) {
      // Disable jumping immediately on initiation
      player.jumpLocked = true;
      player.lastJumpAtMs = nowMs;

      const jumpForce = Config.PLAYER_JUMP_FORCE * (player.ability?.jumpMultiplier ?? 1);
      scene.matter.body.setVelocity(player.body, {
        x: player.body.velocity.x,
        y: -jumpForce,
      });

      console.log(`🦘 PLAYER JUMPED! (Force: ${jumpForce.toFixed(1)})`);
    }

    // Add slight rotation based on movement
    const rotation = velocityX * 0.03;
    player.graphics.setRotation(rotation);
  }

  // Legacy helpers removed: jump reset is now handled by collision contact tracking
}

export default MovementManager;
