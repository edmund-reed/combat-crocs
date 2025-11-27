// UI Components for Combat Crocs
class UIComponents {
  // Create color button for team selection
  static createColorButton = (scene, colorOption, isSelected, x, y) => {
    const btn = scene.add
      .graphics()
      .fillStyle(colorOption.hex)
      .fillRect(0, 0, 25, 25)
      .lineStyle(isSelected ? 3 : 1, isSelected ? 0x000000 : 0xffffff)
      .strokeRect(0, 0, 25, 25);

    btn.setPosition(x, y);
    btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 25, 25), Phaser.Geom.Rectangle.Contains);
    return btn;
  };

  // Handle color selection for team
  static handleColorSelection = (team, colorOption, scene) => {
    team.color = colorOption;
    TeamSelectorManager.refreshTeamSelection(scene);
  };

  // Ensure sprite array exists for team
  static ensureSpriteArray = (scene, teamIndex) => {
    if (!scene.spriteArrays) scene.spriteArrays = [];
    if (!scene.spriteArrays[teamIndex]) scene.spriteArrays[teamIndex] = [];
    return scene.spriteArrays[teamIndex];
  };

  // Get sprite key for team preview
  static getTeamSpriteKey = teamId => {
    const sprites = ["croc1", "croc2", "chameleon1", "gecko1"];
    return sprites[(teamId - 1) % sprites.length];
  };

  static createWeaponDisplay = scene => {
    const { turnManager: tm } = scene;
    scene.weaponText = scene.add.text(Config.GAME_WIDTH - 200, 20, `Weapon: ${tm.getCurrentWeapon()}`, {
      ...UITextHelpers._getPrimaryTextStyle(16, 0),
      font: "16px Arial",
    });
  };

  static createTimerDisplay = scene => {
    scene.timerText = scene.add.text(Config.GAME_WIDTH - 200, 50, "Time: 30", {
      font: "16px Arial",
      fill: "#FFFFFF",
    });
  };

  static createTurnIndicator = scene => {
    scene.playerIndicator = UITextHelpers.createInteractiveText(
      scene,
      Config.GAME_WIDTH / 2,
      20,
      "Player 1's Turn",
      UITextHelpers._getPrimaryTextStyle(20),
      0.5,
    );
  };

  static createInstructions = scene => {
    return scene.add
      .text(
        Config.GAME_WIDTH / 2,
        50,
        "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
        {
          font: "14px Arial",
          fill: "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5);
  };

  static createColorSelector = (scene, x, y, team, availableColors) => {
    const colorLabel = scene.add.text(x, y - 20, "Color", UITextHelpers._getPrimaryTextStyle(16, 1)).setOrigin(0.5);
    scene.teamUIElements.push(colorLabel);

    const buttonSpacing = 35;
    const startX = x - ((availableColors.length - 1) * buttonSpacing) / 2;

    availableColors.forEach((colorOption, colorIndex) => {
      const isSelected = team.color?.hex === colorOption.hex;
      const colorBtn = this.createColorButton(scene, colorOption, isSelected, startX + colorIndex * buttonSpacing, y);

      colorBtn.on("pointerdown", () => this.handleColorSelection(team, colorOption, scene));
      scene.teamUIElements.push(colorBtn);
    });

    if (!team.color) {
      team.color = availableColors[(team.id - 1) % availableColors.length];
    }
  };

  static updateCrocPreview = (scene, x, y, count, teamIndex) => {
    if (!scene.teams?.[teamIndex]) {
      console.warn(`Team at index ${teamIndex} not found, skipping croc preview`);
      return;
    }

    const spriteArray = this.ensureSpriteArray(scene, teamIndex);

    spriteArray.forEach(sprite => sprite.destroy());
    spriteArray.length = 0;

    const spriteKey = this.getTeamSpriteKey(scene.teams[teamIndex].id);
    const spacing = 60,
      startX = x - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const croc = scene.add.sprite(startX + i * spacing, y, spriteKey).setScale(0.08);
      spriteArray.push(croc);
    }
  };

  static createTeamCountSelector = scene => {
    const selectorY = 170,
      centerX = Config.GAME_WIDTH / 2;

    scene.add.text(centerX, selectorY, "Number of Teams", UITextHelpers._getPrimaryTextStyle(18)).setOrigin(0.5);

    const minusBtn = UIButtonHelpers.addHoverEffect(
      UITextHelpers.createInteractiveText(scene, centerX - 80, selectorY + 50, "-", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      }),
    );

    scene.teamCountText = scene.add
      .text(centerX, selectorY + 50, scene.teamCount, UITextHelpers._getPrimaryTextStyle(48, 3))
      .setOrigin(0.5);

    const plusBtn = UIButtonHelpers.addHoverEffect(
      UITextHelpers.createInteractiveText(scene, centerX + 80, selectorY + 50, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      }),
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
}

window.UIComponents = UIComponents;
