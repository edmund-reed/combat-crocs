import { Config } from "@config";
import { UITextHelpers } from "./ui-helpers.js";
import UIComponents from "./ui-components.js";
import TeamSelectorManager from "./team-selector-manager.js";
import HealthBarManager from "./health-bar-manager.js";
import WeaponMenuManager from "./weapon-menu.js";
import { InputManager, StateManager, PlayerManager } from "@utils";

class UIManager {
  static destroyElement(el) {
    if (Array.isArray(el)) el.forEach(e => this.destroyElement(e));
    else el?.destroy?.();
  }

  static HealthBar = HealthBarManager;
  static TeamSelector = TeamSelectorManager;
  static Components = UIComponents;

  static createModalOverlay(scene, closeCallback = null) {
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const overlay = scene.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, w, h).setDepth(1000);
    if (closeCallback) overlay.setInteractive().on("pointerdown", closeCallback);
    scene.modalOverlayActive = true;
    if (!scene.modalOverlays) scene.modalOverlays = [];
    scene.modalOverlays.push(overlay);
    return overlay;
  }

  static clearModalOverlays(scene) {
    scene.modalOverlayActive = false;
    scene.modalOverlays?.forEach(o => o.destroy());
    scene.modalOverlays = [];
  }

  static isModalOpen = scene => scene.modalOverlayActive || false;

  static _countBtn(scene, x, y, label, onClick) {
    const c = scene.add.container(x, y).setSize(40, 40).setInteractive();
    c.add(scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-20, -20, 40, 40, 8));
    const t = scene.add
      .text(0, 0, label, { font: "36px Arial", fill: "#FFFFFF", stroke: "#000000", strokeThickness: 3 })
      .setOrigin(0.5);
    c.add(t);
    c.on("pointerover", () => t.setScale(1.2));
    c.on("pointerout", () => t.setScale(1.0));
    c.on("pointerdown", onClick);
    return c;
  }

  static createTeamCountSelector(scene) {
    const cx = Config.GAME_WIDTH / 2,
      y = 155;
    scene.add
      .text(cx, y, "Number of Teams", {
        font: "18px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    scene.teamCountText = scene.add
      .text(cx, y + 35, scene.teamCount.toString(), {
        font: "48px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const update = (d, cond) => {
      if (cond()) {
        scene.teamCount += d;
        scene.teamCountText.setText(scene.teamCount);
        TeamSelectorManager.updateTeamsForCount(scene);
        TeamSelectorManager.refreshTeamSelection(scene);
      }
    };
    this._countBtn(scene, cx - 80, y + 35, "-", () => update(-1, () => scene.teamCount > 2));
    this._countBtn(scene, cx + 80, y + 35, "+", () => update(1, () => scene.teamCount < 5));
  }

  static updateTimer = (scene, timeLeft) => scene.timerText.setText(`Time: ${Math.ceil(timeLeft)}`);

  static showGameEndScreen(scene, winnerTeam) {
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const back = () => {
      scene.scene.stop();
      scene.scene.start("MenuScene");
    };
    scene.add
      .graphics()
      .fillStyle(0x000000, 0.8)
      .fillRect(0, 0, w, h)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
      .on("pointerdown", back);
    UITextHelpers.primaryText(scene, w / 2, h / 2, `${winnerTeam} Wins!\n\nClick to return to menu`, 32)
      .setInteractive()
      .on("pointerdown", back);
  }

  static updateAimLine = scene => InputManager.updateAimLine(scene);
  static clearAimLine = scene => InputManager.clearAimLine(scene);
  static createWeaponSelectIcon = scene => WeaponMenuManager.createWeaponSelectIcon(scene);
  static showWeaponSelectMenu = scene => WeaponMenuManager.showWeaponSelectMenu(scene);
  static hideWeaponSelectMenu = scene => WeaponMenuManager.hideWeaponSelectMenu(scene);
  static updateWeaponDisplay = scene =>
    scene.weaponText?.setText(`Weapon: ${scene.turnManager.getCurrentWeapon()}`);

  static updateTurnIndicator(scene, currentPlayer) {
    scene.playerIndicator.setText(`Player ${currentPlayer.id}'s Turn`);
    const teamColors = [0x00ff00, 0xffd23f, 0x0000ff, 0xff00ff, 0x00ffff];
    scene.playerIndicator.setFill(teamColors[(parseInt(currentPlayer.id.charAt(0)) - 1) % 5] || 0xffffff);
  }

  static updatePlayerHighlighting = (scene, idx) =>
    scene.players.forEach((p, i) => p.graphics.setAlpha(i === idx ? 1.0 : 0.5));

  static createGameUI(scene) {
    HealthBarManager.createHealthBars(scene);
    UIComponents.createWeaponDisplay(scene);
    UIComponents.createTimerDisplay(scene);
    UIComponents.createTurnIndicator(scene);
    UIComponents.createInstructions(scene);
    WeaponMenuManager.createWeaponSelectIcon(scene);
  }

  static checkAndHandleGameEnd(scene) {
    const teams = StateManager.getTeams();
    const alive = teams.filter(t =>
      scene.players
        .filter(p => String(p.id).startsWith(t.id))
        .some((p, _, arr) => PlayerManager.isPlayerAlive(scene, scene.players.indexOf(p))),
    );
    if (alive.length === 1) {
      this.showGameEndScreen(scene, alive[0].name);
      return true;
    }
    if (alive.length === 0) {
      this.showGameEndScreen(scene, "No One");
      return true;
    }
    return false;
  }
}

export default UIManager;
