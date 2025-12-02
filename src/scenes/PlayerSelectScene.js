// Player Selection Scene for Combat Crocs
// Allows players to choose number of crocs per team before starting battle

import { Config } from "@config";
import { UITextHelpers, UIButtonHelpers, UIManager, TeamSelectorManager } from "@ui";
import { GameStateManager, Maps as MapManager } from "@utils";

class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayerSelectScene" });
  }

  preload() {
    // Load crocodile sprites for selection preview
    this.load.image("croc1", "src/assets/croc1.png");
    this.load.image("croc2", "src/assets/croc2.png");
    this.load.image("chameleon1", "src/assets/chameleon1.png");
    this.load.image("gecko1", "src/assets/gecko1.png");

    // Load audio if available
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    const { GAME_WIDTH, GAME_HEIGHT } = Config;

    this.teamCount = 2;
    this.selectedTeamIndex = 0;
    this.availableColors = [
      { name: "Red", hex: 0xff0000 },
      { name: "Yellow", hex: 0xffff00 },
      { name: "Green", hex: 0x00ff00 },
      { name: "Blue", hex: 0x0000ff },
      { name: "Purple", hex: 0x8a2be2 },
    ];
    this.teams = [
      { id: 1, name: "Team 1", crocCount: 1, color: this.availableColors[0] },
      { id: 2, name: "Team 2", crocCount: 1, color: this.availableColors[1] },
    ];

    this.add
      .graphics()
      .fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1)
      .fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Get selected map info
    const selectedMap = MapManager.getCurrentMap();
    const mapInfo = MapManager.getMapDisplayInfo(selectedMap.id);

    this.add
      .text(GAME_WIDTH / 2, 60, "CHOOSE YOUR CROCODILES", UITextHelpers._getPrimaryTextStyle(32, 4))
      .setOrigin(0.5);

    const mapBoxY = 110;
    this.add
      .text(GAME_WIDTH / 2, mapBoxY, `Map: ${mapInfo.name}`, {
        font: "bold 18px Arial",
        fill: "#000000",
        stroke: "#FFFFFF",
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    this.add
      .text(
        Config.GAME_WIDTH / 2,
        mapBoxY + 18,
        `${mapInfo.platformCount} platforms • ${mapInfo.difficulty} difficulty`,
        {
          font: "12px Arial",
          fill: "#666666",
        },
      )
      .setOrigin(0.5);

    // Team Count Selection
    UIManager.createTeamCountSelector(this);

    // Subtitle - moved down
    this.add
      .text(Config.GAME_WIDTH / 2, 300, "Customise your teams", {
        font: "18px Arial",
        fill: "#FFFFFF",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Create team selection areas - started lower
    TeamSelectorManager.createTeamSelection(this);
    this.createActionButtons();

    // Start music if available
    if (this.cache.audio.exists("introMusic")) {
      this.introMusic = this.sound.add("introMusic");
      this.introMusic.setLoop(true);
      this.introMusic.setVolume(0.2);
      this.introMusic.play();
    }
  }

  _stopIntroMusic() {
    if (this.introMusic && this.introMusic.isPlaying) {
      this.introMusic.stop();
    }
  }

  clearExistingTeamUI() {
    TeamSelectorManager.clearExistingTeamUI(this);
  }

  createActionButtons() {
    const buttonY = Config.GAME_HEIGHT - 100; // Moved down 50px to use bottom space

    // Start Battle button
    const startBtn = this.add
      .text(Config.GAME_WIDTH / 2, buttonY, "START BATTLE", {
        font: "28px Arial",
        fill: "#0000FF", // Blue text for better contrast
        stroke: "#FFFFFF",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Custom hover effect for blue button
    startBtn.on("pointerover", () => startBtn.setScale(1.1).setFill("#FFFFFF"));
    startBtn.on("pointerout", () => startBtn.setScale(1.0).setFill("#0000FF"));

    // Back to Menu button
    const backBtn = this.add
      .text(Config.GAME_WIDTH / 2, buttonY + 60, "BACK TO MENU", {
        font: "20px Arial",
        fill: "#0000FF", // Blue text for better contrast
        stroke: "#FFFFFF",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Custom hover effect for blue button
    backBtn.on("pointerover", () => backBtn.setScale(1.1).setFill("#FFFFFF"));
    backBtn.on("pointerout", () => backBtn.setScale(1.0).setFill("#0000FF"));

    // Start battle
    startBtn.on("pointerdown", () => {
      GameStateManager.storeTeams(this.teams);
      this._stopIntroMusic();
      this.scene.start("GameScene");
    });

    // Back to menu
    backBtn.on("pointerdown", () => {
      this._stopIntroMusic();
      this.scene.start("MenuScene");
    });
  }
}

export default PlayerSelectScene;
