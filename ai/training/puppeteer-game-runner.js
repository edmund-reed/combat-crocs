// Puppeteer-based game automation for AI training
// Launches Combat Crocs in browser and controls gameplay via neural networks

import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";
import neataptic from "neataptic";
import { getLookAheadSimulationInjection, getTrainingModeInjection } from "./browser-injections.js";
import { findBestShootingPosition } from "./movement-lookahead.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PuppeteerGameRunner {
  constructor(options = {}) {
    this.options = {
      headless: options.headless || false, // Start with headed for debugging
      slowMo: options.slowMo || 0, // Delay between actions (ms)
      timeout: options.timeout || 300000, // 5 minute timeout per game
      devServerUrl: options.devServerUrl || "http://localhost:3001",
      verifyPhysics: options.verifyPhysics || false, // Debug mode: compare predicted vs actual landing
      ...options,
    };
    this.browser = null;
    this.page = null;
    this.gameInProgress = false;
    this.currentNetworks = {
      team1: null,
      team2: null,
    };
    this.customEncoder = options.customEncoder || null; // Allow custom encoding function
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

    // CRITICAL: Make InstantShotResolver globally available for look-ahead
    // Look-ahead needs access to the exact same physics simulation function
    await this.page.evaluate(() => {
      // InstantShotResolver should already be available via the game's module system
      // Just verify it's accessible on window for look-ahead
      if (!window.InstantShotResolver && window.CombatCrocs?.InstantShotResolver) {
        window.InstantShotResolver = window.CombatCrocs.InstantShotResolver;
        console.log("[AI] InstantShotResolver made available for look-ahead");
      } else if (!window.InstantShotResolver) {
        console.warn("[AI] WARNING: InstantShotResolver not found in browser context");
      } else {
        console.log("[AI] InstantShotResolver already available");
      }
    });

    console.log("✅ Game loaded");
  }

  async setGameSpeed(multiplier = 1.0) {
    console.log(`⚡ Setting up training mode...`);

    // Set instant shot mode based on option
    await this.page.evaluate(instantShot => {
      window.__TRAINING_MODE__ = true;
      window.__SKIP_ANIMATIONS__ = true;
      window.__INSTANT_BAZOOKA__ = instantShot;

      console.log(`[AI] Training mode enabled: ${instantShot ? "instant" : "real"} bazooka`);
    }, this.options.instantShot || false);

    // CRITICAL: Inject look-ahead simulation code
    await this.page.evaluate(getLookAheadSimulationInjection());
    console.log(`✅ Look-ahead simulation injected`);

    console.log(
      `✅ Training mode configured (${this.options.instantShot ? "instant shot" : "real physics"})`,
    );
  }

  async startNewGame(network1, network2, gameConfig = {}) {
    const config = {
      mode: gameConfig.mode || "1v1",
      map: gameConfig.map || "heavyMetalCoaster", // Default map if not specified
      ...gameConfig,
    };

    console.log(`\n🎲 Starting new game: ${config.mode} on ${config.map}`);

    // CRITICAL FIX: Add retry logic with exponential backoff
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Navigate through menus
        await this.navigateToGameStart(config);

        // Inject AI brains
        await this.injectAIControllers(network1, network2);

        // GameScene.create() already calls turnManager.startTurn()
        // No need to manually trigger - let the game's natural flow handle it

        // Play the game (Turn 1 will execute naturally via GameScene.create())
        const result = await this.playGame();

        return result;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        if (error.message.includes("main frame") || error.message.includes("Target closed")) {
          if (isLastAttempt) {
            console.error(`❌ Game error after ${maxRetries + 1} attempts:`, error.message);
            return {
              error: error.message,
              winner: null,
              stats: null,
            };
          }
          // Retry with exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(
            `  ⚠️ Frame error, retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries + 1})`,
          );
          await this.delay(waitTime);
        } else {
          // Non-retryable error
          console.error("❌ Game error:", error.message);
          return {
            error: error.message,
            winner: null,
            stats: null,
          };
        }
      }
    }
  }

  async navigateToGameStart(config) {
    console.log("  📋 Navigating to game...");
    const mapName = config.map || "heavyMetalCoaster";

    // CRITICAL: Wait for previous GameScene cleanup (headed mode only)
    if (!this.options.headless) {
      await this.page
        .waitForFunction(
          () => {
            const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
            return !scene || !scene.scene.isActive();
          },
          { timeout: 3000 },
        )
        .catch(() => {
          // Timeout is fine - scene might already be stopped
        });
    }

    // Inject map name into browser context so it can be used during setup
    await this.page.evaluate(map => {
      window.__CURRENT_MAP_NAME__ = map;
    }, mapName);

    // CRITICAL FIX: Add delay to ensure page main frame is ready
    // Minimized for maximum speed in headless mode
    const initDelay = this.options.headless ? 0 : 1000;
    await this.delay(initDelay);

    // Wait for Phaser and CombatCrocs to be ready with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await this.page.waitForFunction(
          () => {
            return window.Phaser && window.CombatCrocs;
          },
          { timeout: 15000 },
        );
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`  ⚠️ Page not ready, retrying... (${retries} attempts left)`);
        await this.delay(2000);
      }
    }

    console.log("  ✅ Phaser ready");

    console.log("  � Navigating to game...");

    // Try to navigate through scenes by simulating scene transitions
    try {
      await this.page.evaluate(() => {
        const phaserGame = window.CombatCrocs?.game;
        if (!phaserGame?.scene) {
          throw new Error("Phaser game instance not found");
        }

        // CRITICAL FIX: Explicitly stop old GameScene to prevent race conditions
        const oldGameScene = phaserGame.scene.getScene("GameScene");
        if (oldGameScene && oldGameScene.scene.isActive()) {
          console.log("[AI] Stopping old GameScene to clean up timers/callbacks");
          oldGameScene.scene.stop();
        }

        // Set AI ready flag to false - AI will manually trigger Turn 1 after injection
        window.__AI_READY__ = false;
        console.log("[AI] AI ready flag set to false - Turn 1 will be triggered manually");

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
            color: { name: "Blue", key: "blue", hex: 0x0066cc }, // FIXED: Integer not string!
            players: [{ characterType: "CROCODILE" }],
          },
          {
            id: 2,
            name: "Team 2",
            crocCount: 1,
            color: { name: "Red", key: "red", hex: 0xcc0000 }, // FIXED: Integer not string!
            players: [{ characterType: "CROCODILE" }],
          },
        ];

        // Store teams in game state (StateManager.storeTeams does this)
        window.CombatCrocs.gameState.game.teams = teams;
        window.CombatCrocs.gameState.game.selectedMap = window.__CURRENT_MAP_NAME__;

        // Use MapManager to properly set the current map
        if (window.MapManager && window.MapManager.setCurrentMap) {
          window.MapManager.setCurrentMap(window.__CURRENT_MAP_NAME__);
        }

        phaserGame.scene.start("PlayerSelectScene");
      });

      // Wait for PlayerSelectScene to be active (event-based)
      await this.page.waitForFunction(
        () => {
          const phaserGame = window.CombatCrocs?.game;
          const playerScene = phaserGame?.scene?.getScene("PlayerSelectScene");
          return playerScene?.scene?.isActive();
        },
        { timeout: 5000 },
      );

      // Now transition to GameScene
      await this.page.evaluate(() => {
        const phaserGame = window.CombatCrocs?.game;
        const playerScene = phaserGame?.scene?.getScene("PlayerSelectScene");

        if (playerScene && playerScene.scene.isActive()) {
          const teams = [
            {
              id: 1,
              name: "Team 1",
              crocCount: 1,
              color: { name: "Blue", key: "blue", hex: 0x0066cc }, // FIXED: Integer not string!
              players: [{ characterType: "CROCODILE" }],
            },
            {
              id: 2,
              name: "Team 2",
              crocCount: 1,
              color: { name: "Red", key: "red", hex: 0xcc0000 }, // FIXED: Integer not string!
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

      // Wait for game scene to be active and have players (event-based, no delay)
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

      // HEADED MODE ONLY: Wait for players to spawn and settle after falling
      if (!this.options.headless) {
        console.log("  ⏳ Waiting 2s for players to spawn and settle (headed mode)...");
        await this.delay(2000);
      }
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

    // CRITICAL: Re-inject look-ahead simulation for each game (context gets lost between games)
    await this.page.evaluate(getLookAheadSimulationInjection());
    console.log("  ✅ Look-ahead simulation re-injected");

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
            // CRITICAL FIX: Guard against execution during scene shutdown/transition
            if (!gameScene.scene.isActive() || gameScene.scene.isTransitioning) {
              console.log("[AI] Skipping turn - scene is shutting down or transitioning");
              return;
            }

            // CRITICAL FIX: Skip Turn 1 if AI not ready yet (hook is being set up)
            if (this.turnCount === 0 && window.__AI_READY__ === false) {
              console.log("[AI] Skipping automatic Turn 1 - AI will trigger manually");
              return;
            }

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

          // NOW set AI ready flag and manually trigger Turn 1
          window.__AI_READY__ = true;
          console.log("[AI] AI ready flag set to true - manually triggering Turn 1");
          gameScene.turnManager.startTurn();
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
    const maxTurns = 30; // Reasonable limit for training (prevent infinite loops)

    // Track initial health for damage calculation & initialize shot history and feedback
    const initialHealth = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      if (!scene) return null;

      // CRITICAL: Clear explosion data AND last decision from previous game
      window.__LAST_EXPLOSION__ = null;
      window.__AI_LAST_DECISION__ = {}; // Clear previous game's decisions
      console.log("[AI] Cleared explosion data and last decisions for new game");

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

      // FIXED: Initialize turn data storage
      window.__TURN_DATA__ = [];

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
      // CRITICAL FIX: Execute Turn 1 NOW (after initialHealth captured)
      console.log("  🎯 Executing Turn 1...");
      await this.executeAITurn();
      turnCount++; // Turn 1 counted

      while (this.gameInProgress && turnCount < maxTurns) {
        turnCount++;

        // Check if game has ended
        const gameEnded = await this.page.evaluate(() => {
          const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
          if (!scene) return false;

          // Check win condition - count teams with ALIVE players
          const teams = {};
          scene.players.forEach(p => {
            if (p.health > 0 && !p.inLastStand) {
              teams[p.team] = (teams[p.team] || 0) + 1;
            }
          });

          // Count teams that have at least one alive player (count > 0)
          const aliveTeams = Object.values(teams).filter(count => count > 0).length;
          return aliveTeams <= 1;
        });

        if (gameEnded) {
          console.log("  🏁 Game ended!");
          break;
        }

        // Execute AI turn
        await this.executeAITurn();

        // Brief delay between turns (removed in headless for max speed)
        const betweenTurnsDelay = this.options.headless ? 0 : 100;
        await this.delay(betweenTurnsDelay);
      }

      // Get final results AND turn data (with error handling for context destroyed)
      let result;
      try {
        result = await this.page.evaluate(() => {
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

          // FIXED: Return turn data!
          return {
            winner,
            teams,
            turns: scene.turnManager.turnCount,
            turnData: window.__TURN_DATA__ || [], // CRITICAL: Include turn-by-turn data
          };
        });
      } catch (error) {
        if (error.message.includes("Execution context") || error.message.includes("Target closed")) {
          console.log(
            "  ⚠️  Context destroyed during result extraction (game ended), returning minimal data",
          );
          // Return minimal valid data
          return {
            winner: null,
            stats: {
              winner: null,
              teams: {},
              turns: turnCount,
              turnData: [],
              initialHealth: stats.initialHealth,
            },
            error: "Context destroyed",
          };
        }
        throw error; // Re-throw if not a context error
      }

      stats.turns = result.turns;
      stats.endTime = Date.now();
      stats.duration = stats.endTime - stats.startTime;

      console.log(`  ✅ Game complete: Winner = Team ${result.winner || "Draw"} (${turnCount} turns)`);
      console.log(`  📊 Captured ${result.turnData.length} turns of input data`);

      // CRITICAL FIX: Aggregate Team 1 decision data for supervised learning
      const team1Turns = result.turnData.filter(t => t.team === 1 && t.decision?.networkAngle !== undefined);
      let aggregatedDecision = null;

      if (team1Turns.length > 0) {
        // Calculate average angular difference across all Team 1 turns
        let totalAngleDiff = 0;
        let totalNetworkAngle = 0;
        let totalAimAngle = 0;

        team1Turns.forEach(turn => {
          const networkAngle = turn.decision.networkAngle || 0;
          const aimAngle = turn.decision.aimAngle || 0;

          totalNetworkAngle += networkAngle;
          totalAimAngle += aimAngle;

          // Calculate angular difference for this turn
          let angleDiff = Math.abs(networkAngle - aimAngle);
          if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
          }
          totalAngleDiff += angleDiff;
        });

        aggregatedDecision = {
          networkAngle: totalNetworkAngle / team1Turns.length,
          aimAngle: totalAimAngle / team1Turns.length,
          avgAngleDiff: totalAngleDiff / team1Turns.length,
          turnsWithNetwork: team1Turns.length,
        };
      }

      // FIXED: Include initialHealth, turnData, AND aggregated decision
      return {
        winner: result.winner,
        stats: {
          ...result,
          initialHealth: stats.initialHealth, // CRITICAL: Add initial health for damage calculation
          turnData: result.turnData, // FIXED: Include turn-by-turn input data!
        },
        decision: aggregatedDecision, // CRITICAL: Add for supervised learning!
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
    // CRITICAL FIX: Wrap in try-catch to handle frame errors gracefully
    try {
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
    } catch (error) {
      if (error.message.includes("main frame") || error.message.includes("Target closed")) {
        console.log("  ⚠️ Frame error during turn execution, skipping turn");
        return;
      }
      throw error; // Re-throw if not a frame error
    }

    // Get game state and team info with ENHANCED data
    const { gameState, team } = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];

      // Use TerrainScanner for spatial awareness
      let terrainDistances = [1400, 1400, 1400, 1400, 1400, 1400, 1400, 1400];

      if (window.TerrainScanner && scene?.matter?.world?.localWorld?.bodies) {
        const bodies = scene.matter.world.localWorld.bodies;
        const terrainBodies = bodies.filter(b => b && b.isTerrain);

        if (terrainBodies.length > 0) {
          const terrainData = window.TerrainScanner.scanTerrainDistances(
            scene,
            currentPlayer.x,
            currentPlayer.y,
            1400,
          );
          terrainDistances = terrainData.directions;
        }
      }

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

      // FIXED: Use TerrainScanner distances as terrain array (not trajectory sampling!)
      const terrain = terrainDistances;

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
        explosionX: 0,
        explosionY: 0,
        explosionDistance: 1000,
      };

      // Get explosion coordinates from last explosion
      const lastExplosion = window.__LAST_EXPLOSION__;
      if (lastExplosion) {
        shotFeedback.explosionX = lastExplosion.x;
        shotFeedback.explosionY = lastExplosion.y;
        shotFeedback.explosionDistance = Math.sqrt(
          Math.pow(currentPlayer.x - lastExplosion.x, 2) + Math.pow(currentPlayer.y - lastExplosion.y, 2),
        );
      }

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

      // Retrieve last decision for this team
      const lastDecision = window.__AI_LAST_DECISION__?.[`team${currentPlayer.team}`] || {
        aimAngle: 0,
        weapon: "BAZOOKA",
      };

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
          x: enemy.x, // ADDED: Enemy position
          y: enemy.y, // ADDED: Enemy position
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
        lastDecision, // ADDED: What did I choose last turn?
      };

      return { gameState: state, team: currentPlayer.team };
    });

    // CRITICAL: On Turn 1, wait for ALL players to settle after spawn (physics-based)
    if (gameState.context.turnNumber === 1) {
      await this.page
        .waitForFunction(
          () => {
            const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
            if (!scene?.players) return false;

            // Check if all players have stable velocities (physics settled)
            return scene.players.every(p => {
              if (!p.body) return true;
              const velocity = Math.sqrt(p.body.velocity.x ** 2 + p.body.velocity.y ** 2);
              return velocity < 0.1; // Nearly stationary
            });
          },
          { timeout: 2000 },
        )
        .catch(() => {
          // Fallback if physics check times out
          console.log("  ⚠️  Physics settle timeout, proceeding anyway");
        });
    }

    // Use neural network decision if available, otherwise random
    const action = await this.makeAIDecision(gameState, team);

    // SUPERVISED LEARNING: Add chosen angle to gameState for next turn
    if (action && action.aimAngle !== undefined) {
      gameState.chosenAngle = action.aimAngle;
    }

    // FIXED: Store turn data BEFORE executing action
    await this.page.evaluate(
      (gs, act, tm) => {
        // Store this decision for next turn's feedback
        if (!window.__AI_LAST_DECISION__) {
          window.__AI_LAST_DECISION__ = {};
        }
        window.__AI_LAST_DECISION__[`team${tm}`] = {
          aimAngle: act.aimAngle,
          weapon: act.weapon,
        };

        // Store turn data
        if (window.__TURN_DATA__) {
          window.__TURN_DATA__.push({
            turnNumber: gs.context.turnNumber,
            team: gs.self.team,
            inputs: gs,
            decision: act,
          });
        }
      },
      gameState,
      action,
      team,
    );

    // PHYSICS VERIFICATION: If enabled, disable instant mode temporarily
    if (this.options.verifyPhysics && action._verificationData) {
      await this.page.evaluate(() => {
        window.__INSTANT_BAZOOKA__ = false;
        window.__LAST_EXPLOSION__ = null;
        console.log("\n🔬 [PHYSICS VERIFICATION] Real shot mode enabled");
      });
    }

    // DUAL-SHOT VERIFICATION: Only if debugPhysics is enabled
    let instantShotLanding = null;
    let instantShotStart = null;
    if (this.options.debugPhysics && team === 1) {
      // Check if player can actually shoot (has ammo and canShoot is true)
      const willShoot = await this.page.evaluate(() => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        const playerIndex = scene.turnManager.getCurrentPlayerIndex();
        const currentPlayer = scene.players[playerIndex];
        const weapon = scene.turnManager.getCurrentWeapon();
        return currentPlayer.canShoot && scene.turnManager.weaponAmmo[weapon] > 0;
      });

      if (willShoot) {
        const instantShotData = await this.page.evaluate(act => {
          const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
          const playerIndex = scene.turnManager.getCurrentPlayerIndex();
          const currentPlayer = scene.players[playerIndex];

          // Capture INITIAL position BEFORE any movement
          const startPos = { x: Math.round(currentPlayer.x), y: Math.round(currentPlayer.y) };

          // Apply movement BEFORE firing instant shot (to match real shot position)
          if (act.movement && act.movement !== "none") {
            const moveDistance = 100;
            if (act.movement === "left") {
              currentPlayer.x = Math.max(50, currentPlayer.x - moveDistance);
            } else if (act.movement === "right") {
              const gameWidth = scene.game.config.width;
              currentPlayer.x = Math.min(gameWidth - 50, currentPlayer.x + moveDistance);
            }
            if (currentPlayer.body) {
              scene.matter.body.setPosition(currentPlayer.body, { x: currentPlayer.x, y: currentPlayer.y });
            }
            console.log(`[DUAL-SHOT] Applied movement ${act.movement} before instant shot`);
          }

          // Calculate target position from MOVED position
          const targetX = currentPlayer.x + Math.cos(act.aimAngle) * 500;
          const targetY = currentPlayer.y + Math.sin(act.aimAngle) * 500;

          // FIRE instant shot with noDamage=true
          const landing = window.InstantShotResolver.resolveBazookaShot(
            scene,
            currentPlayer,
            targetX,
            targetY,
            true, // noDamage - verification shot only
          );

          console.log(
            `[DUAL-SHOT] Instant shot: START (${startPos.x}, ${startPos.y}) → LAND (${Math.round(
              landing.x,
            )}, ${Math.round(landing.y)})`,
          );

          return {
            start: startPos,
            landing: { x: Math.round(landing.x), y: Math.round(landing.y) },
          };
        }, action);

        instantShotStart = instantShotData.start;
        instantShotLanding = instantShotData.landing;

        // Wait a moment for instant explosion to finish
        await this.delay(100);
      }
    }

    // Capture starting position for real shot (BEFORE execution)
    const realShotStart = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];
      return { x: Math.round(currentPlayer.x), y: Math.round(currentPlayer.y) };
    });

    // CRITICAL: Check ammo at execution time (right before firing)
    const canShoot = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];
      const weapon = scene.turnManager.getCurrentWeapon();

      return currentPlayer.canShoot && scene.turnManager.weaponAmmo?.[weapon] > 0;
    });

    if (!canShoot) {
      console.log("  ⚠️  Cannot shoot at execution time, skipping turn");
      // Clear turn data and trigger next turn
      await this.page.evaluate(() => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        window.__AI_TURN_DATA__ = null;
        if (scene?.turnManager) {
          scene.turnManager.startTurn();
        }
      });
      return;
    }

    // Execute the action in the game
    await this.page.evaluate(action => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];
      const weapon = scene.turnManager.getCurrentWeapon();

      console.log("[AI] Executing action:", action);

      // MOVEMENT: Move player before shooting (if needed)
      if (action.movement && action.movement !== "none") {
        const moveDistance = 100;
        const oldX = currentPlayer.x;

        if (action.movement === "left") {
          currentPlayer.x = Math.max(50, currentPlayer.x - moveDistance);
        } else if (action.movement === "right") {
          const gameWidth = scene.game.config.width;
          currentPlayer.x = Math.min(gameWidth - 50, currentPlayer.x + moveDistance);
        }

        // Update physics body position to match
        if (currentPlayer.body) {
          scene.matter.body.setPosition(currentPlayer.body, { x: currentPlayer.x, y: currentPlayer.y });
        }

        console.log(`[AI] Moved player ${action.movement}: ${oldX} → ${currentPlayer.x}`);
      }

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

    // Capture enemy state BEFORE shot for comparison
    const preShot = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];
      const enemies = scene.players.filter(p => p.team !== currentPlayer.team && p.health > 0);

      return {
        enemies: enemies.map(e => ({
          id: e.id,
          team: e.team,
          x: e.x,
          y: e.y,
          health: e.health,
        })),
      };
    });

    // Get explosion coordinates immediately (synchronous)
    const explosionData = await this.page.evaluate(() => {
      return { explosion: window.__LAST_EXPLOSION__ };
    });

    // Wait for turn to complete (damage processing happens during turn end)
    // In instant mode, turn ends almost immediately
    // In real mode, projectile needs time to land
    const turnEndDelay = this.options.instantShot ? 0 : 500;
    if (turnEndDelay > 0) {
      await this.delay(turnEndDelay);
    }

    // Capture post-shot state AFTER turn manager has processed everything
    const postShot = await this.page.evaluate(() => {
      const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
      const playerIndex = scene.turnManager.getCurrentPlayerIndex();
      const currentPlayer = scene.players[playerIndex];
      const enemies = scene.players.filter(p => p.team !== currentPlayer.team);

      return {
        explosion: window.__LAST_EXPLOSION__,
        enemies: enemies.map(e => ({
          id: e.id,
          team: e.team,
          x: e.x,
          y: e.y,
          health: e.health,
        })),
      };
    });

    // Enhanced logging with enemy positions and damage
    if (postShot.explosion) {
      const ex = postShot.explosion;
      console.log(`  💥 Explosion at (${Math.round(ex.x)}, ${Math.round(ex.y)})`);

      // PHYSICS VERIFICATION: Compare predicted vs actual landing (Team 1 only, debugPhysics mode only)
      if (this.options.debugPhysics && team === 1) {
        console.log(`\n  🔬 [PHYSICS CHECK]`);

        // Show look-ahead prediction (from decision time)
        if (action.predictedLanding) {
          const pred = action.predictedLanding;
          const deltaX = Math.abs(ex.x - pred.x);
          const deltaY = Math.abs(ex.y - pred.y);
          const lookaheadError = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          console.log(`     Look-ahead prediction: (${pred.x}, ${pred.y})`);
          console.log(`     Actual landing:        (${Math.round(ex.x)}, ${Math.round(ex.y)})`);
          console.log(`     Look-ahead error:      ${Math.round(lookaheadError)}px`);
          console.log(
            `     (withinRadius=${pred.withinRadius}, clearLOS=${pred.clearLOS}, canDamage=${pred.canDamage})`,
          );
        }

        // Show instant shot vs real shot with START → LAND format
        if (instantShotLanding && instantShotStart && realShotStart) {
          const deltaX = Math.abs(ex.x - instantShotLanding.x);
          const deltaY = Math.abs(ex.y - instantShotLanding.y);
          const instantError = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          console.log(
            `\n     Instant shot: START (${instantShotStart.x}, ${instantShotStart.y}) → LAND (${instantShotLanding.x}, ${instantShotLanding.y})`,
          );
          console.log(
            `     Real shot:    START (${realShotStart.x}, ${realShotStart.y}) → LAND (${Math.round(
              ex.x,
            )}, ${Math.round(ex.y)})`,
          );
          console.log(`     Discrepancy:  ${Math.round(instantError)}px`);

          if (instantError > 50) {
            console.log(`     ⚠️  WARNING: InstantShotResolver does NOT match real physics!`);
          } else if (instantError > 10) {
            console.log(`     ⚠️  Minor discrepancy between instant and real`);
          } else {
            console.log(`     ✅ Instant shot matches real shot`);
          }
        }
      }

      // Log each enemy's position (distance only, health tracking is handled by fitness calculator)
      preShot.enemies.forEach((preShotEnemy, idx) => {
        const distance = Math.sqrt(Math.pow(ex.x - preShotEnemy.x, 2) + Math.pow(ex.y - preShotEnemy.y, 2));
        console.log(
          `  🎯 Enemy (Team ${preShotEnemy.team}) at (${Math.round(preShotEnemy.x)}, ${Math.round(
            preShotEnemy.y,
          )}) - Distance: ${Math.round(distance)}px`,
        );
      });
    }
  }

  async makeAIDecision(gameState, team) {
    // TEAM 2 = DUMB OPPONENT (pure random, no simulation, no network)
    if (team === 2) {
      const randomDecision = this.makeRandomDecision(gameState);
      console.log(
        `  🎲 Team 2 random decision: angle ${randomDecision.aimAngle.toFixed(2)} rad (${(
          (randomDecision.aimAngle * 180) /
          Math.PI
        ).toFixed(0)}°)`,
      );
      return randomDecision;
    }

    // TEAM 1 = SMART AI with MOVEMENT LOOK-AHEAD
    // Use movement look-ahead to find optimal shooting position
    const movementResult = await findBestShootingPosition(this.page, gameState);

    // Movement look-ahead has already moved the player to the optimal position
    // and determined the best shot from that position
    // Just return the shot decision with movement metadata

    if (movementResult.totalDistance > 0) {
      console.log(
        `  🎯 Moved ${movementResult.totalDistance}px to find optimal shot (angle: ${(
          (movementResult.shotDecision.aimAngle * 180) /
          Math.PI
        ).toFixed(0)}°)`,
      );
    } else {
      console.log(
        `  🎯 Shooting from current position (angle: ${(
          (movementResult.shotDecision.aimAngle * 180) /
          Math.PI
        ).toFixed(0)}°)`,
      );
    }

    // Add movement metadata to shot decision
    movementResult.shotDecision.movement = "none"; // Already moved, no more movement needed
    movementResult.shotDecision.movedDistance = movementResult.totalDistance;
    movementResult.shotDecision.finalPosition = movementResult.finalPosition;

    return movementResult.shotDecision;
  }

  makeRandomDecision(gameState) {
    // Fallback: Random decision when no network available
    // FIXED: Use full 360° range (not just forward hemisphere)
    const randomAngle = Math.random() * 2 * Math.PI;
    console.log(
      `  🎲 Generated pure random angle: ${randomAngle.toFixed(2)} rad (${(
        (randomAngle * 180) /
        Math.PI
      ).toFixed(0)}°)`,
    );

    return {
      weapon: "BAZOOKA",
      aimAngle: randomAngle, // 0 to 2π (full circle)
      targetIndex: 0,
      power: 1.0,
      movement: "none",
      _pureRandom: true, // Flag to bypass any processing
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
