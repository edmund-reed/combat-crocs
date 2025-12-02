import { Config } from "@config";
import { UITextHelpers } from "@ui";
import TeamSelectorManager from "./team-selector-manager.js";

class UIComponents {
  static createColorButton = (scene, colorOption, isSelected, x, y) => {
    const btn = scene.add
      .graphics()
      .fillStyle(colorOption.hex)
      .fillRect(0, 0, 25, 25)
      .lineStyle(isSelected ? 3 : 1, isSelected ? 0x000000 : 0xffffff)
      .strokeRect(0, 0, 25, 25)
      .setPosition(x, y)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 25, 25), Phaser.Geom.Rectangle.Contains);
    return btn;
  };

  static ensureSpriteArray = (scene, teamIndex) => {
    if (!scene.spriteArrays) scene.spriteArrays = [];
    if (!scene.spriteArrays[teamIndex]) scene.spriteArrays[teamIndex] = [];
    return scene.spriteArrays[teamIndex];
  };

  static getTeamSpriteKey = teamId => ["croc1", "croc2", "chameleon1", "gecko1"][(teamId - 1) % 4];

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

  static createInstructions = scene => {
    return UITextHelpers.secondaryText(
      scene,
      Config.GAME_WIDTH / 2,
      50,
      "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
      14,
    );
  };

  static createColorSelector = (scene, x, y, team, availableColors) => {
    scene.teamUIElements.push(UITextHelpers.primaryText(scene, x, y - 20, "Color", 16));

    const buttonSpacing = 35;
    const startX = x - ((availableColors.length - 1) * buttonSpacing) / 2;

    availableColors.forEach((colorOption, colorIndex) => {
      const colorBtn = this.createColorButton(
        scene,
        colorOption,
        team.color?.hex === colorOption.hex,
        startX + colorIndex * buttonSpacing,
        y,
      );
      colorBtn.on("pointerdown", () => {
        team.color = colorOption;
        TeamSelectorManager.refreshTeamSelection(scene);
      });
      scene.teamUIElements.push(colorBtn);
    });

    if (!team.color) team.color = availableColors[(team.id - 1) % availableColors.length];
  };

  static updateCrocPreview = (scene, x, y, count, teamIndex) => {
    if (!scene.teams?.[teamIndex]) return console.warn(`Team at index ${teamIndex} not found`);

    const spriteArray = this.ensureSpriteArray(scene, teamIndex);
    spriteArray.forEach(sprite => sprite.destroy());
    spriteArray.length = 0;

    const spriteKey = this.getTeamSpriteKey(scene.teams[teamIndex].id);
    const spacing = 60,
      startX = x - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      spriteArray.push(scene.add.sprite(startX + i * spacing, y, spriteKey).setScale(0.08));
    }
  };
}

export default UIComponents;
