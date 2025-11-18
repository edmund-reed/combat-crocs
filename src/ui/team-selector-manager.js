// Team Selector Manager for Combat Crocs
// Handles team selection UI creation and management
class TeamSelectorManager {
  // Update teams array when team count changes
  static updateTeamsForCount(scene) {
    // Adjust teams array based on new count
    while (scene.teams.length < scene.teamCount) {
      const newTeamId = scene.teams.length + 1;
      const defaultColor = scene.availableColors[(newTeamId - 1) % scene.availableColors.length];
      scene.teams.push({
        id: newTeamId,
        name: `Team ${newTeamId}`,
        crocCount: 1,
        color: defaultColor,
      });
    }

    // Remove excess teams
    while (scene.teams.length > scene.teamCount) {
      scene.teams.pop();
    }
  }

  // Create all team selection areas
  static createTeamSelection(scene) {
    // Clear any existing team selector UI elements first
    this.clearExistingTeamUI(scene);

    const startY = 340; // Moved down 30px

    // All teams in one row, adjust width based on team count for better spacing
    let availableWidth;
    if (scene.teamCount === 2) {
      availableWidth = 400; // Closer for 2 teams
    } else if (scene.teamCount === 3) {
      availableWidth = 600; // Moderate for 3 teams
    } else if (scene.teamCount === 4) {
      availableWidth = 800; // Wider for 4 teams
    } else {
      availableWidth = 1000; // Full width for 5 teams
    }
    const spacing = scene.teamCount <= 1 ? 0 : availableWidth / (scene.teamCount - 1);

    for (let i = 0; i < scene.teamCount; i++) {
      const team = scene.teams[i];

      // Center all teams horizontally across the screen
      let xPos;
      if (scene.teamCount === 1) {
        xPos = Config.GAME_WIDTH / 2;
      } else {
        // Evenly distribute teams across the available width
        const startX = Config.GAME_WIDTH / 2 - availableWidth / 2;
        xPos = startX + i * spacing;
      }

      const yPos = startY;

      // Create dynamic team selector that directly updates teams array
      this.createDynamicTeamSelector(scene, xPos, yPos, team, i);
    }
  }

  // Create individual team selector UI
  static createDynamicTeamSelector(scene, x, y, team, teamIndex) {
    // Initialize UI elements array if not exists
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

    // Minus button logic
    minusBtn.on("pointerdown", () => {
      if (team.crocCount > 1) {
        team.crocCount--;
        countText.setText(team.crocCount);
        UIManager.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    });

    // Plus button logic
    plusBtn.on("pointerdown", () => {
      if (team.crocCount < 3) {
        // Max per team still 3
        team.crocCount++;
        countText.setText(team.crocCount);
        UIManager.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    });

    // Color selection
    const colorY = y + 110;
    UIManager.createColorSelector(scene, x, colorY, team, scene.availableColors);

    // Initial croc preview
    UIManager.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
  }

  // Refresh the team selection UI
  static refreshTeamSelection(scene) {
    // Sync team counts for SceneUtils compatibility before regenerating UI
    scene.teamACount = scene.teams[0]?.crocCount || 1;
    scene.teamBCount = scene.teams[1]?.crocCount || 1;

    // Regenerate team selection UI based on current teams
    this.createTeamSelection(scene);
  }

  // Clear existing team UI elements
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
