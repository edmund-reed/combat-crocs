import { UITextHelpers } from "./ui-helpers.js";
import { PlayerManager, StateManager } from "@utils";

// Health bar constants
const BAR = { width: 100, height: 12, offsetY: -60, labelOffsetY: -46 };

// Lighten a packed 0xRRGGBB color by interpolating toward white.
// Uses Phaser helpers for readability.
const lighten = (colorInt, t = 0.4) => {
  const c = Phaser.Display.Color.IntegerToColor(colorInt);
  const white = new Phaser.Display.Color(255, 255, 255);
  const out = Phaser.Display.Color.Interpolate.ColorWithColor(c, white, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(out.r, out.g, out.b);
};

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
      if (!alive) return;
      const p = scene.players[idx];
      bar.setPosition(p.x - BAR.width / 2, p.y + BAR.offsetY);
      label.setPosition(p.x, p.y + BAR.labelOffsetY);
    });
  }

  static updateHealthBars(scene) {
    scene.healthBars.forEach(({ bar, label, playerId }) => {
      const player = scene.players.find(p => p.id === playerId);
      if (!player) return;

      const hp = Math.max(0, player.health || 0);
      if (hp <= 0) {
        bar.setVisible(false).clear();
        label.setVisible(false);
        if (!player.body?.isRemoved) {
          scene.matter?.world?.remove(player.body);
          player.body.isRemoved = true;
        }
        return this._showGravestone(scene, player);
      }

      bar.clear().setVisible(true);
      label.setVisible(true);

      const baseHp = Math.min(hp, BAR.width);
      const bonusHp = Math.min(Math.max(0, hp - BAR.width), BAR.width);

      // Background + base health fill
      bar.fillStyle(player.color & 0x7f7f7f).fillRect(0, 0, BAR.width, BAR.height);
      baseHp > 0 && bar.fillStyle(player.color).fillRect(0, 0, baseHp, BAR.height);

      // Bonus health (HP > 100) as extension
      if (bonusHp > 0) {
        bar.fillStyle(0x1b1b1b).fillRect(BAR.width, 0, bonusHp, BAR.height);
        bar.fillStyle(lighten(player.color)).fillRect(BAR.width, 0, bonusHp, BAR.height);
        bar.lineStyle(2, 0x00ff00).strokeRect(BAR.width, 0, bonusHp, BAR.height);
      }

      bar.lineStyle(1, 0x000000).strokeRect(0, 0, BAR.width, BAR.height);
    });
  }

  static _showGravestone(scene, player) {
    if (player.gravestoneShown) return;
    player.gravestoneShown = true;
    player.graphics.setVisible(false);
    const g = scene.add.image(player.x, player.y, "rip").setOrigin(0.5, 1).setDepth(5);
    g.setScale(40 / g.height);
    StateManager.registerCleanup(scene, { gravestone: g }, "effects");
  }
}

export default HealthBarManager;
