import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "./ui-helpers.js";
import UIComponents from "./ui-components.js";
import TeamSelectorManager from "./team-selector-manager.js";
import HealthBarManager from "./health-bar-manager.js";
import WeaponMenuManager from "./weapon-menu.js";
import ModalManager from "./modal-manager.js";
import { InputManager, TurnManager, GameStateManager, PlayerManager } from "@utils";

class UIManager {
  static HealthBar = HealthBarManager;
  static TeamSelector = TeamSelectorManager;
  static Components = UIComponents;

  static createTeamCountSelector = scene => {
    const { GAME_WIDTH } = Config;
    const selectorY = 170,
      centerX = GAME_WIDTH / 2;

    UITextHelpers.primaryText(scene, centerX, selectorY, "Number of Teams", 18);

    const minusBtn = UIButtonHelpers.addHoverEffect(
      UITextHelpers.createInteractiveText(scene, centerX - 80, selectorY + 50, "-", "primary", 36),
    );
    scene.teamCountText = UITextHelpers.primaryText(scene, centerX, selectorY + 50, scene.teamCount.toString(), 48);
    const plusBtn = UIButtonHelpers.addHoverEffect(
      UITextHelpers.createInteractiveText(scene, centerX + 80, selectorY + 50, "+", "primary", 36),
    );

    const updateCount = (modifier, condition) => {
      if (condition()) {
        scene.teamCount += modifier;
        scene.teamCountText.setText(scene.teamCount);
        TeamSelectorManager.updateTeamsForCount(scene);
        TeamSelectorManager.refreshTeamSelection(scene);
      }
    };

    minusBtn.on("pointerdown", () => updateCount(-1, () => scene.teamCount > 2));
    plusBtn.on("pointerdown", () => updateCount(1, () => scene.teamCount < 5));
  };

  static updateTimer = (scene, timeLeft) => scene.timerText.setText(`Time: ${Math.ceil(timeLeft)}`);

  // Show game end screen
  static showGameEndScreen(scene, winnerTeam) {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;
    const returnToMenu = () => {
      scene.scene.stop();
      scene.scene.start("MenuScene");
    };

    // Overlay
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    overlay.on("pointerdown", returnToMenu);

    // Game over text
    const gameOverText = UITextHelpers.primaryText(
      scene,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `${winnerTeam} Wins!\n\nClick to return to menu`,
      32,
    );
    gameOverText.setInteractive().on("pointerdown", returnToMenu);
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
    scene.playerIndicator.setText(`Player ${currentPlayer.id}'s Turn`);
    const teamId = parseInt(currentPlayer.id.charAt(0));
    const teamColors = [0x00ff00, 0xffd23f, 0x0000ff, 0xff00ff, 0x00ffff];
    scene.playerIndicator.setFill(teamColors[(teamId - 1) % teamColors.length] || 0xffffff);
  }

  static updatePlayerHighlighting = (scene, currentPlayerIndex) => {
    scene.players.forEach((p, i) => p.graphics.setAlpha(i === currentPlayerIndex ? 1.0 : 0.5));
  };

  static createGameUI(scene) {
    HealthBarManager.createHealthBars(scene);
    UIComponents.createWeaponDisplay(scene);
    UIComponents.createTimerDisplay(scene);
    UIComponents.createTurnIndicator(scene);
    UIComponents.createInstructions(scene);
    WeaponMenuManager.createWeaponSelectIcon(scene);
  }

  static checkAndHandleGameEnd(scene) {
    const teams = GameStateManager.getTeams();
    const aliveTeams = teams.filter(team => {
      const teamPlayers = scene.players.filter(p => typeof p.id === "string" && p.id.startsWith(team.id));
      return teamPlayers.some(p => PlayerManager.isPlayerAlive(scene, scene.players.indexOf(p)));
    });

    if (aliveTeams.length === 1) {
      this.showGameEndScreen(scene, aliveTeams[0].name);
      return true;
    } else if (aliveTeams.length === 0) {
      this.showGameEndScreen(scene, "No One");
      return true;
    }
    return false;
  }
}

export default UIManager;
