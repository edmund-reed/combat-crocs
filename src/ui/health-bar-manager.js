import { UITextHelpers } from "./ui-helpers.js";
import { PlayerManager, StateManager } from "@utils";

class HealthBarManager {
  static createHealthBars(scene) {
    scene.healthBars = scene.players.map(p => ({
      bar: scene.add.graphics(),
      label: UITextHelpers.createMutedText(scene, 0, 2, `P${p.id}`, 10).setOrigin(0.5),
      playerId: p.id,
    }));
  }

  static updateHealthBarPositions(scene) {
    scene.healthBars.forEach(({ bar, label, playerId }) => {
      const idx = PlayerManager.getPlayerIndexById(scene, playerId);
      const alive = PlayerManager.isPlayerAlive(scene, idx);
      bar.setVisible(alive);
      label.setVisible(alive);
      if (alive) {
        const p = scene.players[idx];
        bar.setPosition(p.x - 50, p.y - 60);
        label.setPosition(p.x, p.y - 46);
      }
    });
  }

  static updateHealthBars(scene) {
    scene.healthBars.forEach(data => {
      const player = scene.players.find(p => p.id === data.playerId);
      if (!player) return;

      const { bar, label } = data;
      bar.clear();

      const dark = player.color & 0x7f7f7f;
      const hp = Math.max(0, player.health);
      const w = 100 * (hp / 100);

      bar
        .fillStyle(dark)
        .fillRect(0, 0, 100, 12)
        .fillStyle(player.color)
        .fillRect(0, 0, w, 12)
        .lineStyle(1, 0x000000)
        .strokeRect(0, 0, 100, 12);

      if (hp > 0) {
        bar.setVisible(true);
        label.setVisible(true);
      } else {
        bar.setVisible(false);
        label.setVisible(false);
        if (player.body && !player.body.isRemoved && scene.matter?.world) {
          scene.matter.world.remove(player.body);
          player.body.isRemoved = true;
        }
        this._showGravestone(scene, player);
      }
    });
  }

  static _showGravestone(scene, player) {
    const { x, y } = player;
    const stone = scene.add
      .graphics()
      .fillStyle(0x666666)
      .fillRect(x - 8, y - 30, 16, 30)
      .fillRect(x - 12, y - 35, 24, 8);
    const rip = UITextHelpers.createStatusText(scene, x, y - 40, "RIP", "#FFFFFF", 10).setOrigin(0.5);
    player.graphics.setVisible(false);
    StateManager.registerCleanup(scene, { stone, rip }, "effects");
  }
}

export default HealthBarManager;
