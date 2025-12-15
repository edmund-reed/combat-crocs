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

      // Base health is always rendered at fixed width; bonus health is appended.
      const baseMax = 100;
      const baseWidth = 100;
      const bonusMax = 100; // cap visual bonus segment at +100
      const bonusWidthMax = 100;
      const barHeight = 12;

      const baseHp = Math.min(hp, baseMax);
      const bonusHp = Math.min(Math.max(0, hp - baseMax), bonusMax);

      const baseFillW = (baseHp / baseMax) * baseWidth;
      const bonusFillW = (bonusHp / bonusMax) * bonusWidthMax;

      // Background for base segment
      bar.fillStyle(player.color & 0x7f7f7f).fillRect(0, 0, baseWidth, barHeight);
      if (baseFillW > 0) bar.fillStyle(player.color).fillRect(0, 0, baseFillW, barHeight);

      // Optional bonus segment (appended) with green border
      if (bonusHp > 0) {
        const bonusX = baseWidth;
        const bonusSegmentW = bonusFillW; // segment width reflects current bonus HP only

        // Slightly lighter fill for bonus
        const c = player.color;
        const r = Math.min(255, ((c >> 16) & 0xff) + Math.round((255 - ((c >> 16) & 0xff)) * 0.4));
        const g = Math.min(255, ((c >> 8) & 0xff) + Math.round((255 - ((c >> 8) & 0xff)) * 0.4));
        const b = Math.min(255, (c & 0xff) + Math.round((255 - (c & 0xff)) * 0.4));

        // Bonus background + fill (only as wide as the current bonus)
        bar.fillStyle(0x1b1b1b).fillRect(bonusX, 0, bonusSegmentW, barHeight);
        bar.fillStyle((r << 16) | (g << 8) | b).fillRect(bonusX, 0, bonusSegmentW, barHeight);

        // Green outline around the bonus segment
        bar.lineStyle(2, 0x00ff00).strokeRect(bonusX, 0, bonusSegmentW, barHeight);
      }

      // Outline only the base (so it never looks like there's an empty gap)
      bar.lineStyle(1, 0x000000).strokeRect(0, 0, baseWidth, barHeight);
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
