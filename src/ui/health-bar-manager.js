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
        player.body?.isRemoved || (scene.matter?.world?.remove(player.body), (player.body.isRemoved = true));
        this._showGravestone(scene, player);
        return;
      }

      bar.clear().setVisible(true);
      label.setVisible(true);

      const [baseMax, barHeight] = [100, 12];
      const baseHp = Math.min(hp, baseMax);
      const bonusHp = Math.min(Math.max(0, hp - baseMax), baseMax);
      const baseFillW = baseHp;
      const bonusFillW = bonusHp;

      bar.fillStyle(player.color & 0x7f7f7f).fillRect(0, 0, baseMax, barHeight);
      baseFillW > 0 && bar.fillStyle(player.color).fillRect(0, 0, baseFillW, barHeight);

      if (bonusHp > 0) {
        const lighten = (color, factor = 0.4) =>
          [16, 8, 0].reduce((acc, shift) => {
            const channel = (color >> shift) & 0xff;
            return acc | (Math.min(255, channel + Math.round((255 - channel) * factor)) << shift);
          }, 0);

        bar.fillStyle(0x1b1b1b).fillRect(baseMax, 0, bonusFillW, barHeight);
        bar.fillStyle(lighten(player.color)).fillRect(baseMax, 0, bonusFillW, barHeight);
        bar.lineStyle(2, 0x00ff00).strokeRect(baseMax, 0, bonusFillW, barHeight);
      }

      bar.lineStyle(1, 0x000000).strokeRect(0, 0, baseMax, barHeight);
    });
  }

  static _showGravestone(scene, player) {
    const { x, y } = player;

    // Old gravestone marker was ~35px tall; keep similar on-screen sizing
    const targetHeight = 40;

    const gravestone = scene.add.image(x, y, "rip").setOrigin(0.5, 1).setDepth(5);
    const scale = targetHeight / gravestone.height;
    gravestone.setScale(scale);

    player.graphics.setVisible(false);

    // Register in the shape expected by StateManager cleanup
    StateManager.registerCleanup(scene, { gravestone }, "effects");
  }
}

export default HealthBarManager;
