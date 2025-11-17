// Health Bar Manager for Combat Crocs
class HealthBarManager {
  static createHealthBars(scene) {
    scene.healthBars = [];
    scene.players.forEach(player => {
      // Create empty graphics object - colors will be set dynamically in updateHealthBars
      const bar = scene.add.graphics();
      const textLabel = scene.add.text(0, 2, `P${player.id}`, { font: "10px Arial", fill: "#FFFFFF" }).setOrigin(0.5);
      scene.healthBars.push({
        barGraphics: bar,
        textLabel,
        playerId: player.id,
      });
    });
  }

  static updateHealthBarPositions(scene) {
    scene.healthBars.forEach(barData => {
      const player = scene.players.find(p => p.id === barData.playerId);
      if (!player || player.health <= 0) {
        barData.barGraphics.setVisible(false);
        barData.textLabel.setVisible(false);
        return;
      }
      const barX = player.x - 50,
        barY = player.y - 60;
      barData.barGraphics.setPosition(barX, barY);
      barData.textLabel.setPosition(player.x, barY + 14);
      barData.barGraphics.setVisible(true);
      barData.textLabel.setVisible(true);
    });
  }

  static updateHealthBars(scene) {
    scene.healthBars.forEach(barData => {
      const { barGraphics } = barData;
      const player = scene.players.find(p => p.id === barData.playerId);

      if (!player) return; // Player not found

      barGraphics.clear();

      // Use team color for background and darker version for health fill
      const teamColor = player.color;
      const darkerTeamColor = teamColor & 0x7f7f7f; // Darken by bitwise AND

      // Add black outline for visibility
      barGraphics.lineStyle(1, 0x000000, 1); // 1px black outline
      barGraphics.strokeRect(0, 0, 100, 12); // Outline background
      barGraphics.fillStyle(darkerTeamColor).fillRect(0, 0, 100, 12); // Background = darker team color

      if (player.health > 0) {
        barGraphics.lineStyle(1, 0x000000, 1); // 1px black outline for health bar
        barGraphics.strokeRect(0, 0, 100 * (player.health / 100), 12); // Outline health fill
        barGraphics.fillStyle(teamColor).fillRect(0, 0, 100 * (player.health / 100), 12); // Fill = team color (lighter)
        barData.barGraphics.setVisible(true);
        barData.textLabel.setVisible(true);
      } else {
        barData.barGraphics.setVisible(false);
        barData.textLabel.setVisible(false);
        if (player.body && !player.body.isRemoved) {
          scene.matter.world.remove(player.body);
          player.body.isRemoved = true;
        }
        this.showGravestone(scene, player);
      }
    });
  }

  static showGravestone(scene, player) {
    const { x, y } = player;
    const gravestone = scene.add
      .graphics()
      .fillStyle(0x666666)
      .fillRect(x - 8, y - 30, 16, 30);
    gravestone.fillRect(x - 12, y - 35, 24, 8);
    const ripText = scene.add
      .text(x, y - 40, "RIP", {
        font: "bold 10px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 1,
      })
      .setOrigin(0.5);
    player.graphics.setVisible(false);
    scene.gravestones ??= [];
    scene.gravestones.push({ gravestone, ripText });
  }
}

window.HealthBarManager = HealthBarManager;
