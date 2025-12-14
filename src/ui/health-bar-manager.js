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
      const hp = Math.max(0, player.health || 0);

      if (hp <= 0) {
        bar.setVisible(false).clear();
        label.setVisible(false);
        if (player.body && !player.body.isRemoved && scene.matter?.world) {
          scene.matter.world.remove(player.body);
          player.body.isRemoved = true;
        }
        this._showGravestone(scene, player);
        return;
      }

      bar.clear().setVisible(true);
      label.setVisible(true);

      const maxHp = player.maxHealth || 100;
      const totalWidth = Math.min(maxHp, 200);
      const fillWidth = (hp / maxHp) * totalWidth;
      const baseW = Math.min(fillWidth, 100);
      const bonusW = Math.max(0, fillWidth - 100);

      bar.fillStyle(player.color & 0x7f7f7f).fillRect(0, 0, totalWidth, 12);
      if (baseW > 0) bar.fillStyle(player.color).fillRect(0, 0, baseW, 12);
      if (bonusW > 0) {
        const c = player.color;
        const r = Math.min(255, ((c >> 16) & 0xff) + Math.round((255 - ((c >> 16) & 0xff)) * 0.4));
        const g = Math.min(255, ((c >> 8) & 0xff) + Math.round((255 - ((c >> 8) & 0xff)) * 0.4));
        const b = Math.min(255, (c & 0xff) + Math.round((255 - (c & 0xff)) * 0.4));
        bar.fillStyle((r << 16) | (g << 8) | b).fillRect(100, 0, bonusW, 12);
      }
      bar.lineStyle(1, 0x000000).strokeRect(0, 0, totalWidth, 12);
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
