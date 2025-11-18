// Player Selection Scene for Combat Crocs
// Allows players to choose number of crocs per team before starting battle

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
    // Initialize selection state
    this.teamCount = 2; // Default to 2 teams
    this.selectedTeamIndex = 0; // For individual team croc selection

    // Available team colors with names
    this.availableColors = [
      { name: "Red", hex: 0xff0000 },
      { name: "Yellow", hex: 0xffff00 },
      { name: "Green", hex: 0x00ff00 },
      { name: "Blue", hex: 0x0000ff },
      { name: "Purple", hex: 0x8a2be2 },
    ];

    this.teams = [
      { id: 1, name: "Team 1", crocCount: 1, color: this.availableColors[0] }, // Red
      { id: 2, name: "Team 2", crocCount: 1, color: this.availableColors[1] }, // Yellow
    ];

    // Background
    this.add
      .graphics()
      .fillGradientStyle(0xff6b35, 0xf7931e, 0xffd23f, 0xffd23f, 1)
      .fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Get selected map info
    const selectedMap = window.MapManager.getCurrentMap();
    const mapInfo = window.MapManager.getMapDisplayInfo(selectedMap.id);

    // Title
    this.add
      .text(Config.GAME_WIDTH / 2, 60, "CHOOSE YOUR CROCODILES", {
        font: "bold 32px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Selected Map Display
    const mapBoxY = 110;

    this.add
      .text(Config.GAME_WIDTH / 2, mapBoxY, `Map: ${mapInfo.name}`, {
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
    UIManager.createTeamSelection(this);
    this.createActionButtons();

    // Start music if available
    if (this.cache.audio.exists("introMusic")) {
      this.introMusic = this.sound.add("introMusic");
      this.introMusic.setLoop(true);
      this.introMusic.setVolume(0.2);
      this.introMusic.play();
    }
  }

  clearExistingTeamUI() {
    UIManager.clearExistingTeamUI(this);
  }

  createActionButtons() {
    const buttonY = Config.GAME_HEIGHT - 100; // Moved down 50px to use bottom space

    // Start Battle button
    const startBtn = this.add
      .text(Config.GAME_WIDTH / 2, buttonY, "START BATTLE", {
        font: "bold 28px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Back to Menu button
    const backBtn = this.add
      .text(Config.GAME_WIDTH / 2, buttonY + 60, "BACK TO MENU", {
        font: "bold 20px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setInteractive();

    // Button hover effects
    [startBtn, backBtn].forEach(btn => {
      btn.on("pointerover", () => btn.setScale(1.1).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FFD23F"));
    });

    // Start battle
    startBtn.on("pointerdown", () => {
      GameStateManager.storeTeams(this.teams);

      // Stop music
      if (this.introMusic && this.introMusic.isPlaying) {
        this.introMusic.stop();
      }

      // Transition to game
      this.scene.start("GameScene");
    });

    // Back to menu
    backBtn.on("pointerdown", () => {
      if (this.introMusic && this.introMusic.isPlaying) {
        this.introMusic.stop();
      }
      this.scene.start("MenuScene");
    });
  }
}

window.PlayerSelectScene = PlayerSelectScene;
