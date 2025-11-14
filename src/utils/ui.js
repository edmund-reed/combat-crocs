// UI utilities for Combat Crocs

class UIManager {
  // Create health bars - now delegates to HealthBarManager/Renderer
  static createHealthBars(scene) {
    const healthBarManager = HealthBarManager.getInstance();
    healthBarManager.initializeHealthBars(scene, scene.players.length);

    // Create text labels for health bars
    HealthBarRenderer.createLabels(scene, scene.players.length);
  }

  // Update health display - now delegates to HealthBarRenderer
  static updateHealthBars(scene) {
    // This method is now handled by HealthBarManager.updateHealthDisplay()
    // Keeping for backward compatibility but deprecated
    console.warn(
      "⚠️ UIManager.updateHealthBars() is deprecated - use HealthBarManager.updateHealthDisplay()"
    );
    const healthBarManager = HealthBarManager.getInstance();
    healthBarManager.updateHealthDisplay();
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

    // Create all UI elements in logical sequence
    UIManager.createHealthBars(scene);
    UIManager.createWeaponDisplay(scene);
    UIManager.createTimerDisplay(scene);
    UIManager.createTurnIndicator(scene);
    UIManager.createInstructions(scene);

  }
}

window.UIManager = UIManager;
