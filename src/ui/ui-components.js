import { Config } from "@config";
import { UITextHelpers } from "@ui";
import TeamSelectorManager from "./team-selector-manager.js";
import { CharacterHelper } from "@utils/character-helper";

class UIComponents {
  static getAbilityName = charType => Config.CHARACTER_TYPES[charType]?.ability?.name || "Unknown";

  static createTooltip(scene, x, y, text, tooltipArray) {
    const tooltip = scene.add
      .text(x + 3, y - 42, text, {
        font: "12px Arial",
        fill: "#FFF",
        stroke: "#000",
        strokeThickness: 2,
        backgroundColor: "#000",
        padding: { left: 4, right: 4, top: 2, bottom: 2 },
      })
      .setOrigin(0.5, 1);

    const arrow = scene.add.graphics().fillStyle(0x000000, 1);
    arrow.fillTriangle(x - 3, y - 42, x + 9, y - 42, x + 3, y - 34);
    tooltipArray.push(tooltip, arrow);
    return tooltip;
  }

  static createColorButton = (scene, color, isSelected, x, y) =>
    scene.add
      .graphics()
      .fillStyle(color.hex)
      .fillRect(0, 0, 25, 25)
      .lineStyle(isSelected ? 3 : 1, isSelected ? 0x000000 : 0xffffff)
      .strokeRect(0, 0, 25, 25)
      .setPosition(x, y)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 25, 25), Phaser.Geom.Rectangle.Contains);

  static createWeaponDisplay = scene => {
    scene.weaponText = UITextHelpers.primaryText(
      scene,
      Config.GAME_WIDTH - 200,
      20,
      `Weapon: ${scene.turnManager.getCurrentWeapon()}`,
      16,
    );
  };

  static createTimerDisplay = scene =>
    (scene.timerText = UITextHelpers.secondaryText(scene, Config.GAME_WIDTH - 200, 50, "Time: 30", 16));

  static createTurnIndicator = scene =>
    (scene.playerIndicator = UITextHelpers.primaryText(
      scene,
      Config.GAME_WIDTH / 2,
      20,
      "Player 1's Turn",
      20,
    ));

  static createInstructions = scene =>
    UITextHelpers.secondaryText(
      scene,
      Config.GAME_WIDTH / 2,
      50,
      "Move: Arrow Keys | Aim: Mouse | Shoot: Click | Jump: Spacebar | Weapons: W or 🔫",
      14,
    );

  static createColorSelector(scene, x, y, team, colors) {
    const c = scene.add.container(x, y);
    const spacing = 35,
      start = -((colors.length - 1) * spacing) / 2;
    colors.forEach((col, i) => {
      const btn = this.createColorButton(scene, col, team.color?.hex === col.hex, start + i * spacing, 0);
      btn.on("pointerdown", () => ((team.color = col), TeamSelectorManager.refreshTeamSelection(scene)));
      c.add(btn);
    });
    if (!team.color) team.color = colors[(team.id - 1) % colors.length];
    return c;
  }

  static updateCrocPreview(scene, x, y, count, teamIdx) {
    if (!scene.teams?.[teamIdx]) return;

    // Clear any existing sprites and tooltips for this team's preview
    [((scene.spriteArrays ||= [])[teamIdx] ||= []), ((scene.tooltipArrays ||= [])[teamIdx] ||= [])].forEach(
      arr => (arr.forEach(s => s?.destroy()), (arr.length = 0)),
    );

    const config = this.#getPreviewConfig(scene, x, y, count, teamIdx);

    for (let i = 0; i < count; i++) {
      const sprite = this.#createCharacterSprite(scene, config, i);
      this.#setupSpriteInteractions(scene, sprite, config, i);
      scene.spriteArrays[teamIdx].push(sprite);
    }
  }

  static #getPreviewConfig(scene, x, y, count, teamIdx) {
    const spacing = Math.max(25, 45 - Math.max(0, count - 2) * 5);
    return {
      team: scene.teams[teamIdx],
      startX: x - ((count - 1) * spacing) / 2,
      y,
      spacing,
      teamIdx,
      types: Object.keys(Config.CHARACTER_TYPES),
      size: Config.SPRITE_SIZES.UI_CHARACTER,
    };
  }

  static #createCharacterSprite(scene, config, index) {
    const charType = config.team.players?.[index]?.characterType || "CROCODILE";
    return scene.add
      .sprite(
        config.startX + index * config.spacing,
        config.y,
        CharacterHelper.getSpriteKey(charType, config.team.color?.hex),
      )
      .setDisplaySize(config.size.width, config.size.height)
      .setInteractive();
  }

  static #setupSpriteInteractions(scene, sprite, config, index) {
    const charType = config.team.players?.[index]?.characterType || "CROCODILE";

    sprite.on("pointerover", () =>
      this.createTooltip(
        scene,
        sprite.x,
        sprite.y,
        this.getAbilityName(charType),
        scene.tooltipArrays[config.teamIdx],
      ),
    );

    sprite.on(
      "pointerout",
      () => (
        scene.tooltipArrays[config.teamIdx]?.forEach(t => t.destroy()),
        (scene.tooltipArrays[config.teamIdx] = [])
      ),
    );

    sprite.on("pointerdown", () => this.#cycleCharacterType(scene, sprite, config, index));
  }

  static #cycleCharacterType(scene, sprite, config, index) {
    const current = config.team.players?.[index]?.characterType || "CROCODILE";
    const next = config.types[(config.types.indexOf(current) + 1) % config.types.length];

    (config.team.players ||= [])[index] = { ...(config.team.players[index] || {}), characterType: next };
    sprite
      .setTexture(CharacterHelper.getSpriteKey(next, config.team.color?.hex))
      .setDisplaySize(config.size.width, config.size.height);
    scene.tooltipArrays[config.teamIdx]?.[0]?.setText(this.getAbilityName(next));
  }
}

export default UIComponents;
