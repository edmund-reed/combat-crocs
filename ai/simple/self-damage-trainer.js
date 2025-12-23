// Self-Damage Avoidance Trainer
// FOCUSED goal: Teach AI to avoid damaging itself (no enemy targeting concerns)
// Simplified 20 inputs: position + feedback + terrain (NO enemy data)

import neataptic from "neataptic";
const { Neat } = neataptic;
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import fs from "fs";
import path from "path";
import { analyzeNetwork, generateAnalysisSummary, compareGenerations } from "./network-analyzer.js";

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

  // === SELF-DAMAGE FEEDBACK (3) === Only self-damage, not enemy damage
  const feedback = gameState.shotFeedback || {};
  inputs.push(feedback.didDamageSelf ? 1 : 0);
  inputs.push(feedback.damageTaken || 0);

  // === LAST EXPLOSION DISTANCE (1) === How far was I from my last explosion?
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

  // === MIN TERRAIN (1) === Closest wall distance
  const minTerrain = Math.min(...terrainDists);
  inputs.push(minTerrain);

  // CLI LOGGING: Show AI's turn 2 inputs (raw 16-value array)
  if (typeof console !== "undefined" && gameState.context?.turnNumber === 3 && gameState.self.team === 1) {
    console.log("\n📊 [AI TURN 2 INPUTS] Raw 16-value array:");
    console.log(
      `  [${inputs.map((v, i) => `${v.toFixed(1)}${i < inputs.length - 1 ? ", " : ""}`).join("")}]`,
    );
    console.log("\n  Breakdown:");
    console.log(`    blastRadius: ${inputs[0]}`);
    console.log(`    position: (${inputs[1].toFixed(0)}, ${inputs[2].toFixed(0)})`);
    console.log(`    healthPercent: ${inputs[3].toFixed(2)}`);
    console.log(`    selfDamageFeedback: (${inputs[4]}, ${inputs[5]})`);
    console.log(`    explosionDist: ${inputs[6].toFixed(0)}`);
    console.log(
      `    terrain: [${inputs
        .slice(7, 15)
        .map(v => v.toFixed(0))
        .join(", ")}]`,
    );
    console.log(`    minTerrain: ${inputs[15].toFixed(0)}\n`);
  }

  // Total: 16 inputs (simplified - removed redundant metrics)
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

