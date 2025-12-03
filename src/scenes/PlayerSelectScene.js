import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UIManager, TeamSelectorManager } from "@ui";
import { StateManager, Maps as MapManager } from "@utils";

class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayerSelectScene" });
  }

  preload() {
    ["croc1", "croc2", "chameleon1", "gecko1"].forEach(sprite => this.load.image(sprite, `src/assets/${sprite}.png`));
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;

    Object.assign(this, {
      teamCount: 2,
      selectedTeamIndex: 0,
      availableColors: [
        { name: "Red", hex: 0xff0000 },
        { name: "Yellow", hex: 0xffff00 },
        { name: "Green", hex: 0x00ff00 },
        { name: "Blue", hex: 0x0000ff },
        { name: "Purple", hex: 0x8a2be2 },
      ],
    });

    this.teams = [
      { id: 1, name: "Team 1", crocCount: 1, color: this.availableColors[0] },
      { id: 2, name: "Team 2", crocCount: 1, color: this.availableColors[1] },
    ];

    this.add
      .graphics()
      .fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const mapInfo = MapManager.getMapDisplayInfo(MapManager.getCurrentMap().id);
    const centerX = GAME_WIDTH / 2;

    this.add.text(centerX, 60, "CHOOSE YOUR CROCODILES", UITextHelpers._getPrimaryTextStyle(32, 4)).setOrigin(0.5);
    this.add
      .text(centerX, 110, `Map: ${mapInfo.name}`, {
        font: "bold 18px Arial",
        fill: "#000000",
        stroke: "#FFFFFF",
        strokeThickness: 1,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, 128, `${mapInfo.platformCount} platforms • ${mapInfo.difficulty} difficulty`, {
        font: "12px Arial",
        fill: "#666666",
      })
      .setOrigin(0.5);

    UIManager.createTeamCountSelector(this);
    this.add
      .text(centerX, 300, "Customise your teams", {
        font: "18px Arial",
        fill: "#FFFFFF",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    TeamSelectorManager.createTeamSelection(this);
    this.createActionButtons();

    if (this.cache.audio.exists("introMusic")) {
      this.introMusic = this.sound.add("introMusic").setLoop(true).setVolume(0.2);
      this.introMusic.play();
    }
  }

  _stopIntroMusic = () => this.introMusic?.isPlaying && this.introMusic.stop();
  clearExistingTeamUI = () => TeamSelectorManager.clearExistingTeamUI(this);

  createActionButtons() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;
    const buttonY = GAME_HEIGHT - 100;
    const buttonStyle = { font: "28px Arial", fill: "#0000FF", stroke: "#FFFFFF", strokeThickness: 3 };

    const createButton = (y, text, style, action) => {
      const btn = this.add
        .text(GAME_WIDTH / 2, y, text, style)
        .setOrigin(0.5)
        .setInteractive();
      UIButtonHelpers.addHoverEffect(btn, "#0000FF");
      btn.on("pointerdown", action);
      return btn;
    };

    createButton(buttonY, "START BATTLE", buttonStyle, () => {
      StateManager.storeTeams(this.teams);
      this._stopIntroMusic();
      this.scene.start("GameScene");
    });

    createButton(
      buttonY + 60,
      "BACK TO MENU",
      { ...buttonStyle, font: "20px Arial", strokeThickness: 2 },
      () => (this._stopIntroMusic(), this.scene.start("MenuScene")),
    );
  }
}

export default PlayerSelectScene;
