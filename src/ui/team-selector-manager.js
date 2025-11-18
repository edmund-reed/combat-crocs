// Team Selector Manager for Combat Crocs
// Handles team selection UI creation and management
class TeamSelectorManager {
  static updateTeamsForCount(scene) {
    // Adjust teams array based on new count
    while (scene.teams.length < scene.teamCount) {
      const newTeamId = scene.teams.length + 1;
      scene.teams.push({
        id: newTeamId,
        name: `Team ${newTeamId}`,
        crocCount: 1,
        color: scene.availableColors[(newTeamId - 1) % scene.availableColors.length],
      });
    }

    // Remove excess teams
    while (scene.teams.length > scene.teamCount) {
      scene.teams.pop();
    }
  }

  static createTeamSelection(scene) {
    this.clearExistingTeamUI(scene);

    const availableWidth = Math.min(scene.teamCount * 200, 1000);

    for (let i = 0; i < scene.teamCount; i++) {
      const team = scene.teams[i];

      // Center all teams horizontally across the screen
      let xPos;
      if (scene.teamCount === 1) {
        xPos = Config.GAME_WIDTH / 2;
      } else {
        // Evenly distribute teams across the available width
        const startX = Config.GAME_WIDTH / 2 - availableWidth / 2;
        xPos = startX + i * (scene.teamCount <= 1 ? 0 : availableWidth / (scene.teamCount - 1));
      }

      this.createDynamicTeamSelector(scene, xPos, 340, team, i);
    }
  }

  static createDynamicTeamSelector(scene, x, y, team, teamIndex) {
    if (!scene.teamUIElements) {
      scene.teamUIElements = [];
    }

    // Team label
    const teamLabel = scene.add.text(x, y, team.name, UITextHelpers._getPrimaryTextStyle(24, 2)).setOrigin(0.5);
    scene.teamUIElements.push(teamLabel);

    // Count display and controls
    const countY = y + 60;

    // Minus button (to left of count)
    const minusBtn = scene.add
      .text(x - 60, countY, "-", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();
    scene.teamUIElements.push(minusBtn);

    // Count display
    const countText = scene.add
      .text(x, countY, team.crocCount, UITextHelpers._getPrimaryTextStyle(48, 3))
      .setOrigin(0.5);
    scene.teamUIElements.push(countText);

    // Plus button (to right of count)
    const plusBtn = scene.add
      .text(x + 60, countY, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();
    scene.teamUIElements.push(plusBtn);

    // Button hover effects - apply global helper
    UIButtonHelpers.addHoverEffect(minusBtn, "#FF6B35");
    UIButtonHelpers.addHoverEffect(plusBtn, "#FF6B35");

    minusBtn.on("pointerdown", () => {
      if (team.crocCount > 1) {
        team.crocCount--;
        countText.setText(team.crocCount);
        UIManager.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    });

    plusBtn.on("pointerdown", () => {
      if (team.crocCount < 3) {
        // Max per team still 3
        team.crocCount++;
        countText.setText(team.crocCount);
        UIManager.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    });

    UIManager.createColorSelector(scene, x, y + 110, team, scene.availableColors);
    UIManager.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
  }

  static refreshTeamSelection(scene) {
    // Sync team counts for SceneUtils compatibility before regenerating UI
    scene.teamACount = scene.teams[0]?.crocCount || 1;
    scene.teamBCount = scene.teams[1]?.crocCount || 1;

    // Regenerate team selection UI based on current teams
    this.createTeamSelection(scene);
  }

  static clearExistingTeamUI(scene) {
    // Destroy all team-related UI elements from previous renders
    if (scene.teamUIElements) {
      scene.teamUIElements.forEach(element => element.destroy());
      scene.teamUIElements = [];
    }

    // Destroy all sprites in team arrays (legacy SceneUtils arrays)
    if (scene.teamASprites) {
      scene.teamASprites.forEach(sprite => sprite.destroy());
      scene.teamASprites = [];
    }
    if (scene.teamBSprites) {
      scene.teamBSprites.forEach(sprite => sprite.destroy());
      scene.teamBSprites = [];
    }

    // Destroy all sprites in new dynamic sprite arrays
    if (scene.spriteArrays) {
      scene.spriteArrays.forEach(teamSprites => {
        if (teamSprites && teamSprites.length > 0) {
          teamSprites.forEach(sprite => sprite.destroy());
          teamSprites.length = 0;
        }
      });
    }
  }
}

window.TeamSelectorManager = TeamSelectorManager;