function decodeNetworkOutput(outputs, gameState) {
  // HYBRID: Network base angle + random exploration
  const baseAngle = outputs[0] * 2 * Math.PI;

  // CLI LOGGING: Show we're simulating
  if (typeof console !== "undefined" && gameState.context?.turnNumber === 3) {
    console.log("\n🎯 [LOOK-AHEAD] Simulating 5 candidate shots...");
  }

  // Generate 5 candidate angles: 1 network + 4 random
  const candidateAngles = [
    { angle: baseAngle, source: "network" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
  ];

  // Simulate each candidate and track details
  let bestAngle = baseAngle;
  let maxDistance = 0;
  const candidateDetails = [];

  const playerPos = { x: gameState.self.x, y: gameState.self.y };

  for (const candidate of candidateAngles) {
    // Simulate shot landing position (simplified physics)
    const velocity = 15; // Bazooka velocity
    const gravity = 0.981; // Phaser gravity scaled
    const time = 1.5; // Approximate flight time

    const landingX = playerPos.x + Math.cos(candidate.angle) * velocity * time * 60;
    const landingY =
      playerPos.y + Math.sin(candidate.angle) * velocity * time * 60 + 0.5 * gravity * time * time * 60 * 60;

    // Calculate distance from player to landing
    const dx = landingX - playerPos.x;
    const dy = landingY - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Track this candidate's details
    candidateDetails.push({
      angle: candidate.angle,
      angleDegrees: (candidate.angle * 180) / Math.PI,
      source: candidate.source,
      landingX: Math.round(landingX),
      landingY: Math.round(landingY),
      distanceFromPlayer: Math.round(distance),
      selected: false, // Will update after finding best
    });

    // CLI LOGGING: Show each candidate
    if (typeof console !== "undefined" && gameState.context?.turnNumber === 3) {
      console.log(
        `  ${candidate.source === "network" ? "🧠" : "🎲"} ${candidate.source.padEnd(7)}: ` +
          `angle=${((candidate.angle * 180) / Math.PI).toFixed(1)}° → ` +
          `landing=(${Math.round(landingX)}, ${Math.round(landingY)}) → ` +
          `distance=${Math.round(distance)}px`,
      );
    }

    if (distance > maxDistance) {
      maxDistance = distance;
      bestAngle = candidate.angle;
    }
  }

  // Mark the selected candidate
  const selectedIndex = candidateDetails.findIndex(c => Math.abs(c.angle - bestAngle) < 0.001);
  if (selectedIndex !== -1) {
    candidateDetails[selectedIndex].selected = true;
  }

  // CLI LOGGING: Show selection
  if (typeof console !== "undefined" && gameState.context?.turnNumber === 3) {
    const selected = candidateDetails[selectedIndex];
    console.log(
      `\n  ✅ SELECTED: ${selected.source} (${selected.angleDegrees.toFixed(1)}°) - ` +
        `${selected.distanceFromPlayer}px from player\n`,
    );
  }

  const decision = {
    weapon: "BAZOOKA",
    aimAngle: bestAngle,
    aimAngleDegrees: (bestAngle * 180) / Math.PI,
    targetIndex: 0,
    power: 1.0,
    movement: "none",
    explorationUsed: bestAngle !== baseAngle,
    candidatesChecked: 5,
    bestDistance: Math.round(maxDistance),
    candidates: candidateDetails,
  };

  // CLI LOGGING: Verify candidates in decision object
  if (typeof console !== "undefined" && gameState.context?.turnNumber === 3) {
    console.log(`  📦 Decision object has ${Object.keys(decision).length} properties`);
    console.log(`  📦 Candidates array has ${decision.candidates.length} items`);
  }

  return decision;
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
  fitness -= selfDamage * 15; // Heavy penalty for self-damage

  // Win bonus (secondary - much smaller now)
  if (gameStats.winner === 1) fitness += 50;

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

async function getLastGenerationNumber() {
  const checkpointDir = path.join(process.cwd(), "../../ai/checkpoints");

  try {
    const files = await fs.promises.readdir(checkpointDir);
    const checkpointFiles = files
      .filter(f => f.startsWith("self-damage-checkpoint-gen") && f.endsWith(".json"))
      .map(f => {
        const match = f.match(/gen(\d+)\.json$/);
        return match ? parseInt(match[1]) : 0;
      });

    return checkpointFiles.length > 0 ? Math.max(...checkpointFiles) : 0;
  } catch (error) {
    // Directory doesn't exist or is empty
    return 0;
  }
}

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
    networkAnalysis: stats.networkAnalysis,
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
  verifyPhysics: hasFlag("--verify-physics"), // NEW: Debug mode to compare predicted vs actual landing

  maps: ["heavyMetalCoaster", "dinocoaster", "magnificentBulk"],

  networkConfig: {
    inputs: 16, // Simplified - removed redundant/confusing metrics
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

  // Team 1 = our AI network, Team 2 = null (uses pure random in runner)
  const result = await runner.startNewGame(network, null, { mode: "1v1", map: map });

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

  const won = result.stats.winner === 1;

  return { fitness, selfDamage, won, error: false };
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
// TRAINING HISTORY PERSISTENCE
// =============================================================================

async function saveTrainingHistory(generationStats, startingGen, startTime) {
  const historyPath = path.join(process.cwd(), "../../ai/analysis/training-history.json");
  await fs.promises.mkdir(path.dirname(historyPath), { recursive: true });

  let history = { trainingSessions: [] };

  // Load existing history if it exists
  try {
    const existing = await fs.promises.readFile(historyPath, "utf-8");
    history = JSON.parse(existing);
  } catch (error) {
    // File doesn't exist yet
  }

  // Calculate win/loss ratios across all generations
  const totalWins = generationStats.reduce((sum, stat) => sum + (stat.wins || 0), 0);
  const totalGames = config.populationSize * config.gamesPerEvaluation * config.generations;
  const winRate = totalGames > 0 ? totalWins / totalGames : 0;

  // Add this training session
  const session = {
    sessionId: Date.now(),
    startTime: new Date(startTime).toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: ((Date.now() - startTime) / 1000 / 60).toFixed(1),
    config: {
      population: config.populationSize,
      generations: config.generations,
      gamesPerNetwork: config.gamesPerEvaluation,
      parallelTabs: config.parallelTabs,
    },
    winLossStats: {
      totalGames: totalGames,
      totalWins: totalWins,
      winRate: winRate.toFixed(3),
    },
    generations: generationStats.map((stat, idx) => ({
      generationInSession: stat.generation,
      cumulativeGeneration: startingGen + stat.generation,
      stats: {
        bestFitness: stat.bestFitness,
        avgFitness: stat.avgFitness,
        avgSelfDamage: stat.avgSelfDamage,
        bestSelfDamage: stat.bestSelfDamage,
        wins: stat.wins || 0,
        winRate: stat.gamesPlayed > 0 ? (stat.wins / stat.gamesPlayed).toFixed(3) : "0.000",
      },
      networkAnalysis: stat.networkAnalysis,
      regressionDetected: idx > 0 && stat.avgSelfDamage > generationStats[idx - 1].avgSelfDamage,
      improvement: idx > 0 ? generationStats[idx - 1].avgSelfDamage - stat.avgSelfDamage : 0,
    })),
  };

  history.trainingSessions.push(session);

  await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2));
  console.log(`\n📊 Training history saved to: ai/analysis/training-history.json`);
}

// =============================================================================
// TEMPLATE NETWORK WITH HIDDEN LAYERS
// =============================================================================

function createTemplateNetwork(inputSize, outputSize, hiddenLayers) {
  const { architect } = neataptic;

  // Build complete architecture: [inputs, ...hidden layers, outputs]
  const layers = [inputSize, ...hiddenLayers, outputSize];

  console.log(`  🏗️  Creating template: ${layers.join(" → ")}`);

  // Use Perceptron architect (fully connected layers)
  const template = new architect.Perceptron(...layers);

  return template;
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
  console.log(
    `  - Architecture: ${config.networkConfig.inputs} → [${config.networkConfig.hidden.join(",")}] → ${
      config.networkConfig.outputs
    }`,
  );
  console.log(`  - Input logging: ${config.logInputs ? "YES" : "NO"} (limit: ${config.logLimit})`);

  const speedupFactor = 6 * config.parallelTabs;
  console.log(`\n⚡ Expected speedup: ~${speedupFactor}x`);
  console.log(`⏱️  Est. time: ~${Math.round(180 / speedupFactor)} min for 10 gen`);

  // CRITICAL FIX: Load previous model if exists
  const existingModel = await loadBestModel();
  if (existingModel) {
    console.log(`\n📂 Loading previous best model...`);
    console.log(`  ✅ Found existing model - will seed population`);
  } else {
    console.log(`\n🆕 Starting from scratch with proper architecture`);
  }

  const startTime = Date.now();

  const neat = new Neat(config.networkConfig.inputs, config.networkConfig.outputs, null, {
    popsize: config.populationSize,
    mutationRate: config.mutationRate,
    elitism: config.elitism,
  });

  // CRITICAL FIX: Seed population with proper hidden layer architecture!
  if (existingModel) {
    try {
      const { Network } = neataptic;
      neat.population[0] = Network.fromJSON(existingModel);
      console.log(`  ✅ Seeded Network #1 with previous best model\n`);
    } catch (error) {
      console.log(`  ⚠️  Could not load model: ${error.message}\n`);
    }
  } else {
    // Create template network with hidden layers
    const template = createTemplateNetwork(
      config.networkConfig.inputs,
      config.networkConfig.outputs,
      config.networkConfig.hidden,
    );

    console.log(`\n🧬 Seeding population with proper architecture...`);
    const { Network } = neataptic;

    // Seed all networks with template + random variations
    for (let i = 0; i < neat.population.length; i++) {
      neat.population[i] = Network.fromJSON(template.toJSON());

      // Add random variation to weights
      neat.population[i].nodes.forEach(node => {
        if (node.bias) {
          node.bias += (Math.random() - 0.5) * 0.5;
        }
      });

      neat.population[i].connections.forEach(conn => {
        conn.weight += (Math.random() - 0.5) * 0.5;
      });
    }

    console.log(`  ✅ Seeded ${neat.population.length} networks with ${template.nodes.length} nodes each\n`);
  }

  console.log(`🔧 Initializing ${config.parallelTabs} browser tabs...`);
  const tabPool = [];

  for (let i = 0; i < config.parallelTabs; i++) {
    const runner = new PuppeteerGameRunner({
      headless: config.headless,
      devServerUrl: "http://localhost:3001",
      verifyPhysics: config.verifyPhysics,
    });

    await runner.initialize();
    await runner.loadGame();
    await runner.setGameSpeed(2.0);

    // DON'T inject decode function - use browser's real physics implementation!
    await runner.page.evaluate(
      (encodeFn, logFn) => {
        window.__CUSTOM_ENCODE__ = new Function("gameState", encodeFn);
        // window.__CUSTOM_DECODE__ is NOT set - puppeteer-game-runner has the real physics!

        // Enable turn-by-turn logging if requested
        if (window.__LOG_INPUTS__) {
          window.__LOG_TURN__ = new Function("turnNum", "gameState", "inputs", "decision", logFn);
        }
      },
      encodeSelfDamageGameState.toString().replace(/^function[^{]*{|}$/g, ""),
      config.logInputs ? logTurnInputs.toString().replace(/^function[^{]*{|}$/g, "") : "return;",
    );

    tabPool.push(runner);
    console.log(`  ✅ Tab ${i + 1}/${config.parallelTabs} ready`);
  }

  // CRITICAL: Create dumb opponent ONCE for all games
  const dumbOpponent = createDumbOpponent();
  console.log("🤖 Created static dumb opponent for consistent training environment\n");

  // CUMULATIVE GENERATION TRACKING: Load starting generation from checkpoints
  const startingGeneration = await getLastGenerationNumber();
  if (startingGeneration > 0) {
    console.log(`📂 Continuing from generation ${startingGeneration}`);
    console.log(
      `   Will train generations ${startingGeneration + 1} → ${startingGeneration + config.generations}\n`,
    );
  }

  const generationStats = [];
  const totalGames = config.populationSize * config.gamesPerEvaluation * config.generations;
  let currentGameNumber = 0;

  for (let gen = 1; gen <= config.generations; gen++) {
    const cumulativeGen = startingGeneration + gen;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📈 Generation ${gen}/${config.generations} (Cumulative: ${cumulativeGen})`);
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
      const totalWins = validResults.reduce((sum, r) => sum + (r.won ? 1 : 0), 0);
      const gamesPlayed = validResults.length;

      network.score = gamesPlayed > 0 ? totalFitness / gamesPlayed : -1000;
      network.avgSelfDamage = gamesPlayed > 0 ? totalSelfDamage / gamesPlayed : 100;
      network.wins = totalWins;
      network.gamesPlayed = gamesPlayed;

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

    // NETWORK ANALYSIS: Analyze best network to understand what it learned
    const networkAnalysis = analyzeNetwork(neat.population[0]);

    // Calculate win stats for this generation
    const genWins = neat.population.reduce((sum, n) => sum + (n.wins || 0), 0);
    const genGames = neat.population.reduce((sum, n) => sum + (n.gamesPlayed || 0), 0);

    generationStats.push({
      generation: gen,
      bestFitness,
      avgFitness,
      avgSelfDamage,
      bestSelfDamage,
      networkAnalysis,
      wins: genWins,
      gamesPlayed: genGames,
    });

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

        // REGRESSION DETECTED: Show what changed in the network
        const prevAnalysis = generationStats[gen - 2].networkAnalysis;
        const changes = compareGenerations(prevAnalysis, networkAnalysis);
        console.log(`\n  🔍 Regression Analysis:`);
        if (Object.keys(changes.inputInfluenceChanges).length > 0) {
          console.log(`    Input influence changes:`);
          Object.entries(changes.inputInfluenceChanges).forEach(([input, change]) => {
            console.log(`      ${input}: ${change.old} → ${change.new} (${change.change})`);
          });
        } else {
          console.log(`    No significant input influence changes detected`);
        }
      }
    }

    // Print detailed network analysis summary
    console.log(generateAnalysisSummary(networkAnalysis, cumulativeGen));

    // Save checkpoint every 5 cumulative generations AND on final generation (if >= 5 total)
    const shouldSaveCheckpoint =
      cumulativeGen % 5 === 0 || (gen === config.generations && config.generations >= 5);

    if (shouldSaveCheckpoint) {
      await saveCheckpoint(neat, cumulativeGen, generationStats[gen - 1]);
      await cleanupOldCheckpoints(cumulativeGen);
    }

    if (gen < config.generations) {
      neat.evolve();
    }
  }

  // Save input logs if enabled
  if (config.logInputs) {
    await saveInputLogs();
  }

  // Save complete training history for analysis
  await saveTrainingHistory(generationStats, startingGeneration, startTime);

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

  // Only save best model if we ran 5+ generations
  if (config.generations >= 5) {
    const bestNetwork = neat.population[0];
    const modelPath = path.join(process.cwd(), "../../ai/models/self-damage-avoidance.json");
    await fs.promises.mkdir(path.dirname(modelPath), { recursive: true });
    await fs.promises.writeFile(modelPath, JSON.stringify(bestNetwork.toJSON(), null, 2));
    console.log(`\n💾 Best network saved to: ai/models/self-damage-avoidance.json`);
  } else {
    console.log(`\n⏭️  Skipped model save (need >= 5 generations, ran ${config.generations})`);
  }

  console.log(`\n🔒 Closing ${tabPool.length} browser tabs...`);
  for (const runner of tabPool) {
    await runner.close();
  }
  console.log("🔒 Closing browser...");
}

trainSelfDamageAvoidance().catch(console.error);
