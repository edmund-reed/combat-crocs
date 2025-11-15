class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    // Initialize game state
    this.players = [];
    this.gameStarted = false;
    this.terrain = null;
    this.aimLine = null; // Yellow direction arrow

    // Initialize turn manager
    this.turnManager = new TurnManager(this);
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
    this.turnManager.startTurn();

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

    // Get selected map and create platforms based on its configuration
    const selectedMap = window.MapManager.getCurrentMap();
    TerrainManager.createPlatforms(this, selectedMap);
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

    // Wide safe air space across entire battlefield (well above all terrain)
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
      UIManager.clearAimLine(this);
    });
  }

  handleAiming(pointer) {
    if (
      !this.gameStarted ||
      !this.players[this.turnManager.getCurrentPlayerIndex()].canShoot
    )
      return;

    const player = this.players[this.turnManager.getCurrentPlayerIndex()];
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      pointer.worldX,
      pointer.worldY
    );
    player.aimAngle = angle;

    // Update aim line when mouse moves
    UIManager.updateAimLine(this);
  }

  handleShooting(pointer) {
    const player = this.players[this.turnManager.getCurrentPlayerIndex()];
    if (!player.canShoot || this.turnManager.isTurnInProgress()) return;

    console.log(
      `Player ${player.id} shooting at (${pointer.worldX}, ${pointer.worldY})`
    );

    // Player physics continues normally while projectile flies
    // They just lose movement control during projectile flight

    // Prevent shooting while turn is in progress
    this.turnManager.endCurrentTurn();
    WeaponManager.createProjectile(
      this,
      player,
      pointer.worldX,
      pointer.worldY
    );
    player.canShoot = false;
    player.canMove = false; // Lock movement during projectile flight

    // Clear aim line
    UIManager.clearAimLine(this);
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
      UIManager.showGameEndScreen(this, "Team B");
      return true;
    } else if (teamAAlive && !teamBAlive) {
      // Team A wins
      UIManager.showGameEndScreen(this, "Team A");
      return true;
    }

    return false; // Game continues
  }

  update(time, delta) {
    if (!this.gameStarted) {
      this.gameStarted = true;
    }

    // Update turn timer
    const currentTurnTime = this.turnManager.updateTurnTimer(delta / 1000);
    this.timerText.setText(`Time: ${currentTurnTime}`);

    // End turn if timer runs out and player hasn't started shooting yet
    if (this.turnManager.shouldEndTurn()) {
      console.log("Turn timer expired, starting next turn");
      this.turnManager.startTurn();
    }

    // PHYSICS: Update ALL players (gravity, position sync) - runs even during projectile flight
    this.players.forEach((player) => {
      PlayerManager.updatePlayerPhysics(this, player);
    });

    // CONTROLS: Only current player gets movement controls when they can move
    const currentPlayerIndex = this.turnManager.getCurrentPlayerIndex();
    if (this.players[currentPlayerIndex].canMove) {
      const currentPlayer = this.players[currentPlayerIndex];
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
    if (this.players[currentPlayerIndex].canShoot) {
      UIManager.updateAimLine(this);
    } else {
      UIManager.clearAimLine(this);
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

  endProjectileTurn() {
    // Reset turn state and start next player's turn with explosion effect delay
    console.log(
      "Projectile turn ended, starting next turn after explosion delay"
    );

    // Small delay before starting next turn (for explosion effect)
    this.time.addEvent({
      delay: 500, // 0.5 seconds delay for explosion effect
      callback: () => {
        console.log("Starting next turn from endProjectileTurn");
        this.turnManager.startTurn();
      },
    });
  }
}
