import { Config } from "@config";
import UIComponents from "./ui-components.js";

class TeamSelectorManager {
  static _countBtn(scene, x, y, label, onClick) {
    const c = scene.add.container(x, y).setSize(40, 40).setInteractive();
    c.add(scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-20, -20, 40, 40, 8));
    const t = scene.add
      .text(0, 0, label, { font: "36px Arial", fill: "#FFFFFF", stroke: "#000000", strokeThickness: 3 })
      .setOrigin(0.5);
    c.add(t);
    c.on("pointerover", () => t.setScale(1.2));
    c.on("pointerout", () => t.setScale(1.0));
    c.on("pointerdown", onClick);
    return c;
  }

  static updateTeamsForCount(scene) {
    while (scene.teams.length < scene.teamCount) {
      const id = scene.teams.length + 1;
      scene.teams.push({
        id,
        name: `Team ${id}`,
        crocCount: 1,
        color: scene.availableColors[(id - 1) % scene.availableColors.length],
        players: [{ characterType: "CROCODILE" }],
      });
    }
    while (scene.teams.length > scene.teamCount) scene.teams.pop();
  }

  static createTeamSelection(scene) {
    this.clearExistingTeamUI(scene);
    const w = Math.min(scene.teamCount * 200, 1000);
    for (let i = 0; i < scene.teamCount; i++) {
      const x =
        scene.teamCount === 1
          ? Config.GAME_WIDTH / 2
          : Config.GAME_WIDTH / 2 - w / 2 + i * (w / (scene.teamCount - 1));
      this._createTeamPanel(scene, x, 210, scene.teams[i], i);
    }
  }

  static _createTeamPanel(scene, x, y, team, idx) {
    if (!scene.teamUIElements) scene.teamUIElements = [];
    const c = scene.add.container(x, y + 100);
    c.add(scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-120, -65, 240, 170, 15));
    c.add(
      scene.add
        .text(0, -65, team.name, {
          font: "bold 24px Arial",
          fill: "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5),
    );

    const update = (d, cond) => {
      if (cond()) {
        team.crocCount += d;
        d > 0 ? team.players.push({ characterType: "CROCODILE" }) : team.players.pop();
        UIComponents.updateCrocPreview(scene, x, y + 135, team.crocCount, idx);
      }
    };
    c.add(this._countBtn(scene, -94, 75, "-", () => update(-1, () => team.crocCount > 1)));
    c.add(this._countBtn(scene, 94, 75, "+", () => update(1, () => team.crocCount < 5)));
    c.add(UIComponents.createColorSelector(scene, -10, -35, team, scene.availableColors));

    scene.teamUIElements.push(c);
    UIComponents.updateCrocPreview(scene, x, y + 135, team.crocCount, idx);
  }

  static refreshTeamSelection = scene => this.createTeamSelection(scene);

  static clearExistingTeamUI(scene) {
    scene.teamUIElements?.forEach(el => el.destroy());
    scene.teamUIElements = [];
    scene.spriteArrays?.forEach(arr => {
      arr?.forEach(s => s.destroy());
      arr && (arr.length = 0);
    });
  }
}

export default TeamSelectorManager;
