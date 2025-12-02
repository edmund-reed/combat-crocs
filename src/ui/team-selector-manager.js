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

      this.createDynamicTeamSelector(scene, xPos, 340, team, i);
    }
  }

  static createDynamicTeamSelector(scene, x, y, team, teamIndex) {
    if (!scene.teamUIElements) scene.teamUIElements = [];

    const countY = y + 60;
    scene.teamUIElements.push(UITextHelpers.primaryText(scene, x, y, team.name, 24));

    const minusBtn = UITextHelpers.primaryText(scene, x - 60, countY, "-", 36).setInteractive();
    const countText = UITextHelpers.primaryText(scene, x, countY, team.crocCount.toString(), 48);
    const plusBtn = UITextHelpers.primaryText(scene, x + 60, countY, "+", 36).setInteractive();

    scene.teamUIElements.push(minusBtn, countText, plusBtn);

    UIButtonHelpers.addHoverEffect(minusBtn, "#FF6B35");
    UIButtonHelpers.addHoverEffect(plusBtn, "#FF6B35");

    const updateCount = (delta, condition) => {
      if (condition()) {
        team.crocCount += delta;
        countText.setText(team.crocCount);
        UIComponents.updateCrocPreview(scene, x, y + 180, team.crocCount, teamIndex);
      }
    };

    minusBtn.on("pointerdown", () => updateCount(-1, () => team.crocCount > 1));
    plusBtn.on("pointerdown", () => updateCount(1, () => team.crocCount < 3));

    UIComponents.createColorSelector(scene, x, y + 110, team, scene.availableColors);
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
