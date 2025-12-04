import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers } from "@ui";
import UIComponents from "./ui-components.js";

class TeamSelectorManager {
  static updateTeamsForCount(scene) {
    while (scene.teams.length < scene.teamCount) {
      const newTeamId = scene.teams.length + 1;
      scene.teams.push({
        id: newTeamId,
        name: `Team ${newTeamId}`,
        crocCount: 1,
        color: scene.availableColors[(newTeamId - 1) % scene.availableColors.length],
        players: [{ characterType: "CROCODILE" }], // Default first player as crocodile
      });
    }
    while (scene.teams.length > scene.teamCount) scene.teams.pop();
  }

  static createTeamSelection(scene) {
    this.clearExistingTeamUI(scene);
    const availableWidth = Math.min(scene.teamCount * 200, 1000);

    for (let i = 0; i < scene.teamCount; i++) {
      const team = scene.teams[i];
      const xPos =
        scene.teamCount === 1
          ? Config.GAME_WIDTH / 2
          : Config.GAME_WIDTH / 2 - availableWidth / 2 + i * (availableWidth / (scene.teamCount - 1));

      this.createDynamicTeamSelector(scene, xPos, 280, team, i); // Moved up by additional 20px (300 - 20 = 280)
    }
  }

  static createDynamicTeamSelector(scene, x, y, team, teamIndex) {
    if (!scene.teamUIElements) scene.teamUIElements = [];

    // Create team container with transparent black background
    const teamContainer = scene.add.container(x, y + 100); // Center the container vertically

    // Add background rectangle with rounded corners
    const bgRect = scene.add.graphics();
    bgRect.fillStyle(0x000000, 0.6); // Increased opacity from 0.5 to 0.6
    bgRect.fillRoundedRect(-120, -80, 240, 220, 15); // Width 240, height 220, corner radius 15
    teamContainer.add(bgRect);

    const teamNameText = scene.add
      .text(0, -80, team.name, {
        font: "bold 24px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    teamContainer.add(teamNameText);

    // Create container for minus button with background
    const minusContainer = scene.add.container(-100, 80); // Moved 5px to the right (from -105 to -100)
    const minusBg = scene.add.graphics();
    minusBg.fillStyle(0x000000, 0.6); // Transparent black background
    minusBg.fillRoundedRect(-16, -16, 32, 32, 6); // Smaller: 32x32 background with rounded corners
    minusBg.setInteractive(new Phaser.Geom.Rectangle(-16, -16, 32, 32), Phaser.Geom.Rectangle.Contains); // Make background clickable
    minusContainer.add(minusBg);

    const minusBtn = scene.add
      .text(0, 0, "-", {
        font: "28px Arial", // Smaller font
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2, // Reduced stroke
      })
      .setOrigin(0.5);
    minusContainer.add(minusBtn);
    teamContainer.add(minusContainer);

    // Keep countText for functionality but make it invisible since sprite count is visual
    const countText = scene.add
      .text(0, -20, team.crocCount.toString(), {
        font: "48px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0); // Invisible since sprite count shows the number
    teamContainer.add(countText);

    // Create container for plus button with background
    const plusContainer = scene.add.container(100, 80); // Moved 5px to the left (from 105 to 100)
    const plusBg = scene.add.graphics();
    plusBg.fillStyle(0x000000, 0.6); // Transparent black background
    plusBg.fillRoundedRect(-16, -16, 32, 32, 6); // Smaller: 32x32 background with rounded corners
    plusBg.setInteractive(new Phaser.Geom.Rectangle(-16, -16, 32, 32), Phaser.Geom.Rectangle.Contains); // Make background clickable
    plusContainer.add(plusBg);

    const plusBtn = scene.add
      .text(0, 0, "+", {
        font: "28px Arial", // Smaller font
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2, // Reduced stroke
      })
      .setOrigin(0.5);
    plusContainer.add(plusBtn);
    teamContainer.add(plusContainer);

    // Add hover effects
    minusBtn.on("pointerover", () => minusBtn.setScale(1.2));
    minusBtn.on("pointerout", () => minusBtn.setScale(1.0));
    plusBtn.on("pointerover", () => plusBtn.setScale(1.2));
    plusBtn.on("pointerout", () => plusBtn.setScale(1.0));

    // Add container to UI elements for cleanup
    scene.teamUIElements.push(teamContainer);

    const updateCount = (delta, condition) => {
      if (condition()) {
        team.crocCount += delta;

        // Update players array to match new count
        if (delta > 0) {
          // Adding a player - add default character type
          team.players.push({ characterType: "CROCODILE" });
        } else {
          // Removing a player - remove last player
          team.players.pop();
        }

        countText.setText(team.crocCount);
        UIComponents.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    };

    minusBtn.on("pointerdown", () => updateCount(-1, () => team.crocCount > 1));
    minusBg.on("pointerdown", () => updateCount(-1, () => team.crocCount > 1)); // Make background clickable
    plusBtn.on("pointerdown", () => updateCount(1, () => team.crocCount < 5));
    plusBg.on("pointerdown", () => updateCount(1, () => team.crocCount < 5)); // Make background clickable

    // Add color selector to team container (position relative to team container)
    const colorContainer = UIComponents.createColorSelector(scene, -10, 10, team, scene.availableColors);
    teamContainer.add(colorContainer);

    UIComponents.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
  }

  static refreshTeamSelection = scene => this.createTeamSelection(scene);

  static clearExistingTeamUI(scene) {
    scene.teamUIElements?.forEach(el => el.destroy());
    if (scene.teamUIElements) scene.teamUIElements = [];

    scene.spriteArrays?.forEach(teamSprites => {
      teamSprites?.forEach(sprite => sprite.destroy());
      if (teamSprites) teamSprites.length = 0;
    });
  }
}

export default TeamSelectorManager;
