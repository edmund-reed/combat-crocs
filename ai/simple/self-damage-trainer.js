// Self-Damage Avoidance Trainer
// FOCUSED goal: Teach AI to avoid damaging itself (no enemy targeting concerns)
// Simplified 20 inputs: position + feedback + terrain (NO enemy data)

import neataptic from "neataptic";
const { Neat } = neataptic;
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import fs from "fs";
import path from "path";

// =============================================================================
// SIMPLIFIED ENCODING - 20 inputs (removed enemy data for clarity)
// =============================================================================

function encodeSelfDamageGameState(gameState) {
  const inputs = [];

  // === BLAST RADIUS (1) ===
  inputs.push(140); // Bazooka blast radius - key safety threshold

  // === SELF POSITION & HEALTH (3) ===
  inputs.push(gameState.self.x);
  inputs.push(gameState.self.y);
  inputs.push(gameState.self.health / gameState.self.maxHealth);

  // === SELF-DAMAGE FEEDBACK (2) === Only self-damage, not enemy damage
  const feedback = gameState.shotFeedback || {};
  inputs.push(feedback.didDamageSelf ? 1 : 0);
  inputs.push(feedback.damageTaken || 0);

  // === LAST EXPLOSION POSITION (3) === Where did the explosion happen?
  inputs.push(feedback.explosionX || 0);
  inputs.push(feedback.explosionY || 0);

  const explosionDist = feedback.explosionX
    ? Math.sqrt(
        Math.pow(gameState.self.x - feedback.explosionX, 2) +
          Math.pow(gameState.self.y - feedback.explosionY, 2),
      )
    : 1000;
  inputs.push(explosionDist);

  // === TERRAIN DISTANCES (8 directions) === Critical for spatial awareness
  const terrainDists = gameState.terrainDistances || [500, 500, 500, 500, 500, 500, 500, 500];
  inputs.push(...terrainDists);

  // === SAFETY METRICS (3) ===
  const minTerrain = Math.min(...terrainDists);
  inputs.push(minTerrain); // Minimum terrain distance
  inputs.push(terrainDists[0]); // Distance RIGHT (most common direction)
  inputs.push(minTerrain - 140); // Safety margin (negative = DANGER!)

  // Total: 20 inputs (27 → 20, removed 5 enemy inputs + 2 enemy feedback)
  return inputs;
}

// =============================================================================
// LABELED INPUT STRUCTURE - For JSON logging
// =============================================================================

function getInputLabels() {
  return [
    "blastRadius",
    "selfX",
    "selfY",
    "selfHealthPercent",
    "didDamageSelf",
    "damageTaken",
    "lastExplosionX",
    "lastExplosionY",
    "explosionDistance",
    "terrainRight",
    "terrainUpRight",
    "terrainUp",
    "terrainUpLeft",
    "terrainLeft",
    "terrainDownLeft",
    "terrainDown",
    "terrainDownRight",
    "minTerrain",
    "rightTerrain",
    "safetyMargin",
  ];
}

function createLabeledInputObject(gameState, inputArray) {
  const labels = getInputLabels();
  const labeled = {};

  labels.forEach((label, index) => {
    labeled[label] = inputArray[index];
  });

  // Add human-readable sections
  return {
    blastRadius: labeled.blastRadius,
    self: {
      x: labeled.selfX,
      y: labeled.selfY,
      healthPercent: labeled.selfHealthPercent,
    },
    feedback: {
      didDamageSelf: labeled.didDamageSelf === 1,
      damageTaken: labeled.damageTaken,
    },
    lastExplosion: {
      x: labeled.lastExplosionX,
      y: labeled.lastExplosionY,
      distanceFromSelf: labeled.explosionDistance,
    },
    terrain: {
      directions: [
        labeled.terrainRight,
        labeled.terrainUpRight,
        labeled.terrainUp,
        labeled.terrainUpLeft,
        labeled.terrainLeft,
        labeled.terrainDownLeft,
        labeled.terrainDown,
        labeled.terrainDownRight,
      ],
      directionNames: ["right", "upRight", "up", "upLeft", "left", "downLeft", "down", "downRight"],
      minDistance: labeled.minTerrain,
      rightDistance: labeled.rightTerrain,
      safetyMargin: labeled.safetyMargin,
    },
    rawInputArray: inputArray,
  };
}

