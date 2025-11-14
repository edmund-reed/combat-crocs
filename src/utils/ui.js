// UI utilities for Combat Crocs

class UIManager {
  // Create health bars
  static createHealthBars(scene) {
    scene.healthBars = [];

    scene.players.forEach((player, index) => {
      const bar = scene.add.graphics();
      bar.fillStyle(0xff0000);
      bar.fillRect(20, 20 + index * 40, 200, 20);
      bar.fillStyle(0x00ff00);
      bar.fillRect(20, 20 + index * 40, 200 * (player.health / 100), 20);

      // Player label using TextHelper
      TextHelper.createHealthLabel(scene, 30, 22 + index * 40, player.id);

      scene.healthBars.push(bar);
    });
  }

  // Update health display
  static updateHealthBars(scene) {
    scene.healthBars.forEach((bar, index) => {
      bar.clear();
      const player = scene.players[index];

      bar.fillStyle(0xff0000);
      bar.fillRect(20, 20 + index * 40, 200, 20);

      bar.fillStyle(0x00ff00);
      const healthWidth = 200 * (player.health / 100);
      bar.fillRect(20, 20 + index * 40, healthWidth, 20);

      // Check for game over
      if (player.health <= 0) {
        scene.endGame(index === 0 ? 2 : 1);
      }
    });
  }

  // Create weapon display
  static createWeaponDisplay(scene) {
    scene.weaponText = TextHelper.createWeaponDisplay(
      scene,
      Config.GAME_WIDTH - 200,
      20,
      Config.WEAPON_TYPES[WeaponManager.getCurrentWeapon()].name
    );
  }

  // Create timer display
  static createTimerDisplay(scene) {
    scene.timerText = TextHelper.createTimerDisplay(
      scene,
      Config.GAME_WIDTH - 200,
      50
    );
  }

  // Create turn indicator
  static createTurnIndicator(scene) {
    scene.playerIndicator = TextHelper.createTurnIndicator(
      scene,
      Config.GAME_WIDTH / 2,
      20,
      0 // Default to player 1 initially
    );
  }

  // Create instructions
  static createInstructions(scene) {
    return TextHelper.createInstructions(scene, Config.GAME_WIDTH / 2, 50);
  }

  // Update turn display
  static updateTurnIndicator(scene, currentPlayer) {
    // Recreate turn indicator with proper styling using TextHelper
    if (scene.playerIndicator) {
      scene.playerIndicator.destroy();
    }

    scene.playerIndicator = TextHelper.createTurnIndicator(
      scene,
      Config.GAME_WIDTH / 2,
      20,
      currentPlayer
    );

    // Highlight current player
    scene.players.forEach((p, index) => {
      p.graphics.setAlpha(index === currentPlayer ? 1.0 : 0.5);
    });
  }

  // Update timer display
  static updateTimer(scene, timeLeft) {
    scene.timerText.setText(`Time: ${Math.ceil(timeLeft)}`);
  }

  // 🎯 Initialize all game UI elements (comprehensive single method)
  static initializeGameUI(scene) {
    console.log("🎨 UIManager: Initializing complete game UI setup");

    // Create all UI elements in logical sequence
    UIManager.createHealthBars(scene);
    UIManager.createWeaponDisplay(scene);
    UIManager.createTimerDisplay(scene);
    UIManager.createTurnIndicator(scene);
    UIManager.createInstructions(scene);

    console.log("✅ UIManager: Game UI initialization completed");
  }
}

window.UIManager = UIManager;
