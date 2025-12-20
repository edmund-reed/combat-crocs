import { Config } from "@config";

class MovementManager {
  static handleMovement(scene, player, cursors, spaceKey) {
    const velocityX = cursors.left.isDown
      ? -Config.PLAYER_SPEED
      : cursors.right.isDown
      ? Config.PLAYER_SPEED
      : 0;
    const realVelocityX = scene.turnInProgress && player.hasJumpedThisTurn ? 0 : velocityX;

    scene.matter.body.setVelocity(player.body, {
      x: realVelocityX,
      y: player.body.velocity.y,
    });

    velocityX < 0 && (player.graphics.setFlipX(true), (player.facingLeft = true));
    velocityX > 0 && (player.graphics.setFlipX(false), (player.facingLeft = false));

    const isGrounded = (player.groundContacts || 0) > 0;
    const nowMs = scene.time.now;
    const canJump = isGrounded && !player.jumpLocked && nowMs - (player.lastJumpAtMs || 0) >= 500;

    if (spaceKey.isDown && canJump) {
      player.jumpLocked = true;
      player.lastJumpAtMs = nowMs;
      const jumpForce = Config.PLAYER_JUMP_FORCE * (player.ability?.jumpMultiplier ?? 1);
      scene.matter.body.setVelocity(player.body, { x: player.body.velocity.x, y: -jumpForce });
    }

    player.graphics.setRotation(velocityX * 0.03);
  }
}

export default MovementManager;
