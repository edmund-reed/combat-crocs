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

    // Load audio if available
    this.load.audio("introMusic", "src/assets/intro.mp3");
  }

  create() {
    // Initialize selection state
    this.teamACount = 1;
    this.teamBCount = 1;

    // Separate sprite arrays for each team
    this.teamASprites = [];
    this.teamBSprites = [];

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
    const mapBg = this.add
      .graphics()
      .fillStyle(mapInfo.backgroundColor, 1)
      .fillRect(Config.GAME_WIDTH / 2 - 150, mapBoxY - 25, 300, 50);

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
        }
      )
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(
        Config.GAME_WIDTH / 2,
        170,
        "Select the number of crocs for each team",
        {
          font: "16px Arial",
          fill: "#FFFFFF",
          stroke: "#FF6B35",
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5);

    // Create team selection areas
    this.createTeamSelection();
    this.createActionButtons();

    // Start music if available
    if (this.cache.audio.exists("introMusic")) {
      this.introMusic = this.sound.add("introMusic");
      this.introMusic.setLoop(true);
      this.introMusic.setVolume(0.2);
      this.introMusic.play();
    }
  }

  createTeamSelection() {
    const centerX = Config.GAME_WIDTH / 2;
    const teamY = 200;

    // Team A (Left side)
    this.createTeamSelector(centerX - 250, teamY, "Team A", "A", true);

    // VS text
    this.add
      .text(centerX, teamY + 50, "VS", {
        font: "bold 32px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Team B (Right side)
    this.createTeamSelector(centerX + 250, teamY, "Team B", "B", false);
  }

  createTeamSelector(x, y, teamName, teamPrefix, isTeamA) {
    // Team label
    this.add
      .text(x, y, teamName, {
        font: "bold 24px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Count display and controls
    const countY = y + 60;
    const controlY = y + 110;

    // Minus button
    const minusBtn = this.add
      .text(x - 50, controlY, "-", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();

    // Count display
    const countText = this.add
      .text(x, countY, isTeamA ? this.teamACount : this.teamBCount, {
        font: "bold 48px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Plus button
    const plusBtn = this.add
      .text(x + 50, controlY, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();

    // Button hover effects
    [minusBtn, plusBtn].forEach((btn) => {
      btn.on("pointerover", () => btn.setScale(1.2).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FF6B35"));
    });

    // Minus button logic
    minusBtn.on("pointerdown", () => {
      const currentCount = isTeamA ? this.teamACount : this.teamBCount;
      if (currentCount > 1) {
        if (isTeamA) {
          this.teamACount--;
        } else {
          this.teamBCount--;
        }
        countText.setText(isTeamA ? this.teamACount : this.teamBCount);
        this.updateCrocPreview(
          x,
          y + 160,
          isTeamA ? this.teamACount : this.teamBCount,
          isTeamA
        );
      }
    });

    // Plus button logic
    plusBtn.on("pointerdown", () => {
      const currentCount = isTeamA ? this.teamACount : this.teamBCount;
      if (currentCount < 3) {
        if (isTeamA) {
          this.teamACount++;
        } else {
          this.teamBCount++;
        }
        countText.setText(isTeamA ? this.teamACount : this.teamBCount);
        this.updateCrocPreview(
          x,
          y + 160,
          isTeamA ? this.teamACount : this.teamBCount,
          isTeamA
        );
      }
    });

    // Initial croc preview
    this.updateCrocPreview(
      x,
      y + 160,
      isTeamA ? this.teamACount : this.teamBCount,
      isTeamA
    );
  }

  updateCrocPreview(x, y, count, isTeamA) {
    // Use separate sprite arrays for each team
    const spriteArray = isTeamA ? this.teamASprites : this.teamBSprites;

    // Remove existing crocs for this team only
    if (spriteArray && spriteArray.length > 0) {
      spriteArray.forEach((sprite) => sprite.destroy());
    }

    // Clear the array
    spriteArray.length = 0;

    // Create croc sprites based on count - use team-consistent sprites
    const spacing = 60;
    const startX = x - ((count - 1) * spacing) / 2;

    // Use team-consistent sprites: Team A = croc1, Team B = croc2
    const teamSprite = isTeamA ? "croc1" : "croc2";

    for (let i = 0; i < count; i++) {
      const croc = this.add.sprite(startX + i * spacing, y, teamSprite);
      croc.setScale(0.08); // Smaller for preview
      spriteArray.push(croc);
    }
  }

  createActionButtons() {
    const buttonY = Config.GAME_HEIGHT - 150;

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
    [startBtn, backBtn].forEach((btn) => {
      btn.on("pointerover", () => btn.setScale(1.1).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FFD23F"));
    });

    // Start battle
    startBtn.on("pointerdown", () => {
      // Store selection in global game state
      this.storeGameSettings();

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

  storeGameSettings() {
    // Store player selection in global game state
    window.CombatCrocs.gameState.game.teamACount = this.teamACount;
    window.CombatCrocs.gameState.game.teamBCount = this.teamBCount;

    console.log(
      `Starting battle: Team A: ${this.teamACount} crocs, Team B: ${this.teamBCount} crocs`
    );
  }
}

window.PlayerSelectScene = PlayerSelectScene;
