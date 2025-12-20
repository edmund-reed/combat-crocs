import { Config } from "@config";
import { UITextHelpers, UISceneHelpers, UIButtonHelpers } from "./ui-helpers.js";
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

  static createModalOverlay(scene, closeCallback = null) {
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const overlay = scene.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, w, h).setDepth(1000);
    if (closeCallback) overlay.setInteractive().on("pointerdown", closeCallback);
    scene.modalOverlayActive = true;
    (scene.modalOverlays ||= []).push(overlay);
    return overlay;
  }

  static clearModalOverlays(scene) {
    scene.modalOverlayActive = false;
    scene.modalOverlays?.forEach(o => o.destroy());
    scene.modalOverlays = [];
  }

  static isModalOpen = scene => scene.modalOverlayActive || false;

  static createTeamCountSelector(scene) {
    const cx = Config.GAME_WIDTH / 2;
    const y = 150;

    UISceneHelpers.styledText(scene, cx, y, "Number of Teams", 18, 3);
    scene.teamCountText = UISceneHelpers.styledText(scene, cx, y + 35, scene.teamCount.toString(), 48, 4);

    const update = (d, cond) => {
      if (cond()) {
        scene.teamCount += d;
        scene.teamCountText.setText(scene.teamCount);
        TeamSelectorManager.updateTeamsForCount(scene);
        TeamSelectorManager.refreshTeamSelection(scene);
      }
    };

    const btn = (x, label, onClick) => {
      // prettier-ignore
      const c = scene.add.container(x, y + 35).setSize(40, 40).setInteractive();
      c.add(scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-20, -20, 40, 40, 8));
      c.add(UITextHelpers.primaryText(scene, 0, 0, label, 36));
      c.on("pointerdown", onClick);
      UIButtonHelpers.addHoverEffect(c, 1.2);
      return c;
    };

    btn(cx - 80, "-", () => update(-1, () => scene.teamCount > 2));
    btn(cx + 80, "+", () => update(1, () => scene.teamCount < 5));
  }

  static updateTimer = (scene, timeLeft) => scene.timerText.setText(`Time: ${Math.ceil(timeLeft)}`);

  static showGameEndScreen(scene, winnerTeam) {
    const { GAME_WIDTH: w, GAME_HEIGHT: h } = Config;
    const back = () => (scene.scene.stop(), scene.scene.start("MenuScene"));
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
    scene.weaponText = UITextHelpers.primaryText(
      scene,
      Config.GAME_WIDTH - 200,
      20,
      `Weapon: ${scene.turnManager.getCurrentWeapon()}`,
      16,
    );
    scene.timerText = UITextHelpers.secondaryText(scene, Config.GAME_WIDTH - 200, 50, "Time: 30", 16);
    scene.playerIndicator = UITextHelpers.primaryText(
      scene,
      Config.GAME_WIDTH / 2,
      20,
      "Player 1's Turn",
      20,
    );
    UITextHelpers.secondaryText(
      scene,
      Config.GAME_WIDTH / 2,
      50,
      "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
      14,
    );
    WeaponMenuManager.createWeaponSelectIcon(scene);
  }

  static checkAndHandleGameEnd(scene) {
    const teams = StateManager.getTeams();
    const alive = teams.filter(t =>
      scene.players
        .filter(p => String(p.id).startsWith(t.id))
        .some((p, _, arr) => PlayerManager.isPlayerAlive(scene, scene.players.indexOf(p))),
    );
    if (alive.length === 1) return this.showGameEndScreen(scene, alive[0].name), true;
    if (alive.length === 0) return this.showGameEndScreen(scene, "No One"), true;
    return false;
  }
}

export default UIManager;
