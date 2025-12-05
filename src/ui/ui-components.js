import { Config } from "@config";
import { UITextHelpers } from "@ui";
import TeamSelectorManager from "./team-selector-manager.js";
import { CharacterHelper } from "@utils/character-helper";

class UIComponents {
  static createColorButton = (scene, color, isSelected, x, y) =>
    scene.add
      .graphics()
      .fillStyle(color.hex)
      .fillRect(0, 0, 25, 25)
      .lineStyle(isSelected ? 3 : 1, isSelected ? 0x000000 : 0xffffff)
      .strokeRect(0, 0, 25, 25)
      .setPosition(x, y)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 25, 25), Phaser.Geom.Rectangle.Contains);

  static createWeaponDisplay = scene => {
    scene.weaponText = UITextHelpers.primaryText(
      scene,
      Config.GAME_WIDTH - 200,
      20,
      `Weapon: ${scene.turnManager.getCurrentWeapon()}`,
      16,
    );
  };
  static createTimerDisplay = scene => {
    scene.timerText = UITextHelpers.secondaryText(scene, Config.GAME_WIDTH - 200, 50, "Time: 30", 16);
  };
  static createTurnIndicator = scene => {
    scene.playerIndicator = UITextHelpers.primaryText(scene, Config.GAME_WIDTH / 2, 20, "Player 1's Turn", 20);
  };
  static createInstructions = scene =>
    UITextHelpers.secondaryText(
      scene,
      Config.GAME_WIDTH / 2,
      50,
      "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
      14,
    );

  static createColorSelector(scene, x, y, team, colors) {
    const c = scene.add.container(x, y);
    const spacing = 35,
      start = -((colors.length - 1) * spacing) / 2;
    colors.forEach((col, i) => {
      const btn = this.createColorButton(scene, col, team.color?.hex === col.hex, start + i * spacing, 0);
      btn.on("pointerdown", () => {
        team.color = col;
        TeamSelectorManager.refreshTeamSelection(scene);
      });
      c.add(btn);
    });
    if (!team.color) team.color = colors[(team.id - 1) % colors.length];
    return c;
  }

  static updateCrocPreview(scene, x, y, count, teamIdx) {
    if (!scene.teams?.[teamIdx]) return;
    const arr = ((scene.spriteArrays ||= [])[teamIdx] ||= []);
    arr.forEach(s => s.destroy());
    arr.length = 0;

    const spacing = Math.max(25, 45 - Math.max(0, count - 2) * 5);
    const start = x - ((count - 1) * spacing) / 2;
    const types = Object.keys(Config.CHARACTER_TYPES);
    const team = scene.teams[teamIdx];

    for (let i = 0; i < count; i++) {
      const charType = team.players?.[i]?.characterType || "CROCODILE";
      const sprite = scene.add
        .sprite(start + i * spacing, y, CharacterHelper.getSpriteKey(charType, team.color?.hex))
        .setDisplaySize(Config.SPRITE_SIZES.UI_CHARACTER.width, Config.SPRITE_SIZES.UI_CHARACTER.height)
        .setInteractive();

      sprite.on("pointerdown", () => {
        const next = types[(types.indexOf(team.players?.[i]?.characterType || "CROCODILE") + 1) % types.length];
        (team.players ||= [])[i] = { ...(team.players[i] || {}), characterType: next };
        sprite
          .setTexture(CharacterHelper.getSpriteKey(next, team.color?.hex))
          .setDisplaySize(Config.SPRITE_SIZES.UI_CHARACTER.width, Config.SPRITE_SIZES.UI_CHARACTER.height);
      });
      arr.push(sprite);
    }
  }
}

export default UIComponents;
