// Player utilities for Combat Crocs

class PlayerManager {
  // Create a crocodile player
  static createPlayer(scene, id, x, y, color) {
    // Choose sprite based on team (rotate through available sprites)
    let spriteKey = "croc1"; // Default sprite

    if (typeof id === "string" && id.length >= 2) {
      // Team-based ID system: 11, 12, 21, 22, etc. where first digit is team
      const teamId = parseInt(id.charAt(0));
      // Rotate through all available character sprites based on team ID
      const availableSprites = ["croc1", "croc2", "chameleon1", "gecko1"];
      spriteKey = availableSprites[(teamId - 1) % availableSprites.length];
    } else {
      // Legacy numeric ID system for backward compatibility
      spriteKey = id === 1 ? "croc1" : "croc2";
    }

    console.log(`🐊 Creating Player ${id} with sprite: ${spriteKey}`);

    // Create player sprite
    const playerSprite = scene.add.sprite(x, y, spriteKey);
    playerSprite.setScale(0.12); // Scale down to appropriate game size (~36-48px instead of 300-400px)
    playerSprite.setOrigin(0.5, 0.7); // Center horizontally, slightly below center for ground contact

    // Flip sprite based on team (alternate left/right for visual distinction)
    const teamId = parseInt(id.charAt(0));
    const shouldFaceLeft = teamId % 2 === 0; // Team 2,4,6 face left; Team 1,3,5 face right
    playerSprite.setFlipX(shouldFaceLeft);

    console.log(
      `🖼️ Created sprite ${spriteKey} at (${x}, ${y}) with scale 0.12, facing ${shouldFaceLeft ? "left" : "right"}`,
    );

    // Create physics body with collision settings
    const body = scene.matter.add.rectangle(x, y, 30, 20, {
      friction: 0.1,
      restitution: 0.1,
      density: 0.01,
      // Players don't collide with each other, only with terrain
      collisionFilter: {
        group: 0, // No group - allows custom collision control
        mask: 1, // Only collide with category 1 (terrain)
        category: 2, // Players are in category 2
      },
    });

    const player = {
      id: id,
      graphics: playerSprite, // Use sprite instead of procedural graphics
      body: body,
      x: x,
      y: y,
      health: 100,
      color: color,
      aimAngle: 0,
      canMove: false,
      canShoot: false,
      facingLeft: shouldFaceLeft, // Track which direction sprite is facing
    };

    return player;
  }

  // Update player position sync
  static updatePositionSync(player) {
    player.x = player.body.position.x;
    player.y = player.body.position.y;
    player.graphics.setPosition(player.x, player.y);
  }

  // Update player physics (gravity, velocity) for ALL players - called every frame
  static updatePlayerPhysics(scene, player) {
    // Update position sync
    player.x = player.body.position.x;
    player.y = player.body.position.y;
    player.graphics.setPosition(player.x, player.y);

    // Enforce screen boundaries for ALL players
    if (player.x < 30 || player.x > Config.GAME_WIDTH - 30) {
      const clampedX = Math.max(35, Math.min(Config.GAME_WIDTH - 35, player.x));
      scene.matter.body.setPosition(player.body, { x: clampedX, y: player.y });
      player.x = clampedX;
      player.graphics.setPosition(player.x, player.y);
    }
  }

  // Reset player for new turn
  static resetForTurn(player) {
    player.canMove = false;
    player.canShoot = false;
  }

  // Setup player for their turn
  static activateForTurn(player) {
    player.canMove = true;
    player.canShoot = true;
  }

  // Assign random spawn positions to all players (delegated to SpawnManager)
  static assignRandomSpawnPositions(scene, players) {
    SpawnManager.assignRandomSpawnPositions(scene, players);
  }

  // Create all players for the game (moved from GameScene.js)
  static createGamePlayers(scene) {
    // Get teams from global game state
    const teams = GameStateManager.getTeams();

    scene.players = [];
    scene.playerSprites = {};
    scene.playerBodies = {};

    // Calculate spawn positions for multiple players per team
    const groundY = Config.GAME_HEIGHT - 100;
    const spawnY = groundY - 10; // Small offset so they sit properly on ground

    const teamColors = [
      0xff0000, // Red
      0xffff00, // Yellow
      0x00ff00, // Green
      0x0000ff, // Blue
      0x8a2be2, // Purple
    ];

    // Create ALL players first with temporary positions
    teams.forEach((team, teamIndex) => {
      for (let i = 0; i < team.crocCount; i++) {
        const playerId = `${team.id}${i + 1}`;
        const player = this.createPlayer(
          scene,
          playerId,
          100 + teamIndex * 100 + i * 50, // Temporary positions spaced by team
          spawnY,
          teamColors[teamIndex % teamColors.length],
        );
        scene.players.push(player);
      }
    });

    // Now assign random positions to ALL players
    this.assignRandomSpawnPositions(scene, scene.players);

    // Update sprite and body references
    scene.players.forEach(player => {
      scene.playerSprites[player.id] = player.graphics;
      scene.playerBodies[player.id] = player.body;
    });

    const teamSummary = teams.map(t => `Team ${t.id} (${t.crocCount})`).join(", ");
    console.log(`Created ${scene.players.length} players: ${teamSummary}`);
  }
}

window.PlayerManager = PlayerManager;
