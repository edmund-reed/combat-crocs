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
    this.teamCount = 2; // Default to 2 teams
    this.selectedTeamIndex = 0; // For individual team croc selection
    this.teams = [
      { id: 1, name: "Team 1", crocCount: 1 },
      { id: 2, name: "Team 2", crocCount: 1 },
    ];

    // Initialize sprite arrays for SceneUtils compatibility
    this.teamASprites = [];
    this.teamBSprites = [];

    // Initialize team counts for SceneUtils compatibility
    this.teamACount = 1;
    this.teamBCount = 1;

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
        },
      )
      .setOrigin(0.5);

    // Team Count Selection
    this.createTeamCountSelector();

    // Subtitle
    this.add
      .text(Config.GAME_WIDTH / 2, 270, "Customise your teams", {
        font: "18px Arial",
        fill: "#FFFFFF",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
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

  clearExistingTeamUI() {
    // Destroy all team-related UI elements from previous renders
    if (this.teamUIElements) {
      this.teamUIElements.forEach(element => element.destroy());
      this.teamUIElements = [];
    }

    // Destroy all sprites in team arrays (legacy SceneUtils arrays)
    if (this.teamASprites) {
      this.teamASprites.forEach(sprite => sprite.destroy());
      this.teamASprites = [];
    }
    if (this.teamBSprites) {
      this.teamBSprites.forEach(sprite => sprite.destroy());
      this.teamBSprites = [];
    }

    // Destroy all sprites in new dynamic sprite arrays
    if (this.spriteArrays) {
      this.spriteArrays.forEach(teamSprites => {
        if (teamSprites && teamSprites.length > 0) {
          teamSprites.forEach(sprite => sprite.destroy());
          teamSprites.length = 0;
        }
      });
    }
  }

  createTeamSelection() {
    // Clear any existing team selector UI elements first
    this.clearExistingTeamUI();

    const startY = 310;
    const teamHeight = 160; // Single row height

    // All teams in one row, adjust width based on team count for better spacing
    let availableWidth;
    if (this.teamCount === 2) {
      availableWidth = 400; // Closer for 2 teams
    } else if (this.teamCount === 3) {
      availableWidth = 600; // Moderate for 3 teams
    } else if (this.teamCount === 4) {
      availableWidth = 800; // Wider for 4 teams
    } else {
      availableWidth = 1000; // Full width for 5 teams
    }
    const spacing = this.teamCount <= 1 ? 0 : availableWidth / (this.teamCount - 1);

    for (let i = 0; i < this.teamCount; i++) {
      const team = this.teams[i];

      // Center all teams horizontally across the screen
      let xPos;
      if (this.teamCount === 1) {
        xPos = Config.GAME_WIDTH / 2;
      } else {
        // Evenly distribute teams across the available width
        const startX = Config.GAME_WIDTH / 2 - availableWidth / 2;
        xPos = startX + i * spacing;
      }

      const yPos = startY;

      // Create dynamic team selector that directly updates teams array
      this.createDynamicTeamSelector(xPos, yPos, team, i);
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
    [startBtn, backBtn].forEach(btn => {
      btn.on("pointerover", () => btn.setScale(1.1).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FFD23F"));
    });

    // Start battle
    startBtn.on("pointerdown", () => {
      // Store teams in global game state
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

  createTeamCountSelector() {
    const selectorY = 170;

    // Label
    this.add
      .text(Config.GAME_WIDTH / 2, selectorY, "Number of Teams", {
        font: "bold 18px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Minus button
    const minusBtn = this.add
      .text(Config.GAME_WIDTH / 2 - 80, selectorY + 50, "-", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();

    // Count display
    this.teamCountText = this.add
      .text(Config.GAME_WIDTH / 2, selectorY + 50, this.teamCount, {
        font: "bold 48px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Plus button
    const plusBtn = this.add
      .text(Config.GAME_WIDTH / 2 + 80, selectorY + 50, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();

    // Button hover effects
    [minusBtn, plusBtn].forEach(btn => {
      btn.on("pointerover", () => btn.setScale(1.2).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FF6B35"));
    });

    // Minus button logic
    minusBtn.on("pointerdown", () => {
      if (this.teamCount > 2) {
        this.teamCount--;
        this.teamCountText.setText(this.teamCount);
        this.updateTeamsForCount();
        this.refreshTeamSelection();
      }
    });

    // Plus button logic
    plusBtn.on("pointerdown", () => {
      if (this.teamCount < 5) {
        this.teamCount++;
        this.teamCountText.setText(this.teamCount);
        this.updateTeamsForCount();
        this.refreshTeamSelection();
      }
    });
  }

  updateTeamsForCount() {
    // Adjust teams array based on new count
    while (this.teams.length < this.teamCount) {
      const newTeamId = this.teams.length + 1;
      this.teams.push({
        id: newTeamId,
        name: `Team ${newTeamId}`,
        crocCount: 1,
      });
    }

    // Remove excess teams
    while (this.teams.length > this.teamCount) {
      this.teams.pop();
    }
  }

  createDynamicTeamSelector(x, y, team, teamIndex) {
    // Initialize UI elements array if not exists
    if (!this.teamUIElements) {
      this.teamUIElements = [];
    }

    // Team label
    const teamLabel = this.add
      .text(x, y, team.name, {
        font: "bold 24px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    this.teamUIElements.push(teamLabel);

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
    this.teamUIElements.push(minusBtn);

    // Count display
    const countText = this.add
      .text(x, countY, team.crocCount, {
        font: "bold 48px Arial",
        fill: "#FFD23F",
        stroke: "#FF6B35",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.teamUIElements.push(countText);

    // Plus button
    const plusBtn = this.add
      .text(x + 50, controlY, "+", {
        font: "bold 36px Arial",
        fill: "#FF6B35",
      })
      .setOrigin(0.5)
      .setInteractive();
    this.teamUIElements.push(plusBtn);

    // Button hover effects
    [minusBtn, plusBtn].forEach(btn => {
      btn.on("pointerover", () => btn.setScale(1.2).setFill("#FFFFFF"));
      btn.on("pointerout", () => btn.setScale(1.0).setFill("#FF6B35"));
    });

    // Minus button logic
    minusBtn.on("pointerdown", () => {
      if (team.crocCount > 1) {
        team.crocCount--;
        countText.setText(team.crocCount);
        this.updateCrocPreview(x, y + 160, team.crocCount, teamIndex);
      }
    });

    // Plus button logic
    plusBtn.on("pointerdown", () => {
      if (team.crocCount < 3) {
        // Max per team still 3
        team.crocCount++;
        countText.setText(team.crocCount);
        this.updateCrocPreview(x, y + 160, team.crocCount, teamIndex);
      }
    });

    // Initial croc preview
    this.updateCrocPreview(x, y + 160, team.crocCount, teamIndex);
  }

  updateCrocPreview(x, y, count, teamIndex) {
    // Safety check - make sure team exists
    if (!this.teams || !this.teams[teamIndex]) {
      console.warn(`Team at index ${teamIndex} not found, skipping croc preview`);
      return;
    }

    // Create unique sprite array for each team if not exists
    if (!this.spriteArrays) {
      this.spriteArrays = [];
    }
    if (!this.spriteArrays[teamIndex]) {
      this.spriteArrays[teamIndex] = [];
    }

    const spriteArray = this.spriteArrays[teamIndex];

    // Remove existing crocs for this team only
    if (spriteArray && spriteArray.length > 0) {
      spriteArray.forEach(sprite => sprite.destroy());
    }

    // Clear the array
    spriteArray.length = 0;

    // Get the team for sprite selection
    const team = this.teams[teamIndex];

    // Use team-consistent sprites: rotate through available sprites
    const availableSprites = ["croc1", "croc2"];
    const spriteKey = availableSprites[(team.id - 1) % availableSprites.length];

    // Create croc sprites based on count - smaller for preview
    const spacing = 60;
    const startX = x - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const croc = this.add.sprite(startX + i * spacing, y, spriteKey);
      croc.setScale(0.08); // Smaller for preview
      spriteArray.push(croc);
    }
  }

  refreshTeamSelection() {
    // Sync team counts for SceneUtils compatibility before regenerating UI
    this.teamACount = this.teams[0]?.crocCount || 1;
    this.teamBCount = this.teams[1]?.crocCount || 1;

    // Regenerate team selection UI based on current teams
    this.createTeamSelection();
  }
}

window.PlayerSelectScene = PlayerSelectScene;
