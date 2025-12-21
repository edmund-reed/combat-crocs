// Puppeteer-based game automation for AI training
// Launches Combat Crocs in browser and controls gameplay via neural networks

import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import { encodeGameState, decodeNetworkOutput, logGameStateInputs } from "./network-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PuppeteerGameRunner {
  constructor(options = {}) {
    this.options = {
      headless: options.headless || false, // Start with headed for debugging
      slowMo: options.slowMo || 0, // Delay between actions (ms)
      timeout: options.timeout || 300000, // 5 minute timeout per game
      devServerUrl: options.devServerUrl || "http://localhost:3001",
      ...options,
    };
    this.browser = null;
    this.page = null;
    this.gameInProgress = false;
    this.currentNetworks = {
      team1: null,
      team2: null,
    };
  }

  async initialize() {
    console.log("🚀 Launching browser...");

    try {
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
          "--disable-dev-shm-usage",
          "--mute-audio", // Disable audio for training
          "--autoplay-policy=no-user-gesture-required",
        ],
        ignoreHTTPSErrors: true,
        dumpio: false,
      });
    } catch (launchError) {
      console.error("❌ Failed to launch browser with Puppeteer's bundled Chromium");
      console.error("Error:", launchError.message);
      console.log("\n🔄 Attempting to use system Chrome instead...");

      // Try with system Chrome as fallback
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
      });
      console.log("✅ Using system Chrome");
    }

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1200, height: 800 });

    // Log console messages from the game
    this.page.on("console", msg => {
      if (msg.text().includes("[AI]")) {
        console.log("  🎮", msg.text());
      }
    });

    console.log("✅ Browser initialized");
  }

  async loadGame() {
    console.log(`🎮 Loading game from ${this.options.devServerUrl}...`);
    await this.page.goto(this.options.devServerUrl, {
      waitUntil: "networkidle0",
      timeout: this.options.timeout,
    });

    // Wait for Phaser to load
    await this.page.waitForFunction(() => window.Phaser && window.CombatCrocs, { timeout: 30000 });

    console.log("✅ Game loaded");
  }

  async setGameSpeed(multiplier = 2.0) {
    console.log(`⚡ Setting game speed to ${multiplier}x...`);

    await this.page.evaluate(speed => {
      // Store speed multiplier globally for game scenes to use
      window.__TRAINING_SPEED_MULTIPLIER__ = speed;

      console.log(`[AI] Game speed multiplier set to ${speed}x`);
    }, multiplier);

    console.log(`✅ Game speed set to ${multiplier}x`);
  }

  async startNewGame(network1, network2, gameConfig = {}) {
    const config = {
      mode: gameConfig.mode || "1v1",
      map: gameConfig.map || "hotelOfHorror",
      ...gameConfig,
    };

    console.log(`\n🎲 Starting new game: ${config.mode} on ${config.map}`);

    try {
      // Navigate through menus
      await this.navigateToGameStart(config);

      // Inject AI brains
      await this.injectAIControllers(network1, network2);

      // Play the game
      const result = await this.playGame();

      return result;
    } catch (error) {
      console.error("❌ Game error:", error.message);
      return {
        error: error.message,
        winner: null,
        stats: null,
      };
    }
  }

  async navigateToGameStart(config) {
    console.log("  📋 Navigating to game...");

    // Wait for Phaser and CombatCrocs to be ready
    await this.page.waitForFunction(
      () => {
        return window.Phaser && window.CombatCrocs;
      },
      { timeout: 15000 },
    );

    console.log("  ✅ Phaser ready");

    // First, let's inspect what's actually available
    const gameStructure = await this.page.evaluate(() => {
      const phaserGame = window.CombatCrocs?.game;
      const currentScene = phaserGame?.scene?.getScenes(true)[0];

      return {
        hasCombatCrocs: !!window.CombatCrocs,
        hasGameState: !!window.CombatCrocs?.gameState,
        hasPhaserGame: !!phaserGame,
        hasSceneManager: !!phaserGame?.scene,
        currentSceneKey: currentScene?.scene?.key,
        sceneKeys: phaserGame?.scene ? Object.keys(phaserGame.scene.keys) : [],
      };
    });

    console.log("  📊 Game structure:", JSON.stringify(gameStructure, null, 2));

    // Give the menu scene time to fully render
    await this.delay(2000);

    console.log("  🔧 Attempting to navigate programmatically...");

    // Try to navigate through scenes by simulating scene transitions
    try {
      await this.page.evaluate(() => {
        console.log("[AI] Checking Phaser game instance...");

        const phaserGame = window.CombatCrocs?.game;
        if (!phaserGame?.scene) {
          throw new Error("Phaser game instance not found");
        }

        const currentScene = phaserGame.scene.getScenes(true)[0];
        console.log("[AI] Current scene:", currentScene?.scene?.key);
        console.log("[AI] Available scenes:", Object.keys(phaserGame.scene.keys));

        // Set up minimal game state
        if (!window.CombatCrocs.gameState.game) {
          window.CombatCrocs.gameState.game = {};
        }

        // Set up teams for the game
        const teams = [
          {
            id: 1,
            name: "Team 1",
            crocCount: 1,
            color: { name: "Blue", key: "blue", hex: "#0066CC" },
            players: [{ characterType: "CROCODILE" }],
          },
          {
            id: 2,
            name: "Team 2",
            crocCount: 1,
            color: { name: "Red", key: "red", hex: "#CC0000" },
            players: [{ characterType: "CROCODILE" }],
          },
        ];

        // Store teams in game state (StateManager.storeTeams does this)
        window.CombatCrocs.gameState.game.teams = teams;
        window.CombatCrocs.gameState.game.selectedMap = "hotelOfHorror";

        // Use MapManager to properly set the current map
        if (window.MapManager && window.MapManager.setCurrentMap) {
          window.MapManager.setCurrentMap("hotelOfHorror");
          console.log("[AI] Map set via MapManager");
        }

        // Navigate through PlayerSelectScene to properly initialize everything
        console.log("[AI] Starting PlayerSelectScene for proper initialization...");
        phaserGame.scene.start("PlayerSelectScene");
      });

      console.log("  ⏳ Waiting for PlayerSelectScene to load...");
      await this.delay(1000);

      // Now transition to GameScene
      await this.page.evaluate(() => {
        console.log("[AI] Transitioning to GameScene...");
        const phaserGame = window.CombatCrocs?.game;
        const playerScene = phaserGame?.scene?.getScene("PlayerSelectScene");

        if (playerScene && playerScene.scene.isActive()) {
          const teams = [
            {
              id: 1,
              name: "Team 1",
              crocCount: 1,
              color: { name: "Blue", key: "blue", hex: "#0066CC" },
              players: [{ characterType: "CROCODILE" }],
            },
            {
              id: 2,
              name: "Team 2",
              crocCount: 1,
              color: { name: "Red", key: "red", hex: "#CC0000" },
              players: [{ characterType: "CROCODILE" }],
            },
          ];

          // Set teams on the scene
          playerScene.teams = teams;

          // Start GameScene
          playerScene.scene.start("GameScene");
          console.log("[AI] GameScene started from PlayerSelectScene");
        } else {
          // Fallback
          console.log("[AI] PlayerSelectScene not active, starting GameScene directly");
          phaserGame.scene.start("GameScene");
        }
      });

      console.log("  ⏳ Waiting for GameScene to initialize...");
      await this.delay(2000);

      // Wait for game scene to be active and have players
      await this.page.waitForFunction(
        () => {
          const phaserGame = window.CombatCrocs?.game;
          const gameScene = phaserGame?.scene?.getScene("GameScene");
          return gameScene?.scene?.isActive() && gameScene?.players?.length > 0;
        },
        { timeout: 30000 },
      );

      // Apply speed multiplier if set
      await this.page.evaluate(() => {
        const speedMultiplier = window.__TRAINING_SPEED_MULTIPLIER__;
        if (speedMultiplier) {
          const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
          if (scene?.physics?.world) {
            scene.physics.world.timeScale = speedMultiplier;
            scene.time.timeScale = speedMultiplier;
            console.log(`[AI] Applied ${speedMultiplier}x speed to game physics`);
          }
        }
      });

      console.log("  ✅ Game started successfully!");
    } catch (error) {
      console.error("  ❌ Navigation error:", error.message);
      throw error;
    }
  }

  async setup1v1() {
    // This is simplified - you'll need to adjust based on your actual UI
    // The goal is to set up Team 1 with 1 player, Team 2 with 1 player

    // Wait for player selection screen
    await this.delay(1000);

    // Click through to confirm default setup
    // This needs to be customized based on your actual menu flow
    try {
      const nextButton = await this.page.$("text/Next");
      if (nextButton) await nextButton.click();
      await this.delay(500);
    } catch (e) {
      console.log("  ⚠️  Manual menu navigation may be needed");
    }
  }

  async setup2v2() {
    // Placeholder for 2v2 setup
    console.log("  ⚠️  2v2 setup not yet implemented");
    await this.delay(1000);
  }

  async injectAIControllers(network1, network2) {
    console.log("  🧠 Injecting AI controllers...");

    // Inject the AI controller that will make decisions each turn
    await this.page.evaluate(
      (net1JSON, net2JSON) => {
        // Store networks
        window.__AI_NETWORKS__ = {
          team1: net1JSON,
          team2: net2JSON,
        };

        // Always re-hook (don't check the flag)
        const gameScene = window.CombatCrocs?.game?.scene?.getScene("GameScene");

        if (gameScene?.turnManager) {
          const originalStartTurn = gameScene.turnManager.startTurn.bind(gameScene.turnManager);

          gameScene.turnManager.startTurn = function (...args) {
            // Call original startTurn first
            originalStartTurn(...args);

            // Immediately signal that AI should act
            const playerIndex = this.getCurrentPlayerIndex();
            const currentPlayer = gameScene.players?.[playerIndex];

            if (currentPlayer) {
              console.log(`[AI] Turn ${this.turnCount}: Player ${playerIndex} (Team ${currentPlayer.team})`);

              // Signal AI to act immediately
              window.__AI_TURN_DATA__ = {
                ready: true,
                playerIndex,
                team: currentPlayer.team,
                turnCount: this.turnCount,
              };
            }
          };

          console.log("[AI] Controller injected and hooked to TurnManager.startTurn");
        } else {
          console.log("[AI] Warning: Could not hook into TurnManager");
        }
      },
      network1 ? network1.toJSON() : null,
      network2 ? network2.toJSON() : null,
    );

    console.log("  ✅ AI controllers ready");
  }

  async playGame() {
    console.log("  ⚙️  Game in progress...");
    this.gameInProgress = true;

    let turnCount = 0;
    const maxTurns = 200; // Safety limit

    // Track initial health for damage calculation & initialize shot history and feedback
    const initialHealth = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      if (!scene) return null;

      const teams = {};
      scene.players.forEach(p => {
        if (!teams[p.team]) {
          teams[p.team] = { totalHealth: 0, playerCount: 0 };
        }
        teams[p.team].totalHealth += p.health;
        teams[p.team].playerCount++;
      });

      // Initialize shot history for this game
      window.__AI_SHOT_HISTORY__ = { recent: [] };

      // Initialize shot feedback tracking (CRITICAL for learning)
      window.__AI_LAST_TURN_STATE__ = {};
      window.__AI_SHOT_FEEDBACK__ = {
        team1: {
          didDamageEnemy: false,
          damageDealt: 0,
          didDamageSelf: false,
          damageTaken: 0,
          myHealthDelta: 0,
          enemyHealthDelta: 0,
        },
        team2: {
          didDamageEnemy: false,
          damageDealt: 0,
          didDamageSelf: false,
          damageTaken: 0,
          myHealthDelta: 0,
          enemyHealthDelta: 0,
        },
      };

      return teams;
    });

    const stats = {
      turns: 0,
      team1Damage: 0,
      team2Damage: 0,
      startTime: Date.now(),
      initialHealth,
    };

    try {
      while (this.gameInProgress && turnCount < maxTurns) {
        turnCount++;

        // Check if game has ended
        const gameEnded = await this.page.evaluate(() => {
          const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
          if (!scene) return false;

          // Check win condition
          const teams = scene.players.reduce((acc, p) => {
            if (p.health > 0 && !p.inLastStand) {
              acc[p.team] = (acc[p.team] || 0) + 1;
            }
            return acc;
          }, {});

          const aliveTeams = Object.keys(teams).length;
          return aliveTeams <= 1;
        });

        if (gameEnded) {
          console.log("  🏁 Game ended!");
          break;
        }

        // Execute AI turn
        await this.executeAITurn();

        // Brief delay between turns
        await this.delay(100);
      }

      // Get final results
      const result = await this.page.evaluate(() => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        if (!scene) return null;

        const teams = {};
        scene.players.forEach(p => {
          if (!teams[p.team]) {
            teams[p.team] = { alive: 0, totalHealth: 0, players: [] };
          }
          if (p.health > 0 && !p.inLastStand) {
            teams[p.team].alive++;
          }
          teams[p.team].totalHealth += p.health;
          teams[p.team].players.push({
            id: p.id,
            health: p.health,
            maxHealth: p.maxHealth,
          });
        });

        // Determine winner
        const aliveTeams = Object.entries(teams).filter(([_, data]) => data.alive > 0);
        const winner = aliveTeams.length === 1 ? parseInt(aliveTeams[0][0]) : null;

        return {
          winner,
          teams,
          turns: scene.turnManager.turnCount,
        };
      });

      stats.turns = result.turns;
      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;

      console.log(`  ✅ Game complete: Winner = Team ${result.winner || "Draw"} (${turnCount} turns)`);

      // FIXED: Include initialHealth in the returned stats
      return {
        winner: result.winner,
        stats: {
          ...result,
          initialHealth: stats.initialHealth, // CRITICAL: Add initial health for damage calculation
        },
        error: null,
      };
    } catch (error) {
      console.error("  ❌ Game error:", error.message);
      return {
        winner: null,
        stats: null,
        error: error.message,
      };
    } finally {
      this.gameInProgress = false;
    }
  }

  async executeAITurn() {
    // Signal that AI should act
    await this.page.evaluate(() => {
      window.__AI_SHOULD_ACT__ = true;
    });

    // Wait for turn data to be ready
    const turnData = await this.page
      .waitForFunction(() => window.__AI_TURN_DATA__?.ready, { timeout: 5000 })
      .catch(() => null);

    if (!turnData) {
      // No AI turn needed, probably between turns
      return;
    }

    // Get game state and team info with ENHANCED data
    const { gameState, team } = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];

      // Extract game state (similar to gameplay recorder)
      const enemies = scene.players.filter(p => p.team !== currentPlayer.team && p.health > 0);
      const targetEnemy = enemies[0]; // Primary target

      // ENHANCED: Calculate ballistics data
      const weapon = scene.turnManager.getCurrentWeapon();
      const weaponConfig = window.CombatCrocs?.config?.WEAPON_CONFIGS?.[weapon] || {};

      const distance = targetEnemy
        ? Phaser.Math.Distance.Between(currentPlayer.x, currentPlayer.y, targetEnemy.x, targetEnemy.y)
        : 500;

      const angle = targetEnemy
        ? Phaser.Math.Angle.Between(currentPlayer.x, currentPlayer.y, targetEnemy.x, targetEnemy.y)
        : 0;

      // Calculate optimal ballistic angle using physics
      const velocity = weaponConfig.initialVelocity || 500;
      const gravity = 981; // Phaser default gravity
      const heightDiff = targetEnemy ? currentPlayer.y - targetEnemy.y : 0;

      // Ballistic trajectory formula: angle = atan((v² ± sqrt(v⁴ - g(gx² + 2yv²))) / (gx))
      let optimalAngle = angle; // Fallback to direct angle

      if (targetEnemy && distance > 0) {
        const v2 = velocity * velocity;
        const g = gravity;
        const x = distance;
        const y = heightDiff;

        // Discriminant to check if target is reachable
        const discriminant = v2 * v2 - g * (g * x * x + 2 * y * v2);

        if (discriminant >= 0) {
          // Two possible angles - use the lower one (more direct shot)
          const sqrtDiscriminant = Math.sqrt(discriminant);
          const angle1 = Math.atan((v2 + sqrtDiscriminant) / (g * x));
          const angle2 = Math.atan((v2 - sqrtDiscriminant) / (g * x));

          // Adjust for Phaser's coordinate system and direction
          optimalAngle = angle2; // Lower arc

          // Convert to proper angle based on target direction
          if (targetEnemy.x < currentPlayer.x) {
            optimalAngle = Math.PI - optimalAngle; // Flip for left-facing shots
          }
        }
      }

      const ballistics = {
        projectileSpeed: velocity,
        gravity: gravity,
        timeToImpact: distance / velocity,
        optimalAngle: optimalAngle, // Physics-calculated optimal angle!
        powerNeeded: 1.0,
        windEffect: 0,
        arcHeight: (velocity * velocity * Math.sin(2 * optimalAngle)) / (2 * gravity),
        collisionPredicted: false,
      };

      // ENHANCED: Sample terrain along trajectory (10 points)
      const terrain = [];
      if (targetEnemy) {
        for (let i = 0; i < 10; i++) {
          const t = i / 9; // 0 to 1
          const x = currentPlayer.x + (targetEnemy.x - currentPlayer.x) * t;
          const y = currentPlayer.y + (targetEnemy.y - currentPlayer.y) * t;

          // Get terrain height at this point (if terrain manager exists)
          let terrainHeight = 0;
          if (scene.terrainManager?.getTerrainHeightAt) {
            terrainHeight = scene.terrainManager.getTerrainHeightAt(x);
          }
          terrain.push(terrainHeight);
        }
      } else {
        // No target, fill with zeros
        for (let i = 0; i < 10; i++) terrain.push(0);
      }

      // ENHANCED: Obstacle detection
      const obstacles = {
        lineOfSight: true, // Simplified - would need raycasting
        nearestDistance: 1000,
        obstacleHeight: 0,
        terrainType: 0,
      };

      // Check if there are obstacles between player and target
      if (targetEnemy && scene.terrainManager) {
        // Simplified obstacle check
        const midX = (currentPlayer.x + targetEnemy.x) / 2;
        const midY = (currentPlayer.y + targetEnemy.y) / 2;

        // Check if terrain blocks shot (very simplified)
        const terrainAtMid = scene.terrainManager.getTerrainHeightAt
          ? scene.terrainManager.getTerrainHeightAt(midX)
          : 0;

        if (terrainAtMid > midY) {
          obstacles.lineOfSight = false;
          obstacles.obstacleHeight = terrainAtMid - midY;
        }
      }

      // ENHANCED: Shot history (retrieve from window storage)
      const shotHistory = window.__AI_SHOT_HISTORY__ || { recent: [] };

      // CRITICAL: Calculate shot feedback from last turn
      const lastState = window.__AI_LAST_TURN_STATE__[`team${currentPlayer.team}`];
      let shotFeedback = {
        didDamageEnemy: false,
        damageDealt: 0,
        didDamageSelf: false,
        damageTaken: 0,
        myHealthDelta: 0,
        enemyHealthDelta: 0,
      };

      if (lastState) {
        // Calculate health changes
        const myHealthDelta = currentPlayer.health - lastState.myHealth;
        shotFeedback.myHealthDelta = myHealthDelta;

        // Calculate enemy health changes
        const currentEnemyHealth = enemies.reduce((sum, e) => sum + e.health, 0);
        const enemyHealthDelta = currentEnemyHealth - lastState.enemyHealth;
        shotFeedback.enemyHealthDelta = enemyHealthDelta;

        // Determine what happened
        if (enemyHealthDelta < 0) {
          shotFeedback.didDamageEnemy = true;
          shotFeedback.damageDealt = Math.abs(enemyHealthDelta);
        }

        if (myHealthDelta < 0) {
          shotFeedback.didDamageSelf = true;
          shotFeedback.damageTaken = Math.abs(myHealthDelta);
        }
      }

      // Store current state for next turn's feedback
      window.__AI_LAST_TURN_STATE__[`team${currentPlayer.team}`] = {
        myHealth: currentPlayer.health,
        enemyHealth: enemies.reduce((sum, e) => sum + e.health, 0),
        turnNumber: scene.turnManager.turnCount,
      };

      const state = {
        self: {
          health: currentPlayer.health,
          maxHealth: currentPlayer.maxHealth,
          x: currentPlayer.x,
          y: currentPlayer.y,
          team: currentPlayer.team,
        },
        enemies: enemies.slice(0, 4).map(enemy => ({
          health: enemy.health,
          maxHealth: enemy.maxHealth,
          distance: Phaser.Math.Distance.Between(currentPlayer.x, currentPlayer.y, enemy.x, enemy.y),
          angle: Phaser.Math.Angle.Between(currentPlayer.x, currentPlayer.y, enemy.x, enemy.y),
          threat: 50, // Placeholder
        })),
        weapons: {
          ammo: { ...scene.turnManager.weaponAmmo },
        },
        context: {
          turnNumber: scene.turnManager.turnCount,
          timeRemaining: 30,
        },
        // NEW ENHANCED DATA:
        ballistics,
        terrain,
        obstacles,
        shotHistory,
        shotFeedback, // CRITICAL: Immediate feedback from last turn!
      };

      return { gameState: state, team: currentPlayer.team };
    });

    // Use neural network decision if available, otherwise random
    const action = await this.makeAIDecision(gameState, team);

    // Execute the action in the game
    await this.page.evaluate(action => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];
      const weapon = scene.turnManager.getCurrentWeapon();

      console.log("[AI] Executing action:", action);

      // Set aim angle
      currentPlayer.aimAngle = action.aimAngle;

      // Calculate target position based on aim
      const targetX = currentPlayer.x + Math.cos(action.aimAngle) * 500;
      const targetY = currentPlayer.y + Math.sin(action.aimAngle) * 500;

      // Fire the weapon (if we have ammo and can shoot)
      if (currentPlayer.canShoot && scene.turnManager.weaponAmmo[weapon] > 0) {
        console.log(`[AI] Firing ${weapon} at angle ${action.aimAngle.toFixed(2)}`);

        // Decrement ammo
        scene.turnManager.weaponAmmo[weapon]--;
        scene.turnManager.weaponLocked = true;
        scene.canReviveThisTurn = false;

        // Fire the weapon using WeaponManager
        if (window.WeaponManager && window.WeaponManager.fireWeapon) {
          window.WeaponManager.fireWeapon(scene, currentPlayer, targetX, targetY, weapon);

          // Handle turn end based on weapon type
          const config = window.CombatCrocs.config.WEAPON_CONFIGS[weapon];
          if (config?.behaviorFlags?.includes("timerExplosion")) {
            scene.turnManager.currentTurnTimer?.destroy();
            scene.turnManager.currentTurnTimer = null;
          } else if (scene.turnManager.weaponAmmo[weapon] <= 0) {
            scene.turnManager.endCurrentTurn();
          }
        } else {
          console.log("[AI] Warning: WeaponManager not found, ending turn");
          scene.turnManager.startTurn();
        }
      } else {
        console.log("[AI] Cannot shoot (no ammo or cannot shoot), skipping turn");
        scene.turnManager.startTurn();
      }

      // Clear turn data
      window.__AI_TURN_DATA__ = null;
    }, action);

    await this.delay(1500); // Wait for weapon to fire and projectile to travel
  }

  async makeAIDecision(gameState, team) {
    // Get the neural network for this team from the browser
    const networkJSON = await this.page.evaluate(teamNum => {
      return window.__AI_NETWORKS__?.[`team${teamNum}`];
    }, team);

    // If no network available, use random decision
    if (!networkJSON) {
      return this.makeRandomDecision(gameState);
    }

    // Encode game state
    const inputs = encodeGameState(gameState);

    // VALIDATION: Log inputs for first few turns (verbose mode)
    if (this.options.verboseLogging && gameState.context.turnNumber <= 3) {
      console.log(`\n🔍 INPUT VALIDATION - Team ${team}, Turn ${gameState.context.turnNumber}`);
      logGameStateInputs(gameState, inputs, true);
    }

    // Run through network (in Node.js context)
    const outputs = await this.page.evaluate(
      (netJSON, inputArray) => {
        // Reconstruct network from JSON
        if (!window.neataptic) {
          // Network not available in browser, return null
          return null;
        }
        const { Network } = window.neataptic;
        const network = Network.fromJSON(netJSON);

        // Activate network
        return network.activate(inputArray);
      },
      networkJSON,
      inputs,
    );

    // If browser evaluation failed, use random
    if (!outputs) {
      return this.makeRandomDecision(gameState);
    }

    // Decode outputs to actions
    const decision = decodeNetworkOutput(outputs);

    return {
      weapon: decision.weapon,
      aimAngle: decision.aimAngle,
      targetIndex: decision.targetIndex,
      power: decision.power,
      movement: decision.movement,
    };
  }

  makeRandomDecision(gameState) {
    // Fallback: Random decision when no network available
    return {
      weapon: "BAZOOKA",
      aimAngle: (Math.random() - 0.5) * Math.PI,
      targetIndex: 0,
      power: 1.0,
      movement: "none",
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    console.log("🔒 Closing browser...");
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

export default PuppeteerGameRunner;
