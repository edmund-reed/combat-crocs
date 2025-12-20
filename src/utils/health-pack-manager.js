import { Config } from "@config";
import { PhysicsManager } from "@utils";
import PlayerManager from "./player.js";

class HealthPackManager {
  static spawn(scene) {
    const x = Phaser.Math.Between(50, Config.GAME_WIDTH - 50);
    const scale = Math.min(1, 32 / scene.textures.get("health-pack").source[0].width);

    const crate = scene.matter.add.image(x, 10, "health-pack", null, {
      friction: 0.8,
      frictionAir: 0.02,
      restitution: 0.1,
    });

    crate.setDepth(900).setScale(scale);
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
        player.health = (player.health || 0) + (crate.healAmount || Config.HEALTH_CRATE_AMOUNT);
        crate.destroy();
        return false;
      }
      return true;
    });
  }
}

export default HealthPackManager;
