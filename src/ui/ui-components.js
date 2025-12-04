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

  static getTeamSpriteKey = teamId => ["croc-1", "croc-2", "chameleon-1", "gecko-1"][(teamId - 1) % 4];

  static getSpriteForPlayer = (characterType, colorHex = null) => {
    const { Config } = require("@config");

    if (!characterType || !Config.CHARACTER_TYPES[characterType]) {
      return "croc-red"; // Default fallback
    }

    const charData = Config.CHARACTER_TYPES[characterType];
    const colorName = colorHex ? Config.COLOR_NAMES[colorHex] || "red" : "red";

    // Return the combined sprite key: baseName-colorName
    return `${charData.baseName}-${colorName}`;
  };

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
    // Removed "Color" heading

    // Create container for color buttons to center them within the team tile
    const colorContainer = scene.add.container(x, y);

    const buttonSpacing = 35;
    const totalWidth = (availableColors.length - 1) * buttonSpacing;
    const startX = -totalWidth / 2; // Center the buttons within the container

    availableColors.forEach((colorOption, colorIndex) => {
      const colorBtn = this.createColorButton(
        scene,
        colorOption,
        team.color?.hex === colorOption.hex,
        startX + colorIndex * buttonSpacing,
        0, // Relative to container
      );
      colorBtn.on("pointerdown", () => {
        team.color = colorOption;
        TeamSelectorManager.refreshTeamSelection(scene);
      });
      colorContainer.add(colorBtn);
    });

    if (!team.color) team.color = availableColors[(team.id - 1) % availableColors.length];

    // Return the color container for proper nesting in team containers
    return colorContainer;
  };

  static updateCrocPreview = (scene, x, y, count, teamIndex) => {
    if (!scene.teams?.[teamIndex]) return console.warn(`Team at index ${teamIndex} not found`);

    const spriteArray = this.ensureSpriteArray(scene, teamIndex);
    spriteArray.forEach(sprite => sprite.destroy());
    spriteArray.length = 0;

    // Dynamic spacing: closer together with more players (max 5 players)
    // Spacing decreases more aggressively from 45px (1-2 players) to 25px (5 players)
    const baseSpacing = 45;
    const minSpacing = 25;
    const spacingReduction = Math.max(0, count - 2) * 5; // Reduce by 5px per player over 2
    const spacing = Math.max(minSpacing, baseSpacing - spacingReduction);
    const startX = x - ((count - 1) * spacing) / 2;

    const { Config } = require("@config");
    const characterTypeKeys = Object.keys(Config.CHARACTER_TYPES);

    for (let i = 0; i < count; i++) {
      const characterType = scene.teams[teamIndex].players?.[i]?.characterType || "CROCODILE";
      const teamColor = scene.teams[teamIndex].color?.hex;
      const spriteKey = this.getSpriteForPlayer(characterType, teamColor);

      const sprite = scene.add.sprite(startX + i * spacing, y, spriteKey);
      // Set all sprites to exactly 80px tall in team selection
      const { Config } = require("@config");
      sprite.setDisplaySize(Config.SPRITE_SIZES.UI_CHARACTER.width, Config.SPRITE_SIZES.UI_CHARACTER.height);
      sprite.setInteractive();

      // Add click handler to cycle through character types
      sprite.on("pointerdown", () => {
        // Read current character type from team data (not from closure)
        const currentCharacterType = scene.teams[teamIndex].players?.[i]?.characterType || "CROCODILE";
        const currentIndex = characterTypeKeys.indexOf(currentCharacterType);
        const nextIndex = (currentIndex + 1) % characterTypeKeys.length;
        const nextCharacterType = characterTypeKeys[nextIndex];

        // Update the team's player character type
        if (!scene.teams[teamIndex].players) scene.teams[teamIndex].players = [];
        if (!scene.teams[teamIndex].players[i]) scene.teams[teamIndex].players[i] = {};
        scene.teams[teamIndex].players[i].characterType = nextCharacterType;

        // Update the sprite with new character type and current team color
        const newSpriteKey = this.getSpriteForPlayer(nextCharacterType, teamColor);
        sprite.setTexture(newSpriteKey);
        // Ensure the new sprite is also exactly 80px tall
        sprite.setDisplaySize(Config.SPRITE_SIZES.UI_CHARACTER.width, Config.SPRITE_SIZES.UI_CHARACTER.height);
      });

      spriteArray.push(sprite);
    }
  };
}

export default UIComponents;
