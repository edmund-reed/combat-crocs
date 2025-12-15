import { Config } from "@config";
import { PhysicsManager } from "@utils";
import PlayerManager from "./player.js";

class HealthPackManager {
  static spawn(scene) {
    console.log("🎁 HealthPackManager.spawn() called");

    const x = Phaser.Math.Between(50, Config.GAME_WIDTH - 50);
    console.log(`🎁 Spawning health pack at x=${x}`);

    // Scale to 32px width (rendered) - do this first
    const texture = scene.textures.get("health-pack");
    const sourceWidth = texture.source[0].width;
    const scale = Math.min(1, 32 / sourceWidth);
    console.log(`🎁 Texture source width: ${sourceWidth}, calculated scale: ${scale}`);

    // Use physics so crates always fall and settle on terrain/platforms.
    const crate = scene.matter.add
      .image(x, 10, "health-pack")
      .setDepth(900)
      .setFriction(0.8)
      .setFrictionAir(0.02)
      .setBounce(0.1)
      .setScale(scale); // Apply scale before setting body

    console.log(`🎁 Created crate with display size: ${crate.displayWidth}x${crate.displayHeight}`);

    // Rectangle body based on rendered size (after scaling)
    const renderedWidth = crate.displayWidth;
    const renderedHeight = crate.displayHeight;
    crate.setRectangle(renderedWidth, renderedHeight);
    console.log(`🎁 Set rectangle body: ${renderedWidth}x${renderedHeight}`);

    // Collide with terrain (and allow players to overlap it)
    crate.setCollisionCategory(PhysicsManager.CATEGORIES.HEALTH_PACKS);
    crate.setCollidesWith(PhysicsManager.CATEGORIES.TERRAIN | PhysicsManager.CATEGORIES.PLAYERS);

    crate.healAmount = Config.HEALTH_CRATE_AMOUNT;
    (scene.healthCrates ||= []).push(crate);

    console.log(`🎁 Health pack spawned successfully, total crates: ${scene.healthCrates.length}`);

    // Debug: confirm it actually exists/moves in the world
    scene.time.delayedCall(1000, () => {
      const pos = crate?.body?.position;
      if (!pos) return console.log("🎁 Health pack after 1s: (destroyed/no body)");

      console.log(
        `🎁 Health pack after 1s: x=${pos.x.toFixed(1)}, y=${pos.y.toFixed(1)}, ` +
          `vx=${crate.body?.velocity?.x?.toFixed?.(2)}, vy=${crate.body?.velocity?.y?.toFixed?.(2)}`,
      );
    });
  }

  static update(scene) {
    if (!scene.healthCrates?.length) return;

    scene.healthCrates = scene.healthCrates.filter(crate => {
      const pos = crate?.body?.position;
      if (!pos) return false;

      const player = scene.players.find(
        (p, i) =>
          PlayerManager.isPlayerAlive(scene, i) && Phaser.Math.Distance.Between(p.x, p.y, pos.x, pos.y) < 25,
      );

      if (player) {
        const heal = crate.healAmount || Config.HEALTH_CRATE_AMOUNT;

        // Add temporary bonus health (do not permanently raise maxHealth)
        // Health bar renders base (0-100) plus appended bonus.
        player.health = (player.health || 0) + heal;

        crate.destroy();
      }

      return !player;
    });
  }
}

export default HealthPackManager;