function decodeNetworkOutput(outputs) {
  // FIXED: Full 360° range (was only 0-180°)
  const aimAngle = outputs[0] * 2 * Math.PI;

  return {
    weapon: "BAZOOKA",
    aimAngle: aimAngle,
    aimAngleDegrees: (aimAngle * 180) / Math.PI,
    targetIndex: 0,
    power: 1.0,
    movement: "none",
  };
}

// =============================================================================
// ENHANCED FITNESS - PURE SELF-DAMAGE AVOIDANCE
// =============================================================================

function calculateFitness(gameStats) {
  let fitness = 100; // Base survival

  // Self damage (PRIMARY goal - heavy penalty!)
  const myStartHealth = gameStats.initialHealth?.team1?.totalHealth || 100;
  const myEndHealth = gameStats.teams?.[1]?.totalHealth !== undefined ? gameStats.teams[1].totalHealth : 100;
  const selfDamage = Math.max(0, myStartHealth - myEndHealth);
  fitness -= selfDamage * 15; // FIXED: Reduced from 20 to 15

  // Win bonus (secondary - much smaller now)
  if (gameStats.winner === 1) fitness += 50; // FIXED: Reduced from 200 to 50

  return fitness;
}

// =============================================================================
// DUMB BASELINE OPPONENT - Shoots randomly
// =============================================================================

function createDumbOpponent() {
  const { Network } = neataptic;

  // Create a tiny 1-layer network that outputs random angles
  const dumbNetwork = new Network(20, 1);

  // Randomize its weights slightly so it shoots in random directions
  dumbNetwork.nodes.forEach(node => {
    if (node.type === "output") {
      node.bias = Math.random() - 0.5;
    }
  });

  return dumbNetwork;
}

// =============================================================================
// JSON INPUT LOGGING
// =============================================================================

const inputLogs = []; // Store logs in memory during game
let currentGameLog = null;

function startGameLog(network, generation, map, gameNum) {
  currentGameLog = {
    gameId: `game-${Date.now()}-${gameNum}`,
    network: network,
    generation: generation,
    map: map,
    turns: [],
  };
}

function logTurnInputs(turnNumber, gameState, inputArray, decision) {
  if (!currentGameLog) return;

  const labeledInputs = createLabeledInputObject(gameState, inputArray);

  currentGameLog.turns.push({
    turnNumber,
    inputs: labeledInputs,
    decision: decision,
  });
}

function endGameLog(fitness, selfDamage) {
  if (!currentGameLog) return;

  currentGameLog.result = {
    selfDamage,
    fitness,
  };

  inputLogs.push(currentGameLog);
  currentGameLog = null;
}

async function saveInputLogs() {
  if (inputLogs.length === 0) return;

  const logDir = path.join(process.cwd(), "../../ai/data/input-logs");
  await fs.promises.mkdir(logDir, { recursive: true });

  // FIXED: Only save first 10 logs (respect --log-limit)
  const logsToSave = inputLogs.slice(0, Math.min(10, config.logLimit));

  for (const log of logsToSave) {
    const filename = `${log.gameId}.json`;
    const filepath = path.join(logDir, filename);
    await fs.promises.writeFile(filepath, JSON.stringify(log, null, 2));
  }

  console.log(`\n💾 Saved ${logsToSave.length} input log files to: ai/data/input-logs/`);
  inputLogs.length = 0; // Clear logs
}

// =============================================================================
// CHECKPOINT SYSTEM
// =============================================================================

