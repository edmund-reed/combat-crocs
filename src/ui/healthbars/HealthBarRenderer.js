/**
 * HealthBarRenderer.js - Health bar visual presentation
 * Handles creating and updating health bar graphics and text
 */

class HealthBarRenderer {
  // Create visual health bars for all players
  static createBars(scene, numPlayers = 2) {
    const healthBars = [];

    for (let i = 0; i < numPlayers; i++) {
      const bar = scene.add.graphics();
      bar.fillStyle(0xff0000); // Red background
      bar.fillRect(20, 20 + i * 40, 200, 20); // Background bar
      bar.fillStyle(0x00ff00); // Green health
      bar.fillRect(20, 20 + i * 40, 200, 20); // Initial full health

      healthBars.push(bar);
    }

    console.log(
      "🎨 HealthBarRenderer: Created health bars for",
      numPlayers,
      "players"
    );
    return healthBars;
  }

  // Update health bar visuals based on current health values
  static updateBars(healthBars, playerHealth) {
    healthBars.forEach((bar, index) => {
      const health = playerHealth[index];
      bar.clear();

      // Background (red)
      bar.fillStyle(0xff0000);
      bar.fillRect(20, 20 + index * 40, 200, 20);

      // Health bar (green, proportional to health)
      bar.fillStyle(0x00ff00);
      const healthWidth = 200 * (health / 100);
      bar.fillRect(20, 20 + index * 40, healthWidth, 20);

      console.log(
        `🎨 HealthBarRenderer: Updated Player ${
          index + 1
        } bar to ${health}% health`
      );
    });
  }

  // Create text labels for health bars
  static createLabels(scene, numPlayers = 2) {
    const labels = [];

    for (let i = 0; i < numPlayers; i++) {
      const label = TextHelper.createHealthLabel(scene, 30, 22 + i * 40, i + 1);
      labels.push(label);
    }

    console.log(
      "📝 HealthBarRenderer: Created health labels for",
      numPlayers,
      "players"
    );
    return labels;
  }

  // Clean up health bar graphics when no longer needed
  static destroyBars(healthBars) {
    healthBars.forEach((bar) => {
      if (bar && bar.destroy) {
        bar.destroy();
      }
    });
    console.log("🗑️ HealthBarRenderer: Destroyed health bars");
  }

  // Clean up health bar text labels
  static destroyLabels(labels) {
    labels.forEach((label) => {
      if (label && label.destroy) {
        label.destroy();
      }
    });
    console.log("🗑️ HealthBarRenderer: Destroyed health labels");
  }
}

window.HealthBarRenderer = HealthBarRenderer;
