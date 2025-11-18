// UI Components for Combat Crocs
class UIComponents {
  static createWeaponDisplay(scene) {
    const { turnManager: tm } = scene;
    scene.weaponText = scene.add.text(
      Config.GAME_WIDTH - 200,
      20,
      `Weapon: ${Config.WEAPON_TYPES[tm.getCurrentWeapon()].name}`,
      { ...UITextHelpers._getPrimaryTextStyle(16, 0), font: "16px Arial" },
    );
  }

  static createTimerDisplay(scene) {
    scene.timerText = scene.add.text(Config.GAME_WIDTH - 200, 50, "Time: 30", {
      font: "16px Arial",
      fill: "#FFFFFF",
    });
  }

  static createTurnIndicator(scene) {
    scene.playerIndicator = UITextHelpers.createInteractiveText(
      scene,
      Config.GAME_WIDTH / 2,
      20,
      "Player 1's Turn",
      UITextHelpers._getPrimaryTextStyle(20),
      0.5,
    );
  }

  static createInstructions(scene) {
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
  }

  static createColorSelector(parentScene, x, y, team, availableColors) {
    // Label for color selection using helper
    const colorLabel = parentScene.add
      .text(x, y - 20, "Color", UITextHelpers._getPrimaryTextStyle(16, 1))
      .setOrigin(0.5);
    parentScene.teamUIElements.push(colorLabel);

    // Create color swatch buttons
    const buttonSpacing = 35;
    const startX = x - ((availableColors.length - 1) * buttonSpacing) / 2;

    // Create a color button for each available color
    availableColors.forEach((colorOption, colorIndex) => {
      // Current selection
      const isSelected = team.color && team.color.hex === colorOption.hex;

      const colorBtn = parentScene.add
        .graphics()
        .fillStyle(colorOption.hex)
        .fillRect(0, 0, 25, 25)
        .lineStyle(isSelected ? 3 : 1, isSelected ? 0x000000 : 0xffffff)
        .strokeRect(0, 0, 25, 25);

      colorBtn.setPosition(startX + colorIndex * buttonSpacing, y);
      colorBtn.setInteractive(new Phaser.Geom.Rectangle(0, 0, 25, 25), Phaser.Geom.Rectangle.Contains);

      colorBtn.on("pointerdown", () => {
        // Set new color for this team
        team.color = colorOption;

        // Refresh the team selection to update selection indicators
        parentScene.refreshTeamSelection();
      });

      parentScene.teamUIElements.push(colorBtn);
    });

    // Set default color if none selected
    if (!team.color) {
      team.color = availableColors[(team.id - 1) % availableColors.length];
    }
  }

  static updateCrocPreview(parentScene, x, y, count, teamIndex) {
    // Safety check - make sure team exists
    if (!parentScene.teams || !parentScene.teams[teamIndex]) {
      console.warn(`Team at index ${teamIndex} not found, skipping croc preview`);
      return;
    }

    // Create unique sprite array for each team if not exists
    if (!parentScene.spriteArrays) {
      parentScene.spriteArrays = [];
    }
    if (!parentScene.spriteArrays[teamIndex]) {
      parentScene.spriteArrays[teamIndex] = [];
    }

    const spriteArray = parentScene.spriteArrays[teamIndex];

    // Remove existing crocs for this team only
    if (spriteArray && spriteArray.length > 0) {
      spriteArray.forEach(sprite => sprite.destroy());
    }

    // Clear the array
    spriteArray.length = 0;

    // Get the team for sprite selection
    const team = parentScene.teams[teamIndex];

    // Use team-consistent sprites: rotate through all available sprites
    const availableSprites = ["croc1", "croc2", "chameleon1", "gecko1"];
    const spriteKey = availableSprites[(team.id - 1) % availableSprites.length];

    // Create croc sprites based on count - smaller for preview
    const spacing = 60;
    const startX = x - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const croc = parentScene.add.sprite(startX + i * spacing, y, spriteKey);
      croc.setScale(0.08); // Smaller for preview
      spriteArray.push(croc);
    }
  }

  static createTeamCountSelector(scene) {
    const selectorY = 170;

    // Label with primary styling
    scene.add
      .text(Config.GAME_WIDTH / 2, selectorY, "Number of Teams", UITextHelpers._getPrimaryTextStyle(18))
      .setOrigin(0.5);

    // Create buttons with helper functions
    const minusBtn = UIButtonHelpers.addHoverEffect(
      UITextHelpers.createInteractiveText(scene, Config.GAME_WIDTH / 2 - 80, selectorY + 50, "-", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      }),
    );

    // Count display
    scene.teamCountText = scene.add
      .text(Config.GAME_WIDTH / 2, selectorY + 50, scene.teamCount, UITextHelpers._getPrimaryTextStyle(48, 3))
      .setOrigin(0.5);

    const plusBtn = UIButtonHelpers.addHoverEffect(
      UITextHelpers.createInteractiveText(scene, Config.GAME_WIDTH / 2 + 80, selectorY + 50, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      }),
    );

    // Button logic - inline for compactness
    minusBtn.on("pointerdown", () => {
      if (scene.teamCount > 2) {
        scene.teamCount--;
        scene.teamCountText.setText(scene.teamCount);
        TeamSelectorManager.updateTeamsForCount(scene);
        TeamSelectorManager.refreshTeamSelection(scene);
      }
    });

    plusBtn.on("pointerdown", () => {
      if (scene.teamCount < 5) {
        scene.teamCount++;
        scene.teamCountText.setText(scene.teamCount);
        TeamSelectorManager.updateTeamsForCount(scene);
        TeamSelectorManager.refreshTeamSelection(scene);
      }
    });
  }
}

window.UIComponents = UIComponents;
