// UI utilities for Combat Crocs
class UIManager {
  // Health bars - delegated to HealthBarManager
  static createHealthBars = scene => HealthBarManager.createHealthBars(scene);
  static updateHealthBarPositions = scene => HealthBarManager.updateHealthBarPositions(scene);
  static updateHealthBars = scene => HealthBarManager.updateHealthBars(scene);
  static showGravestone = (scene, player) => HealthBarManager.showGravestone(scene, player);

  // UI Components - delegated to UIComponents
  static createWeaponDisplay = scene => UIComponents.createWeaponDisplay(scene);
  static createTimerDisplay = scene => UIComponents.createTimerDisplay(scene);
  static createTurnIndicator = scene => UIComponents.createTurnIndicator(scene);
  static createInstructions = scene => UIComponents.createInstructions(scene);

  // Update timer display
  static updateTimer(scene, timeLeft) {
    scene.timerText.setText(`Time: ${Math.ceil(timeLeft)}`);
  }

  // Show game end screen
  static showGameEndScreen(scene, winnerTeam) {
    // Don't pause the scene - keep input working
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    const gameOverText = scene.add
      .text(Config.GAME_WIDTH / 2, Config.GAME_HEIGHT / 2, `${winnerTeam} Wins!\n\nClick to return to menu`, {
        font: "bold 32px Arial",
        fill: "#FFD23F",
        align: "center",
      })
      .setOrigin(0.5);

    // Make it interactive and handle the click
    gameOverText.setInteractive();
    gameOverText.on("pointerdown", () => {
      scene.scene.stop();
      scene.scene.start("MenuScene");
    });

    // Also allow clicking anywhere on the overlay
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains,
    );
    overlay.on("pointerdown", () => {
      scene.scene.stop();
      scene.scene.start("MenuScene");
    });
  }

  // Aiming line - delegated to InputManager
  static updateAimLine = scene => InputManager.updateAimLine(scene);
  static clearAimLine = scene => InputManager.clearAimLine(scene);

  // Weapon menu - delegated to WeaponMenuManager and ModalManager
  static createWeaponSelectIcon = scene => WeaponMenuManager.createWeaponSelectIcon(scene);
  static showWeaponSelectMenu = scene => WeaponMenuManager.showWeaponSelectMenu(scene);
  static hideWeaponSelectMenu = scene => WeaponMenuManager.hideWeaponSelectMenu(scene);
  static createModalOverlay = (scene, callback) => ModalManager.createModalOverlay(scene, callback);
  static clearModalOverlays = scene => ModalManager.clearModalOverlays(scene);
  static isModalOpen = scene => ModalManager.isModalOpen(scene);

  // Weapon display update delegated to TurnManager
  static updateWeaponDisplay = scene => TurnManager.updateWeaponDisplay(scene);

  static updateTurnIndicator(scene, currentPlayer) {
    const playerName = `Player ${currentPlayer.id}`;
    scene.playerIndicator.setText(`${playerName}'s Turn`);

    // Color based on team ID
    const teamId = parseInt(currentPlayer.id.charAt(0));
    const teamColors = [0x00ff00, 0xffd23f, 0x0000ff, 0xff00ff, 0x00ffff]; // Green, Orange, Blue, Magenta, Cyan
    const color = teamColors[(teamId - 1) % teamColors.length] || 0xffffff;
    scene.playerIndicator.setFill(color);
  }

  static updatePlayerHighlighting(scene, currentPlayerIndex) {
    scene.players.forEach((player, index) => {
      player.graphics.setAlpha(index === currentPlayerIndex ? 1.0 : 0.5);
    });
  }

  // Create all UI elements for game scene (moved from GameScene.js)
  static createGameUI(scene) {
    this.createHealthBars(scene);
    this.createWeaponDisplay(scene);
    this.createTimerDisplay(scene);
    this.createTurnIndicator(scene);
    this.createInstructions(scene);
    this.createWeaponSelectIcon(scene);
  }

  // Check if game has ended and handle UI (moved from GameScene.js)
  static checkAndHandleGameEnd(scene) {
    const teams = GameStateManager.getTeams();

    // Check which teams have living players
    const aliveTeams = teams.filter(team => {
      const teamPlayers = scene.players.filter(p => typeof p.id === "string" && p.id.startsWith(team.id));
      return teamPlayers.some(p => p.health > 0);
    });

    // If only one team remains, they win
    if (aliveTeams.length === 1) {
      const winningTeam = aliveTeams[0];
      this.showGameEndScreen(scene, winningTeam.name);
      return true;
    } else if (aliveTeams.length === 0) {
      // Edge case: no teams alive (all players dead simultaneously)
      this.showGameEndScreen(scene, "No One");
      return true;
    }

    return false; // Game continues
  }
}

window.UIManager = UIManager;
