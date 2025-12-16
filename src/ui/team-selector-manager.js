import { Config } from "@config";
import UIComponents from "./ui-components.js";
import { UITextHelpers, UIButtonHelpers, UISceneHelpers } from "./ui-helpers.js";
import { CharacterHelper } from "@utils/character-helper";

class TeamSelectorManager {
  static _countBtn = (scene, x, y, label, onClick) => {
    const c = scene.add.container(x, y).setSize(40, 40).setInteractive();
    c.add(scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-20, -20, 40, 40, 8));
    c.add(UITextHelpers.primaryText(scene, 0, 0, label, 36));
    c.on("pointerdown", onClick);
    UIButtonHelpers.addHoverEffect(c, 1.2);
    return c;
  };

  static updateTeamsForCount = scene => {
    const { teams, teamCount, availableColors } = scene;
    while (teams.length < teamCount) {
      const id = teams.length + 1;
      const color = availableColors[(id - 1) % availableColors.length];
      teams.push({ id, name: `Team ${id}`, crocCount: 1, color, players: [{ characterType: "CROCODILE" }] });
    }
    while (teams.length > teamCount) teams.pop();
  };

  static createTeamSelection(scene) {
    this.clearExistingTeamUI(scene);
    const { teamCount, teams } = scene;
    const width = Math.min(teamCount * 200, 1000);
    for (let i = 0; i < teamCount; i++) {
      const multiTeams = Config.GAME_WIDTH / 2 - width / 2 + i * (width / (teamCount - 1));
      const x = teamCount === 1 ? Config.GAME_WIDTH / 2 : multiTeams;
      this._createTeamPanel(scene, x, 210, teams[i], i);
    }
  }

  static _createTeamPanel(scene, x, y, team, idx) {
    if (!scene.teamUIElements) scene.teamUIElements = [];
    const c = scene.add.container(x, y + 100);
    c.add(scene.add.graphics().fillStyle(0x000000, 0.6).fillRoundedRect(-120, -65, 240, 170, 15));
    c.add(UISceneHelpers.styledText(scene, 0, -65, team.name, 24, 3));

    const update = (d, cond) => {
      if (cond()) {
        team.crocCount += d;
        d > 0 ? team.players.push({ characterType: "CROCODILE" }) : team.players.pop();
        this.updateCrocPreview(scene, x, y + 135, team.crocCount, idx);
      }
    };
    c.add(this._countBtn(scene, -94, 75, "-", () => update(-1, () => team.crocCount > 1)));
    c.add(this._countBtn(scene, 94, 75, "+", () => update(1, () => team.crocCount < 5)));

    // Color selector
    const colorContainer = scene.add.container(-10, -35);
    const spacing = 35;
    const start = -((scene.availableColors.length - 1) * spacing) / 2;
    scene.availableColors.forEach((col, i) => {
      const btn = UIComponents.colorButton(scene, col, team.color?.hex === col.hex, start + i * spacing, 0);
      btn.on("pointerdown", () => ((team.color = col), this.refreshTeamSelection(scene)));
      colorContainer.add(btn);
    });
    if (!team.color) team.color = scene.availableColors[(team.id - 1) % scene.availableColors.length];
    c.add(colorContainer);

    scene.teamUIElements.push(c);
    this.updateCrocPreview(scene, x, y + 135, team.crocCount, idx);
  }

  static refreshTeamSelection = scene => this.createTeamSelection(scene);

  static _destroyAndClear = arr => {
    arr?.forEach(item => item?.destroy());
    if (arr) arr.length = 0;
  };

  static clearExistingTeamUI = scene => {
    scene.teamUIElements?.forEach(el => el.destroy());
    scene.teamUIElements = [];
    [scene.spriteArrays, scene.tooltipArrays].forEach(arrays => arrays?.forEach(this._destroyAndClear));
  };

  static _clearArrays = arrays => arrays?.forEach(this._destroyAndClear);

  static _getNextCharacterType = current => {
    const types = Object.keys(Config.CHARACTER_TYPES);
    return types[(types.indexOf(current) + 1) % types.length];
  };

  static updateCrocPreview = (scene, x, y, count, teamIdx) => {
    if (!scene.teams?.[teamIdx]) return;

    const sprites = ((scene.spriteArrays ||= [])[teamIdx] ||= []);
    const tooltips = ((scene.tooltipArrays ||= [])[teamIdx] ||= []);
    this._clearArrays([sprites, tooltips]);

    const team = scene.teams[teamIdx];
    const spacing = Math.max(25, 45 - Math.max(0, count - 2) * 5);
    const startX = x - ((count - 1) * spacing) / 2;
    const { width, height } = Config.SPRITE_SIZES.UI_CHARACTER;

    for (let i = 0; i < count; i++) {
      const charType = team.players?.[i]?.characterType || "CROCODILE";
      const sprite = scene.add
        .sprite(startX + i * spacing, y, CharacterHelper.getSpriteKey(charType, team.color?.hex))
        .setDisplaySize(width, height)
        .setInteractive();

      sprite.on("pointerover", () =>
        UIComponents.tooltip(scene, sprite.x, sprite.y, UIComponents.getAbilityName(charType), tooltips),
      );
      sprite.on("pointerout", () => this._clearArrays([tooltips]));
      sprite.on("pointerdown", () => {
        const current = team.players?.[i]?.characterType || "CROCODILE";
        const next = this._getNextCharacterType(current);
        (team.players ||= [])[i] = { ...(team.players[i] || {}), characterType: next };
        sprite.setTexture(CharacterHelper.getSpriteKey(next, team.color?.hex)).setDisplaySize(width, height);
        tooltips[0]?.setText(UIComponents.getAbilityName(next));
      });

      sprites.push(sprite);
    }
  };
}

export default TeamSelectorManager;