async function saveCheckpoint(neat, generation, stats) {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");
  await fs.promises.mkdir(checkpointDir, { recursive: true });

  const checkpoint = {
    generation: generation,
    timestamp: new Date().toISOString(),
    bestNetwork: neat.population[0].toJSON(),
    stats: {
      bestFitness: stats.bestFitness,
      avgFitness: stats.avgFitness,
      avgSelfDamage: stats.avgSelfDamage,
      bestSelfDamage: stats.bestSelfDamage,
    },
    config: {
      populationSize: config.populationSize,
      mutationRate: config.mutationRate,
      networkArchitecture: config.networkConfig.hidden,
    },
  };

  const filename = `self-damage-checkpoint-gen${String(generation).padStart(2, "0")}.json`;
  const filepath = path.join(checkpointDir, filename);
  await fs.promises.writeFile(filepath, JSON.stringify(checkpoint, null, 2));

  console.log(`  💾 Checkpoint saved: ${filename}`);
}

async function cleanupOldCheckpoints(currentGen) {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");

  try {
    const files = await fs.promises.readdir(checkpointDir);
    const checkpointFiles = files
      .filter(f => f.startsWith("self-damage-checkpoint-gen") && f.endsWith(".json"))
      .map(f => {
        const match = f.match(/gen(\d+)\.json$/);
        return { filename: f, generation: match ? parseInt(match[1]) : 0 };
      })
      .sort((a, b) => b.generation - a.generation); // Sort descending

    // Keep only last 5 checkpoints
    const toDelete = checkpointFiles.slice(5);

    for (const file of toDelete) {
      const filepath = path.join(checkpointDir, file.filename);
      await fs.promises.unlink(filepath);
      console.log(`  🗑️  Deleted old checkpoint: ${file.filename}`);
    }
  } catch (error) {
    // Directory doesn't exist or other error - ignore
  }
}

// =============================================================================
// CLI CONFIGURATION
// =============================================================================

const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};
const hasFlag = flag => args.includes(flag);

const config = {
  populationSize: parseInt(getArg("--pop", "20")),
  generations: parseInt(getArg("--gen", "10")),
  mutationRate: parseFloat(getArg("--mutation", "0.2")),
  gamesPerEvaluation: parseInt(getArg("--games", "8")),
  elitism: parseInt(getArg("--elitism", "4")),
  headless: !hasFlag("--headed"),
  testMode: hasFlag("--test"),
  parallelTabs: parseInt(getArg("--tabs", "1")),
  logInputs: !hasFlag("--no-log"), // CHANGED: Default true, use --no-log to disable
  logLimit: parseInt(getArg("--log-limit", "1")), // CHANGED: Default to 1 log file
  debugInputs: hasFlag("--debug"),

  maps: ["hotelOfHorror", "heavyMetalCoaster", "dinocoaster", "magnificentBulk"],

  networkConfig: {
    inputs: 20, // Simplified from 27!
    outputs: 1,
    hidden: [16, 12, 8], // Increased capacity for spatial reasoning
  },
};

// Debug counters
let debugTurnCount = 0;
let debugGameCount = 0;

if (config.testMode) {
  config.populationSize = 1;
  config.generations = 1;
  config.gamesPerEvaluation = 3;
  config.headless = false;
  config.logInputs = true; // Always log in test mode
  console.log("\n🧪 TEST MODE");
  console.log("  - 1 network, 1 gen, 3 games");
  console.log("  - Input logging enabled\n");
}

// =============================================================================
// HELPER: Play game with optional logging
// =============================================================================

