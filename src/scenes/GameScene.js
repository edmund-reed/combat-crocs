class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    // Initialize game state
    this.currentPlayer = 0;
    this.players = [];
    this.currentTeam = "A"; // Current team whose turn it is
    this.teamAPlayerIndex = 0; // Which player in team A plays next
    this.teamBPlayerIndex = 0; // Which player in team B plays next
    this.turnTimer = 0;
    this.gameStarted = false;
    this.terrain = null;
    this.currentWeapon = "BAZOOKA";
    this.aiming = false;
    this.aimDirection = 0;
    this.aimLine = null; // Yellow direction arrow
    this.turnInProgress = false; // Prevents next player from moving
  }

  preload() {
    // Load crocodile character sprites
    this.load.image("croc1", "src/assets/croc1.png");
    this.load.image("croc2", "src/assets/croc2.png");
    console.log("🔄 Loading crocodile sprites...");
  }

  create() {
    // Create the basic terrain
    this.createTerrain();

    // Create players
    this.createPlayers();

    // Set up physics world bounds
    this.matter.world.setBounds(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    // Create UI elements
    this.createUI();

    // Set up input handling
    this.setupInput();

    // Initialize turn system
    this.startTurn();

    // Add slight camera shake effect occasionally
    this.time.addEvent({
      delay: 8000,
      callback: () => {
        if (!this.scene.isPaused) {
          this.cameras.main.shake(300, 0.01);
        }
      },
      loop: true,
    });
  }

  createTerrain() {
    TerrainManager.createGround(this);
    TerrainManager.createPlatforms(this);
  }

  createPlayers() {
    // Get team counts from global game state
    const teamACount = window.CombatCrocs.gameState.game.teamACount || 1;
    const teamBCount = window.CombatCrocs.gameState.game.teamBCount || 1;

    this.players = [];
    this.playerSprites = {};
    this.playerBodies = {};

    // Calculate spawn positions for multiple players per team
    const groundY = Config.GAME_HEIGHT - 100;
    const spawnY = groundY - 10; // Small offset so they sit properly on ground

    // Create ALL players first with temporary positions
    for (let i = 0; i < teamACount; i++) {
      const playerId = `A${i + 1}`;
      const player = PlayerManager.createPlayer(
        this,
        playerId,
        100 + i * 50, // Temporary positions
        spawnY,
        Config.COLORS.CROCODILE_GREEN
      );
      this.players.push(player);
    }

    for (let i = 0; i < teamBCount; i++) {
      const playerId = `B${i + 1}`;
      const player = PlayerManager.createPlayer(
        this,
        playerId,
        200 + i * 50 + teamACount * 50, // Temporary positions
        spawnY,
        Config.COLORS.ORANGE
      );
      this.players.push(player);
    }

    // Now assign random positions to ALL players
    this.assignRandomSpawnPositions();

    // Update sprite and body references
    this.players.forEach((player) => {
      this.playerSprites[player.id] = player.graphics;
      this.playerBodies[player.id] = player.body;
    });

    console.log(
      `Created ${this.players.length} players: Team A (${teamACount}), Team B (${teamBCount})`
    );
  }

  assignRandomSpawnPositions() {
    const playerCount = this.players.length;
    const minDistance = 140; // Minimum distance between players

    // Define high-altitude spawn positions (well above all terrain)
    // This ensures characters spawn in unobstructed airspace and fall onto terrain
    const spawnLevels = [
      { y: Config.GAME_HEIGHT - 400, name: "Above All Terrain" }, // Way above everything
    ];

    // Safe spawn areas that avoid ALL platform collision areas (ground-level blocking)
    // Platform areas that block ground movement:
    // - Platform 1: x=300-500, blocks ground spawning in that X range
    // - Platform 2: x=625-775, blocks ground spawning in that X range
    // - Platform 3: x=900-1000, blocks ground spawning in that X range
    const safeGroundAreas = [
      { minX: 50, maxX: 290 }, // Before Platform 1
      { minX: 510, maxX: 615 }, // Between Platform 1 & 2
      { minX: 785, maxX: 890 }, // Between Platform 2 & 3
      { minX: 1010, maxX: 1150 }, // After Platform 3
    ];

    // For air spawning, we can use the entire width but need to avoid character collision
    const airSpawnAreas = [
      { level: 0, minX: 80, maxX: 1120 }, // Wide safe air space
    ];

    console.log(
      `Spawning ${playerCount} players in free airspace above all terrain`
    );

    // Generate dense spawn points in open airspace (guaranteed no collision)
    const allSpawnPoints = [];
    airSpawnAreas.forEach((area) => {
      for (let x = area.minX; x <= area.maxX; x += 15) {
        // Less dense for air
        allSpawnPoints.push({
          x: x,
          y: spawnLevels[area.level].y,
          levelName: spawnLevels[area.level].name,
        });
      }
    });

    console.log(
      `Generated ${allSpawnPoints.length} guaranteed collision-free spawn points`
    );

    // Shuffle spawn points for randomness
    for (let i = allSpawnPoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSpawnPoints[i], allSpawnPoints[j]] = [
        allSpawnPoints[j],
        allSpawnPoints[i],
      ];
    }

    // Assign players to positions
    for (let i = 0; i < playerCount; i++) {
      const player = this.players[i];

      // Find first available spawn point that's far enough from placed players
      let assignedPosition = null;
      for (const spawnPoint of allSpawnPoints) {
        const tooClose = this.players
          .slice(0, i)
          .some(
            (placedPlayer) =>
              Math.abs(spawnPoint.x - placedPlayer.x) < minDistance
          );

        if (!tooClose) {
          assignedPosition = spawnPoint;
          break;
        }
      }

      // Emergency fallback if no position found
      if (!assignedPosition) {
        console.warn(`Emergency placement for ${player.id}`);
        // Place at a random available spot ignoring minimum distance
        const fallbackIndex = Math.floor(Math.random() * allSpawnPoints.length);
        assignedPosition = allSpawnPoints[fallbackIndex];
      }

      // Update player position and physics
      player.x = assignedPosition.x;
      player.y = assignedPosition.y;
      player.graphics.setPosition(player.x, player.y);
      this.matter.body.setPosition(player.body, { x: player.x, y: player.y });

      console.log(
        `Assigned ${player.id} to ${assignedPosition.levelName} at (${assignedPosition.x}, ${assignedPosition.y})`
      );
    }

    console.log("All player positions assigned successfully!");
  }

  getActualTerrainHeightAtX(x) {
    // Better terrain height calculation
    // Since terrain is generated procedurally, we need a more accurate method
    const baseHeight = Config.GAME_HEIGHT - 200;
    const heightVariation =
      Math.sin(x * 0.01) * 60 +
      Math.sin(x * 0.02) * 30 +
      Math.sin(x * 0.005) * 100;

    return baseHeight + heightVariation;
  }

  createPlayer(id, x, y, color) {
    const playerGraphics = this.add.graphics({ x: x, y: y });

    // Draw crocodile as geometric shapes
    playerGraphics.fillStyle(color);

    // Body
    playerGraphics.fillRect(-15, -10, 30, 20);

    // Head
    playerGraphics.fillRect(15, -8, 12, 16);

    // Legs (simple rectangles)
    playerGraphics.fillRect(-12, 10, 8, 12);
    playerGraphics.fillRect(4, 10, 8, 12);

    // Tail
    playerGraphics.fillRect(-20, -5, 8, 10);

    // Eye and teeth (bright colors)
    playerGraphics.fillStyle(0xffd23f);
    playerGraphics.fillRect(18, -4, 4, 4);

    playerGraphics.fillStyle(0xffffff);
    playerGraphics.fillRect(21, -3, 6, 3);
    playerGraphics.fillRect(27, -3, 6, 3);

    // Create physics body
    const body = this.matter.add.rectangle(x, y, 30, 20, {
      friction: 0.1,
      restitution: 0.1,
      density: 0.01,
    });

    const player = {
      id: id,
      graphics: playerGraphics,
      body: body,
      x: x,
      y: y,
      health: 100,
      color: color,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
    };

    // Don't set gameObject to avoid Phaser emit expectations
    // We'll track physics manually

    return player;
  }

  updatePlayerPhysics(player) {
    // Cancel any existing velocity and position on ground
    this.matter.body.setVelocity(player.body, { x: 0, y: 0 });
    this.matter.body.setPosition(player.body, { x: player.x, y: player.y });
  }

  createUI() {
    UIManager.createHealthBars(this);
    UIManager.createWeaponDisplay(this);
    UIManager.createTimerDisplay(this);
    UIManager.createTurnIndicator(this);
    UIManager.createInstructions(this);
  }

  setupInput() {
    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Mouse aiming
    this.input.on("pointermove", this.handleAiming, this);
    this.input.on("pointerdown", this.handleShooting, this);

    // Clear aim line on turn change
    this.events.on("turnChange", () => {
      this.clearAimLine();
    });
  }

  startTurn() {
    // Log position before starting turn
    this.players.forEach((player) => {
      console.log(
        `Player ${player.id} position before turn: (${player.x}, ${player.y})`
      );
    });

    // Team-based turn system: advance to next player
    this.currentPlayer = this.getNextPlayerIndex();
    console.log(
      `Current team state: currentTeam=${this.currentTeam}, teamAPlayerIndex=${this.teamAPlayerIndex}, teamBPlayerIndex=${this.teamBPlayerIndex}`
    );
    this.turnTimer = Config.TURN_TIME_LIMIT / 1000;

    const currentPlayerObj = this.players[this.currentPlayer];
    currentPlayerObj.canMove = true;
    currentPlayerObj.canShoot = true;

    // Display player name based on team-based ID system
    const playerName =
      typeof currentPlayerObj.id === "string" && currentPlayerObj.id.length >= 2
        ? `Player ${currentPlayerObj.id}` // Already includes team prefix like "A1", "B2"
        : `Player ${currentPlayerObj.id}`;

    this.playerIndicator.setText(`${playerName}'s Turn`);

    // Color based on team (A = green, B = yellow/orange)
    const isTeamA =
      typeof currentPlayerObj.id === "string" &&
      currentPlayerObj.id.startsWith("A");
    this.playerIndicator.setFill(isTeamA ? "#00FF00" : "#FFD23F");

    // Highlight current player
    currentPlayerObj.graphics.setAlpha(1.0);

    // Dim all other players
    this.players.forEach((player, index) => {
      if (index !== this.currentPlayer) {
        player.graphics.setAlpha(0.5);
      }
    });

    // Clear aim line at start of turn
    this.clearAimLine();

    // Log position after starting turn
    console.log(
      `Starting turn for Player ${currentPlayerObj.id} at position: (${currentPlayerObj.x}, ${currentPlayerObj.y})`
    );
  }

  // Get the next player index using proper team alternation
  getNextPlayerIndex() {
    const teamACount = window.CombatCrocs.gameState.game.teamACount || 1;
    const teamBCount = window.CombatCrocs.gameState.game.teamBCount || 1;

    // Try up to teamACount + teamBCount attempts to find a living player
    let attempts = 0;
    const maxAttempts = this.players.length;

    while (attempts < maxAttempts) {
      let targetPlayerId;
      let targetTeam;

      // Determine which team should play next
      if (this.currentTeam === "A") {
        targetPlayerId = `A${this.teamAPlayerIndex + 1}`;
        targetTeam = "A";
      } else {
        targetTeam = "B";
        targetPlayerId = `B${this.teamBPlayerIndex + 1}`;
      }

      // Find the player
      const playerIndex = this.players.findIndex(
        (player) => player.id === targetPlayerId
      );

      if (playerIndex >= 0) {
        const player = this.players[playerIndex];

        // Check if this player is alive
        if (player.health > 0) {
          // Player is alive - switch to other team for next turn
          this.currentTeam = this.currentTeam === "A" ? "B" : "A";

          // Advance the player index for the team that is about to play
          if (targetTeam === "A") {
            this.teamAPlayerIndex = (this.teamAPlayerIndex + 1) % teamACount;
          } else {
            this.teamBPlayerIndex = (this.teamBPlayerIndex + 1) % teamBCount;
          }

          return playerIndex;
        } else {
          // Player is dead - advance to next player on same team
          console.log(
            `Player ${targetPlayerId} is dead, skipping to next player`
          );
          if (targetTeam === "A") {
            this.teamAPlayerIndex = (this.teamAPlayerIndex + 1) % teamACount;
          } else {
            this.teamBPlayerIndex = (this.teamBPlayerIndex + 1) % teamBCount;
          }
        }
      }

      attempts++;
    }

    // Emergency fallback - should not happen if game end detection works properly
    console.warn("No living players found - this should not happen!");
    return 0;
  }

  handleAiming(pointer) {
    if (!this.gameStarted || !this.players[this.currentPlayer].canShoot) return;

    const player = this.players[this.currentPlayer];
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      pointer.worldX,
      pointer.worldY
    );
    player.aimAngle = angle;

    // Update aim line when mouse moves
    this.updateAimLine();
  }

  handleShooting(pointer) {
    const player = this.players[this.currentPlayer];
    if (!player.canShoot || this.turnInProgress) return;

    console.log(
      `Player ${player.id} shooting at (${pointer.worldX}, ${pointer.worldY})`
    );

    // Player physics continues normally while projectile flies
    // They just lose movement control during projectile flight

    // Prevent shooting while turn is in progress
    this.turnInProgress = true;
    WeaponManager.createProjectile(
      this,
      player,
      pointer.worldX,
      pointer.worldY
    );
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight

    // Clear aim line
    this.clearAimLine();
  }

  updateHealthDisplay() {
    UIManager.updateHealthBars(this);
  }

  checkGameEnd() {
    // Check if all players on one team are dead
    const teamAPlayers = this.players.filter(
      (p) => typeof p.id === "string" && p.id.startsWith("A")
    );
    const teamBPlayers = this.players.filter(
      (p) => typeof p.id === "string" && p.id.startsWith("B")
    );

    const teamAAlive = teamAPlayers.some((p) => p.health > 0);
    const teamBAlive = teamBPlayers.some((p) => p.health > 0);

    if (!teamAAlive && teamBAlive) {
      // Team B wins
      this.showGameEnd("Team B");
      return true;
    } else if (teamAAlive && !teamBAlive) {
      // Team A wins
      this.showGameEnd("Team A");
      return true;
    }

    return false; // Game continues
  }

  showGameEnd(winnerTeam) {
    // Don't pause the scene - keep input working
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT);

    const gameOverText = this.add
      .text(
        Config.GAME_WIDTH / 2,
        Config.GAME_HEIGHT / 2,
        `${winnerTeam} Wins!\n\nClick to return to menu`,
        {
          font: "bold 32px Arial",
          fill: "#FFD23F",
          align: "center",
        }
      )
      .setOrigin(0.5);

    // Make it interactive and handle the click
    gameOverText.setInteractive();
    gameOverText.on("pointerdown", () => {
      this.scene.stop();
      this.scene.start("MenuScene");
    });

    // Also allow clicking anywhere on the overlay
    overlay.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, Config.GAME_WIDTH, Config.GAME_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    overlay.on("pointerdown", () => {
      this.scene.stop();
      this.scene.start("MenuScene");
    });
  }

  update(time, delta) {
    if (!this.gameStarted) {
      this.gameStarted = true;
    }

    // Update turn timer
    this.turnTimer = Math.max(0, this.turnTimer - delta / 1000);
    this.timerText.setText(`Time: ${Math.ceil(this.turnTimer)}`);

    // End turn if timer runs out and player hasn't started shooting yet
    if (this.turnTimer <= 0 && !this.turnInProgress) {
      console.log("Turn timer expired, starting next turn");
      this.startTurn();
    }

    // PHYSICS: Update ALL players (gravity, position sync) - runs even during projectile flight
    this.players.forEach((player) => {
      PlayerManager.updatePlayerPhysics(this, player);
    });

    // CONTROLS: Only current player gets movement controls when they can move
    if (this.players[this.currentPlayer].canMove) {
      const currentPlayer = this.players[this.currentPlayer];
      PlayerManager.handleMovement(
        this,
        currentPlayer,
        this.cursors,
        this.spaceKey
      );
    }

    // Clean physics flow: Players continue their jump/fall during projectile flight
    // Movement controls are restored only when their turn begins

    // Update aim line continuously when player can shoot (follows player movement)
    if (this.players[this.currentPlayer].canShoot) {
      this.updateAimLine();
    } else {
      this.clearAimLine();
    }

    // Update projectile positions and debug outlines
    this.matter.world.getAllBodies().forEach((body) => {
      if (body.projectileGraphics && !body.destroyed) {
        // Sync projectile graphics with physics body
        body.projectileGraphics.setPosition(body.position.x, body.position.y);

        // Sync debug outline with physics body
        if (body.debugOutline) {
          body.debugOutline.setPosition(body.position.x, body.position.y);
        }
      }
    });
  }

  updateAimLine() {
    this.clearAimLine();

    // Only show aiming when player can shoot
    if (!this.players[this.currentPlayer].canShoot) return;

    const player = this.players[this.currentPlayer];
    const mouse = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      mouse.worldX,
      mouse.worldY
    );

    // Create yellow direction arrow
    this.aimLine = this.add.graphics();
    this.aimLine.lineStyle(4, 0xffd23f); // Thick yellow line
    this.aimLine.moveTo(player.x, player.y);

    // Show direction with arrowhead (extended line for better visibility)
    const lineLength = Math.max(
      150,
      300 - Math.abs(player.body.velocity.y) * 5
    );
    const endX = player.x + Math.cos(angle) * lineLength;
    const endY = player.y + Math.sin(angle) * lineLength;

    this.aimLine.lineTo(endX, endY);
    this.aimLine.strokePath();

    // Add arrowhead
    const arrowSize = 12;
    this.aimLine.moveTo(endX, endY);
    this.aimLine.lineTo(
      endX - Math.cos(angle - Math.PI / 6) * arrowSize,
      endY - Math.sin(angle - Math.PI / 6) * arrowSize
    );
    this.aimLine.moveTo(endX, endY);
    this.aimLine.lineTo(
      endX - Math.cos(angle + Math.PI / 6) * arrowSize,
      endY - Math.sin(angle + Math.PI / 6) * arrowSize
    );
    this.aimLine.strokePath();
  }

  clearAimLine() {
    if (this.aimLine) {
      this.aimLine.destroy();
      this.aimLine = null;
    }
  }

  handleShooting(pointer) {
    const player = this.players[this.currentPlayer];
    if (!player.canShoot || this.turnInProgress) return;

    console.log(
      `Player ${player.id} shooting at (${pointer.worldX}, ${pointer.worldY})`
    );
    // Prevent shooting while turn is in progress
    this.turnInProgress = true;
    WeaponManager.createProjectile(
      this,
      player,
      pointer.worldX,
      pointer.worldY
    );
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight

    // Clear aim line
    this.clearAimLine();
  }

  endProjectileTurn() {
    // Reset turn state and start next player's turn
    console.log("Projectile turn ended, resetting turnInProgress to false");
    this.turnInProgress = false;

    // Small delay before starting next turn
    this.time.addEvent({
      delay: 500, // 0.5 seconds delay for explosion effect
      callback: () => {
        console.log("Starting next turn from endProjectileTurn");
        this.startTurn();
      },
    });
  }
}
