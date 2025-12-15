import { Config } from "@config";
import { PhysicsManager } from "@utils";
import PlayerManager from "./player.js";

class HealthPackManager {
  static spawn(scene) {
    const x = Phaser.Math.Between(50, Config.GAME_WIDTH - 50);
    const texture = scene.textures.get("health-pack");
    const scale = Math.min(1, 32 / texture.source[0].width);

    const crate = scene.matter.add
      .image(x, 10, "health-pack")
      .setDepth(900)
      .setFriction(0.8)
      .setFrictionAir(0.02)
      .setBounce(0.1)
      .setScale(scale);

    crate.setRectangle(crate.displayWidth, crate.displayHeight);
    crate.setCollisionCategory(PhysicsManager.CATEGORIES.HEALTH_PACKS);
    crate.setCollidesWith(PhysicsManager.CATEGORIES.TERRAIN | PhysicsManager.CATEGORIES.PLAYERS);

    crate.healAmount = Config.HEALTH_CRATE_AMOUNT;
    (scene.healthCrates ||= []).push(crate);
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