async function playSingleGame(runner, network, opponent, map, gameNum, totalGames, netNum, generation) {
  console.log(`\n🎲 Game ${gameNum}/${totalGames}: Net ${netNum}, ${map}`);

  const shouldLog = config.logInputs && inputLogs.length < config.logLimit;
  if (shouldLog) {
    startGameLog(netNum, generation, map, gameNum);
  }

  // Debug mode: Log first game's inputs to console
  if (config.debugInputs && generation === 1 && gameNum <= 3) {
    debugGameCount = gameNum;
    debugTurnCount = 0;
    await runner.page.evaluate(() => {
      window.__DEBUG_INPUTS__ = true;
      window.__DEBUG_TURN_COUNT__ = 0;
    });
  }

  const result = await runner.startNewGame(network, opponent, { mode: "1v1", map: map });

  if (result.error) {
    console.log(`  ⚠️  Error: ${result.error}`);
    return { fitness: -1000, selfDamage: 100, error: true };
  }

  const fitness = calculateFitness(result.stats);

  const myStartHealth = result.stats.initialHealth?.team1?.totalHealth || 100;
  const myEndHealth =
    result.stats.teams?.[1]?.totalHealth !== undefined ? result.stats.teams[1].totalHealth : 100;
  const selfDamage = Math.max(0, myStartHealth - myEndHealth);

  // FIXED: Log game data with turn-by-turn inputs if available!
  if (shouldLog) {
    const gameLog = {
      gameId: `game-${Date.now()}-${gameNum}`,
      network: netNum,
      generation: generation,
      map: map,
      result: {
        winner: result.stats.winner,
        selfDamage: selfDamage,
        fitness: fitness,
        initialHealth: myStartHealth,
        finalHealth: myEndHealth,
        turns: result.stats.turns || 0,
      },
      turns: result.stats.turnData || [], // FIXED: Include turn-by-turn data!
    };
    inputLogs.push(gameLog);
  }

  return { fitness, selfDamage, error: false };
}

// =============================================================================
// MODEL PERSISTENCE
// =============================================================================

async function loadBestModel() {
  const modelPath = path.join(process.cwd(), "../../ai/models/self-damage-avoidance.json");
  try {
    const modelData = await fs.promises.readFile(modelPath, "utf-8");
    return JSON.parse(modelData);
  } catch (error) {
    return null; // No existing model
  }
}

// =============================================================================
// MAIN TRAINING
// =============================================================================

