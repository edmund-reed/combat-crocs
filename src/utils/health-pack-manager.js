import { Config } from "@config";
import PlayerManager from "./player.js";

class HealthPackManager {
  static spawn(scene) {
    const x = Phaser.Math.Between(50, Config.GAME_WIDTH - 50);
    const topY = (scene.currentMapPlatforms || []).reduce(
      (y, p) => (x >= p.x && x <= p.x + p.width && p.y < y ? p.y : y),
      Config.GAME_HEIGHT - 100,
    );

    const crate = scene.add.image(x, -40, "health-pack").setDepth(900);
    crate.setScale(Math.min(1, 32 / scene.textures.get("health-pack").source[0].width));
    crate.healAmount = Config.HEALTH_CRATE_AMOUNT;
    scene.tweens.add({ targets: crate, y: topY - 20, duration: 800, ease: "Bounce.Out" });
    (scene.healthCrates ||= []).push(crate);
  }

  static update(scene) {
    if (!scene.healthCrates?.length) return;

    scene.healthCrates = scene.healthCrates.filter(crate => {
      const player = scene.players.find(
        (p, i) =>
          PlayerManager.isPlayerAlive(scene, i) &&
          Phaser.Math.Distance.Between(p.x, p.y, crate.x, crate.y) < 25,
      );

      if (player) {
        const heal = crate.healAmount || Config.HEALTH_CRATE_AMOUNT;
        player.maxHealth = (player.maxHealth || 100) + heal;
        player.health = (player.health || 0) + heal;
        crate.destroy();
      }

      return !player;
    });
  }
}

export default HealthPackManager;
