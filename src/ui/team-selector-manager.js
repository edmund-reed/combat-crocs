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
        players: [{ characterType: "CROCODILE" }],
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

      this.createDynamicTeamSelector(scene, xPos, 280, team, i);
    }
  }

  static _createCountButton(scene, x, y, label) {
    const container = scene.add.container(x, y).setSize(32, 32).setInteractive();

    const bg = scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-16, -16, 32, 32, 6);

    const btn = scene.add
      .text(0, 0, label, {
        font: "28px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    container.on("pointerover", () => btn.setScale(1.2));
    container.on("pointerout", () => btn.setScale(1.0));

    container.add([bg, btn]);
    return container;
  }

  static createDynamicTeamSelector(scene, x, y, team, teamIndex) {
    if (!scene.teamUIElements) scene.teamUIElements = [];

    // Create team container with transparent black background
    const teamContainer = scene.add.container(x, y + 100);

    // Add background rectangle with rounded corners
    const bgRect = scene.add.graphics();
    bgRect.fillStyle(0x000000, 0.6);
    bgRect.fillRoundedRect(-120, -80, 240, 220, 15);
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

    const minusBtn = this._createCountButton(scene, -100, 80, "-");
    const plusBtn = this._createCountButton(scene, 100, 80, "+");
    teamContainer.add([minusBtn, plusBtn]);

    scene.teamUIElements.push(teamContainer);

    const updateCount = (delta, condition) => {
      if (condition()) {
        team.crocCount += delta;
        if (delta > 0) {
          team.players.push({ characterType: "CROCODILE" });
        } else {
          team.players.pop();
        }
        UIComponents.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    };

    minusBtn.on("pointerdown", () => updateCount(-1, () => team.crocCount > 1));
    plusBtn.on("pointerdown", () => updateCount(1, () => team.crocCount < 5));

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