async function trainSelfDamageAvoidance() {
  console.log("\n🎯 SELF-DAMAGE AVOIDANCE TRAINER");
  console.log("=".repeat(60));
  console.log("FOCUSED Goal: Teach AI to avoid damaging itself");
  console.log(`\n📊 Configuration:`);
  console.log(`  - Population: ${config.populationSize}`);
  console.log(`  - Generations: ${config.generations}`);
  console.log(`  - Games per network: ${config.gamesPerEvaluation}`);
  console.log(`  - Parallel tabs: ${config.parallelTabs}`);
  console.log(`  - Inputs: ${config.networkConfig.inputs} (SIMPLIFIED - no enemy data)`);
  console.log(`  - Architecture: ${config.networkConfig.inputs} → [16,12,8] → 1`);
  console.log(`  - Input logging: ${config.logInputs ? "YES" : "NO"} (limit: ${config.logLimit})`);

  const speedupFactor = 6 * config.parallelTabs;
  console.log(`\n⚡ Expected speedup: ~${speedupFactor}x`);
  console.log(`⏱️  Est. time: ~${Math.round(180 / speedupFactor)} min for 10 gen`);

  // FIXED: Load previous best model if exists
  const existingModel = await loadBestModel();
  if (existingModel) {
    console.log(`\n📂 Loading previous best model...`);
    console.log(`  ✅ Found existing model - will seed population`);
  } else {
    console.log(`\n🆕 Starting from scratch - no existing model found`);
  }

  const startTime = Date.now();

  const neat = new Neat(config.networkConfig.inputs, config.networkConfig.outputs, null, {
    popsize: config.populationSize,
    mutationRate: config.mutationRate,
    elitism: config.elitism,
  });

  // FIXED: Seed first network with previous best if available
  if (existingModel) {
    try {
      const { Network } = neataptic;
      neat.population[0] = Network.fromJSON(existingModel);
      console.log(`  ✅ Seeded Network #1 with previous best model\n`);
    } catch (error) {
      console.log(`  ⚠️  Could not load model: ${error.message}\n`);
    }
  }

  console.log(`🔧 Initializing ${config.parallelTabs} browser tabs...`);
  const tabPool = [];

  for (let i = 0; i < config.parallelTabs; i++) {
    const runner = new PuppeteerGameRunner({
      headless: config.headless,
      devServerUrl: "http://localhost:3001",
    });

    await runner.initialize();
    await runner.loadGame();
    await runner.setGameSpeed(2.0);

    await runner.page.evaluate(
      (encodeFn, decodeFn, logFn) => {
        window.__CUSTOM_ENCODE__ = new Function("gameState", encodeFn);
        window.__CUSTOM_DECODE__ = new Function("outputs", decodeFn);

        // Enable turn-by-turn logging if requested
        if (window.__LOG_INPUTS__) {
          window.__LOG_TURN__ = new Function("turnNum", "gameState", "inputs", "decision", logFn);
        }
      },
      encodeSelfDamageGameState.toString().replace(/^function[^{]*{|}$/g, ""),
      decodeNetworkOutput.toString().replace(/^function[^{]*{|}$/g, ""),
      config.logInputs ? logTurnInputs.toString().replace(/^function[^{]*{|}$/g, "") : "return;",
    );

    tabPool.push(runner);
    console.log(`  ✅ Tab ${i + 1}/${config.parallelTabs} ready`);
  }

  // CRITICAL: Create dumb opponent ONCE for all games
  const dumbOpponent = createDumbOpponent();
  console.log("🤖 Created static dumb opponent for consistent training environment\n");

  const generationStats = [];
  const totalGames = config.populationSize * config.gamesPerEvaluation * config.generations;
  let currentGameNumber = 0;

  for (let gen = 1; gen <= config.generations; gen++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📈 Generation ${gen}/${config.generations}`);
    console.log(`${"=".repeat(60)}`);

    for (let i = 0; i < neat.population.length; i++) {
      const network = neat.population[i];

      const gameTasks = [];
      for (let game = 0; game < config.gamesPerEvaluation; game++) {
        const mapIndex = game % config.maps.length;
        const map = config.maps[mapIndex];
        const tabIndex = game % config.parallelTabs;
        const runner = tabPool[tabIndex];

        gameTasks.push({
          runner,
          network,
          map,
          gameNum: ++currentGameNumber,
          totalGames,
          netNum: i + 1,
          generation: gen,
        });
      }

      const results = [];
      for (let batchStart = 0; batchStart < gameTasks.length; batchStart += config.parallelTabs) {
        const batch = gameTasks.slice(batchStart, batchStart + config.parallelTabs);
        const batchResults = await Promise.all(
          batch.map(task =>
            playSingleGame(
              task.runner,
              task.network,
              dumbOpponent, // FIXED: Pass static opponent!
              task.map,
              task.gameNum,
              task.totalGames,
              task.netNum,
              task.generation,
            ),
          ),
        );
        results.push(...batchResults);
      }

      const validResults = results.filter(r => !r.error);
      const totalFitness = validResults.reduce((sum, r) => sum + r.fitness, 0);
      const totalSelfDamage = validResults.reduce((sum, r) => sum + r.selfDamage, 0);
      const gamesPlayed = validResults.length;

      network.score = gamesPlayed > 0 ? totalFitness / gamesPlayed : -1000;
      network.avgSelfDamage = gamesPlayed > 0 ? totalSelfDamage / gamesPlayed : 100;

      if ((i + 1) % 5 === 0 || i === neat.population.length - 1) {
        console.log(
          `  Net ${String(i + 1).padStart(2)}: Fit ${String(Math.round(network.score)).padStart(4)} | ` +
            `Self-dmg ${network.avgSelfDamage.toFixed(1)} HP`,
        );
      }
    }

    neat.sort();

    const bestFitness = neat.population[0].score;
    const avgFitness = neat.population.reduce((sum, n) => sum + n.score, 0) / neat.population.length;
    const avgSelfDamage =
      neat.population.reduce((sum, n) => sum + n.avgSelfDamage, 0) / neat.population.length;
    const bestSelfDamage = neat.population[0].avgSelfDamage;

    generationStats.push({ generation: gen, bestFitness, avgFitness, avgSelfDamage, bestSelfDamage });

    console.log(`\n📊 Gen ${gen} Summary:`);
    console.log(`  Best Fitness: ${Math.round(bestFitness)} | Avg: ${Math.round(avgFitness)}`);
    console.log(`  Avg Self-Damage: ${avgSelfDamage.toFixed(1)} HP per game`);
    console.log(`  Best Self-Damage: ${bestSelfDamage.toFixed(1)} HP per game`);

    if (gen > 1) {
      const prevAvgDamage = generationStats[gen - 2].avgSelfDamage;
      const improvement = prevAvgDamage - avgSelfDamage;
      if (improvement > 0) {
        console.log(`  ✅ Improvement: reduced by ${improvement.toFixed(1)} HP`);
      } else {
        console.log(`  ⚠️  Regression: increased by ${Math.abs(improvement).toFixed(1)} HP`);
      }
    }

    // Save checkpoint every 5 generations
    if (gen % 5 === 0) {
      await saveCheckpoint(neat, gen, generationStats[gen - 1]);
      await cleanupOldCheckpoints(gen);
    }

    if (gen < config.generations) {
      neat.evolve();
    }
  }

  // Save input logs if enabled
  if (config.logInputs) {
    await saveInputLogs();
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Training complete in ${duration} minutes!`);
  console.log(`${"=".repeat(60)}`);

  console.log(`\n📉 Self-Damage Learning Curve:`);
  generationStats.forEach(stat => {
    const change =
      stat.generation > 1 ? generationStats[stat.generation - 2].avgSelfDamage - stat.avgSelfDamage : 0;
    const arrow = change > 0 ? "↓" : change < 0 ? "↑" : "→";
    console.log(`  Gen ${String(stat.generation).padStart(2)}: ${stat.avgSelfDamage.toFixed(1)} HP ${arrow}`);
  });

  const firstGenDamage = generationStats[0].avgSelfDamage;
  const lastGenDamage = generationStats[generationStats.length - 1].avgSelfDamage;
  const totalImprovement = firstGenDamage - lastGenDamage;

  console.log(`\n🎯 Final Result:`);
  if (totalImprovement > 10) {
    console.log(`  ✅ SUCCESS! Reduced self-damage by ${totalImprovement.toFixed(1)} HP`);
    console.log(`  The network learned to avoid itself!`);
  } else if (totalImprovement > 5) {
    console.log(`  🤔 Moderate: ${totalImprovement.toFixed(1)} HP reduction`);
  } else {
    console.log(`  ⚠️  Minimal learning: ${totalImprovement.toFixed(1)} HP change`);
  }

  const bestNetwork = neat.population[0];
  const modelPath = path.join(process.cwd(), "../../ai/models/self-damage-avoidance.json");
  await fs.promises.mkdir(path.dirname(modelPath), { recursive: true });
  await fs.promises.writeFile(modelPath, JSON.stringify(bestNetwork.toJSON(), null, 2));
  console.log(`\n💾 Best network saved to: ai/models/self-damage-avoidance.json`);

  console.log(`\n🔒 Closing ${tabPool.length} browser tabs...`);
  for (const runner of tabPool) {
    await runner.close();
  }
  console.log("🔒 Closing browser...");
}

trainSelfDamageAvoidance().catch(console.error);
