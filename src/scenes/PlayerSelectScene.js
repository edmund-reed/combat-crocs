import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UIManager, TeamSelectorManager } from "@ui";
import { StateManager, Maps as MapManager } from "@utils";

class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayerSelectScene" });
  }

  preload() {
    // Load background and player sprites
    this.load.image("mapBg", "src/assets/map-bg.png");

    // Load all colored character sprites
    Object.values(Config.CHARACTER_TYPES).forEach(({ baseName }) =>
      ["red", "yellow", "green", "blue", "purple"].forEach(color =>
        this.load.image(`${baseName}-${color}`, `src/assets/characters/${baseName}/${baseName}-${color}.png`),
      ),
    );

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

    // Initialize teams with character types for each player
    this.teams = [
      {
        id: 1,
        name: "Team 1",
        crocCount: 1,
        color: this.availableColors[0],
        players: [{ characterType: "CROCODILE" }],
      },
      {
        id: 2,
        name: "Team 2",
        crocCount: 1,
        color: this.availableColors[1],
        players: [{ characterType: "CROCODILE" }],
      },
    ];

    // Map background image (positioned like main menu)
    const bgImage = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT, "mapBg");
    bgImage.setScale(Math.max(GAME_WIDTH / bgImage.width, GAME_HEIGHT / bgImage.height)).setOrigin(0.5, 1);

    const mapInfo = MapManager.getMapDisplayInfo(MapManager.getCurrentMap().id);
    const centerX = GAME_WIDTH / 2;

    this.add
      .text(centerX, 60, "CHOOSE YOUR CROCODILES", {
        font: "bold 32px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add
      .text(centerX, 98, `Map: ${mapInfo.name}`, {
        font: "bold 18px Arial",
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    UIManager.createTeamCountSelector(this);
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
    const buttonStyle = { font: "bold 28px Arial", fill: "#FFFFFF", stroke: "#000000", strokeThickness: 4 };

    const createButton = (y, text, style, action) => {
      const btn = this.add
        .text(GAME_WIDTH / 2, y, text, style)
        .setOrigin(0.5)
        .setInteractive();

      // Add hover effect that makes text bigger
      btn.on("pointerover", () => {
        btn.setScale(1.2);
      });
      btn.on("pointerout", () => {
        btn.setScale(1.0);
      });

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
      "Back",
      { ...buttonStyle, font: "bold 24px Arial" },
      () => (this._stopIntroMusic(), this.scene.start("MapSelectScene")),
    );
  }
}

export default PlayerSelectScene;
