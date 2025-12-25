// Self-Damage Avoidance Trainer
// FOCUSED goal: Teach AI to avoid damaging itself while considering enemy position
// 22 inputs: self status + enemy + feedback (enhanced) + terrain + context

import neataptic from "neataptic";
const { Neat } = neataptic;
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import fs from "fs";
import path from "path";
import { analyzeNetwork, generateAnalysisSummary, compareGenerations } from "./network-analyzer.js";

// =============================================================================
// ENHANCED ENCODING - 22 inputs (optimized)
// =============================================================================

function encodeSelfDamageGameState(gameState) {
  const inputs = [];

  // === SELF POSITION & HEALTH (3) ===
  inputs.push(gameState.self.x);
  inputs.push(gameState.self.y);
  inputs.push(gameState.self.health / gameState.self.maxHealth);

  // === ENEMY POSITION & HEALTH (3) ===
  const enemy = gameState.enemies && gameState.enemies[0];
  if (enemy) {
    inputs.push(enemy.x || 0);
    inputs.push(enemy.y || 0);
    inputs.push((enemy.health || 0) / (enemy.maxHealth || 100));
  } else {
    inputs.push(0);
    inputs.push(0);
    inputs.push(0);
  }

  // === LAST AIM ANGLE (1) === What did I choose last turn?
  const lastDecision = gameState.lastDecision || {};
  inputs.push(lastDecision.aimAngle || 0);

  // === ENHANCED EXPLOSION FEEDBACK (6) ===
  const feedback = gameState.shotFeedback || {};
  inputs.push(feedback.explosionX || 0);
  inputs.push(feedback.explosionY || 0);

  // Distance from self to explosion
  const explosionDistFromSelf = feedback.explosionX
    ? Math.sqrt(
        Math.pow(gameState.self.x - feedback.explosionX, 2) +
          Math.pow(gameState.self.y - feedback.explosionY, 2),
      )
    : 1000;
  inputs.push(explosionDistFromSelf);

  // NEW: Distance from enemy to explosion (accuracy feedback)
  const explosionDistFromEnemy =
    feedback.explosionX && enemy
      ? Math.sqrt(Math.pow(enemy.x - feedback.explosionX, 2) + Math.pow(enemy.y - feedback.explosionY, 2))
      : 1000;
  inputs.push(explosionDistFromEnemy);

  inputs.push(feedback.damageTaken || 0);

  // NEW: Binary flag - did we hit the enemy last turn?
  const didHitEnemy = feedback.didDamageEnemy ? 1 : 0;
  inputs.push(didHitEnemy);

  // === TERRAIN DISTANCES (8 directions) ===
  const terrainDists = gameState.terrain || [500, 500, 500, 500, 500, 500, 500, 500];
  inputs.push(...terrainDists);

  // === TIME REMAINING (1) ===
  inputs.push(gameState.context?.timeRemaining || 30);

  // Total: 22 inputs (removed constant ammo, added accuracy feedback)
  return inputs;
}

// =============================================================================
// LABELED INPUT STRUCTURE - For JSON logging
// =============================================================================

function getInputLabels() {
  return [
    "selfX",
    "selfY",
    "selfHealthPercent",
    "enemyX",
    "enemyY",
    "enemyHealthPercent",
    "lastAimAngle",
    "explosionX",
    "explosionY",
    "explosionDistFromSelf",
    "explosionDistFromEnemy",
    "damageTaken",
    "didHitEnemy",
    "terrainRight",
    "terrainUpRight",
    "terrainUp",
    "terrainUpLeft",
    "terrainLeft",
    "terrainDownLeft",
    "terrainDown",
    "terrainDownRight",
    "timeRemaining",
  ];
}

function createLabeledInputObject(gameState, inputArray) {
  const labels = getInputLabels();
  const labeled = {};

  labels.forEach((label, index) => {
    labeled[label] = inputArray[index];
  });

  // Create human-readable structure showing the exact model inputs
  return {
    modelInputs: inputArray, // <-- RAW 22-value array fed to network
    inputLabels: labeled, // <-- Same values with labels
    structuredData: {
      self: {
        x: labeled.selfX,
        y: labeled.selfY,
        healthPercent: labeled.selfHealthPercent,
      },
      enemy: {
        x: labeled.enemyX,
        y: labeled.enemyY,
        healthPercent: labeled.enemyHealthPercent,
      },
      lastDecision: {
        aimAngle: labeled.lastAimAngle,
        aimAngleDegrees: (labeled.lastAimAngle * 180) / Math.PI,
      },
      explosion: {
        x: labeled.explosionX,
        y: labeled.explosionY,
        distanceFromSelf: labeled.explosionDistFromSelf,
        distanceFromEnemy: labeled.explosionDistFromEnemy,
        damageTaken: labeled.damageTaken,
        didHitEnemy: labeled.didHitEnemy,
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
      },
      context: {
        timeRemaining: labeled.timeRemaining,
      },
    },
  };
}

function decodeNetworkOutput(outputs, gameState) {
  // HYBRID: Network base angle + random exploration
  const baseAngle = outputs[0] * 2 * Math.PI;

  // CLI LOGGING: Show we're simulating
  if (typeof console !== "undefined" && gameState.context?.turnNumber === 3) {
    console.log("\n🎯 [LOOK-AHEAD] Simulating 10 candidate shots...");
  }

  // Generate 10 candidate angles: 1 network + 9 random
  const candidateAngles = [
    { angle: baseAngle, source: "network" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
    { angle: Math.random() * 2 * Math.PI, source: "random" },
  ];

  // Helper function: Check if terrain blocks line-of-sight from landing to enemy
  const checkTerrainLineOfSight = (landingX, landingY, targetX, targetY) => {
    // Sample points along the line from landing to enemy
    const samples = 10;
    const dx = targetX - landingX;
    const dy = targetY - landingY;

    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      const checkX = landingX + dx * t;
      const checkY = landingY + dy * t;

      // Check if this point hits terrain
      const terrainBodies = gameState.terrain || [];
      // Simple distance check - if any terrain raycast is very short in this direction, blocked
      // This is a simplified check - in browser we'd do proper collision detection

      // For now, return true (clear) - will implement proper check in browser
      // The browser version will use actual terrain collision data
    }

    return true; // Assume clear for training (browser will do real check)
  };

  // Simulate each candidate and track details
  let bestAngle = baseAngle;
  let minDistToEnemy = Infinity;
  let minDistToEnemyClear = Infinity; // Track best with clear LOS
  const candidateDetails = [];

  const playerPos = { x: gameState.self.x, y: gameState.self.y };
  const enemy = gameState.enemies && gameState.enemies[0];
  const enemyPos = enemy ? { x: enemy.x, y: enemy.y } : { x: 600, y: 400 }; // Fallback to center

  for (const candidate of candidateAngles) {
    // Simulate shot landing position (simplified physics)
    const velocity = 15; // Bazooka velocity
    const gravity = 0.981; // Phaser gravity scaled
    const time = 1.5; // Approximate flight time

    const landingX = playerPos.x + Math.cos(candidate.angle) * velocity * time * 60;
    const landingY =
      playerPos.y + Math.sin(candidate.angle) * velocity * time * 60 + 0.5 * gravity * time * time * 60 * 60;

    // Calculate distance from landing to enemy (NEW: aim at enemy!)
    const dxToEnemy = landingX - enemyPos.x;
    const dyToEnemy = landingY - enemyPos.y;
    const distToEnemy = Math.sqrt(dxToEnemy * dxToEnemy + dyToEnemy * dyToEnemy);

    // Also track distance from player (for logging)
    const dx = landingX - playerPos.x;
    const dy = landingY - playerPos.y;
    const distFromPlayer = Math.sqrt(dx * dx + dy * dy);

    // Track this candidate's details
    candidateDetails.push({
      angle: candidate.angle,
      angleDegrees: (candidate.angle * 180) / Math.PI,
      source: candidate.source,
      landingX: Math.round(landingX),
      landingY: Math.round(landingY),
      distanceFromPlayer: Math.round(distFromPlayer),
      distanceToEnemy: Math.round(distToEnemy), // NEW: track proximity to enemy
      selected: false, // Will update after finding best
    });

    // CLI LOGGING: Show each candidate
    if (typeof console !== "undefined" && gameState.context?.turnNumber === 3) {
      console.log(
        `  ${candidate.source === "network" ? "🧠" : "🎲"} ${candidate.source.padEnd(7)}: ` +
          `angle=${((candidate.angle * 180) / Math.PI).toFixed(1)}° → ` +
          `landing=(${Math.round(landingX)}, ${Math.round(landingY)}) → ` +
          `distToEnemy=${Math.round(distToEnemy)}px`,
      );
    }

    // NEW: Pick shot that lands CLOSEST to enemy (attack-focused)
    if (distToEnemy < minDistToEnemy) {
      minDistToEnemy = distToEnemy;
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
        `${selected.distanceToEnemy}px from enemy\n`,
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
    candidatesChecked: 10,
    bestDistanceToEnemy: Math.round(minDistToEnemy), // NEW: track proximity to target
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
// BALANCED FITNESS - Avoid self-damage AND attack enemy
// =============================================================================

function calculateFitness(gameStats, decision) {
  let fitness = 100; // Base survival

  // === ACCURATE DAMAGE TRACKING FROM SHOT FEEDBACK ===
  // Each turn's shotFeedback shows what happened from the PREVIOUS turn
  // To see what WE (team 1) did, we check ENEMY's (team 2) turn feedback
  const turnData = gameStats.turnData || [];

  let selfDamage = 0;
  let enemyDamageDealt = 0;

  // Look at ENEMY turns (team 2) - their feedback shows what WE did
  for (let i = 0; i < turnData.length; i++) {
    const turn = turnData[i];

    if (turn.team === 2 && turn.inputs?.shotFeedback) {
      const feedback = turn.inputs.shotFeedback;

      // Enemy's feedback shows the result of OUR previous shot
      if (feedback.didDamageSelf) {
        // They took damage from us = we hit them
        enemyDamageDealt += feedback.damageTaken || 0;
      }

      if (feedback.didDamageEnemy) {
        // They "damaged enemy" (us) = we hit ourselves
        selfDamage += feedback.damageDealt || 0;
      }
    }
  }

  // === SELF DAMAGE PENALTY (avoid hurting yourself) ===
  fitness -= selfDamage * 3; // Reduced penalty to prioritize attacking (was 5)

  // === ENEMY DAMAGE REWARD (attack the opponent) ===
  fitness += enemyDamageDealt * 5; // STRONG reward for hurting enemy (was 3) - ATTACK FIRST!

  // === AIM QUALITY BONUS (network suggestion won look-ahead) ===
  // Small bonus if network's angle beat 4 random alternatives
  // Helps accelerate early learning by providing direct feedback
  if (decision && !decision.explorationUsed) {
    fitness += 15; // Small bonus - outcome rewards still dominate
  }

  // === DAMAGE EFFICIENCY BONUS (reward damage per turn) ===
  const turns = gameStats.turns || 50;
  const damagePerTurn = turns > 0 ? enemyDamageDealt / turns : 0;

  if (damagePerTurn > 0) {
    // Bonus for high damage efficiency
    // 40+ HP/turn = excellent (games end in ~2 turns)
    // 20 HP/turn = good (games end in ~5 turns)
    // 10 HP/turn = okay (games end in ~10 turns)
    let efficiencyBonus = 0;

    if (damagePerTurn >= 40) {
      efficiencyBonus = 100; // Major bonus for ultra-fast kills
    } else if (damagePerTurn >= 20) {
      efficiencyBonus = 50; // Good bonus for fast kills
    } else if (damagePerTurn >= 10) {
      efficiencyBonus = 25; // Small bonus for decent efficiency
    } else {
      efficiencyBonus = damagePerTurn * 2; // Linear scaling below 10 HP/turn
    }

    fitness += efficiencyBonus;
  }

  // === WIN BONUS (achieved through skill, not luck) ===
  // Only give win bonus if we actively damaged the enemy
  if (gameStats.winner === 1) {
    if (enemyDamageDealt > 30) {
      // Earned win through combat
      fitness += 150; // Major bonus for legitimate victory
    } else {
      // Won passively (enemy killed itself) - small bonus
      fitness += 30; // Discourage "do nothing and wait" strategy
    }
  }

  return { fitness, enemyDamageDealt, selfDamage, turns, damagePerTurn };
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
    population: neat.population.map(net => net.toJSON()), // FIXED: Save entire population
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

  console.log(`  💾 Checkpoint saved: ${filename} (full population: ${neat.population.length} networks)`);
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

    // Keep only last 2 checkpoints (full population takes more space)
    const toDelete = checkpointFiles.slice(2);

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
  elitism: parseInt(getArg("--elitism", "10")),
  headless: !hasFlag("--headed"),
  testMode: hasFlag("--test"),
  parallelTabs: parseInt(getArg("--tabs", "1")),
  logInputs: !hasFlag("--no-log"), // CHANGED: Default true, use --no-log to disable
  logLimit: parseInt(getArg("--log-limit", "1")), // CHANGED: Default to 1 log file
  debugInputs: hasFlag("--debug"),
  verifyPhysics: hasFlag("--verify-physics"), // NEW: Debug mode to compare predicted vs actual landing

  maps: ["heavyMetalCoaster", "dinocoaster", "magnificentBulk"],

  networkConfig: {
    inputs: 22, // Optimized: self + enemy + enhanced feedback + terrain + context
    outputs: 1,
    hidden: [22, 16, 10], // Scaled for 22 inputs - efficient architecture
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
    return { fitness: -1000, selfDamage: 100, enemyDamage: 0, error: true };
  }

  // NEW: calculateFitness now returns object with metrics
  const fitnessResult = calculateFitness(result.stats, result.decision);
  const { fitness, enemyDamageDealt, selfDamage, turns, damagePerTurn } = fitnessResult;

  const myStartHealth = result.stats.initialHealth?.team1?.totalHealth || 100;
  const myEndHealth =
    result.stats.teams?.[1]?.totalHealth !== undefined ? result.stats.teams[1].totalHealth : 100;

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
        enemyDamage: enemyDamageDealt, // NEW: Track enemy damage
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

  // Track network angle selection (from turn data if available)
  let networkAngleSelections = 0;
  let totalDecisions = 0;
  if (result.stats.turnData && result.stats.turnData.length > 0) {
    const aiTurns = result.stats.turnData.filter(turn => turn.team === 1);
    totalDecisions = aiTurns.length;
    networkAngleSelections = aiTurns.filter(turn => !turn.decision?.explorationUsed).length;
  }

  return {
    fitness,
    selfDamage,
    enemyDamage: enemyDamageDealt,
    damagePerTurn,
    won,
    error: false,
    networkAngleSelections,
    totalDecisions,
  };
}

// =============================================================================
// MODEL PERSISTENCE & CHECKPOINT LOADING
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

async function loadFromCheckpoint() {
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

    if (checkpointFiles.length === 0) {
      return null; // No checkpoints found
    }

    // Load the latest checkpoint
    const latestCheckpoint = checkpointFiles[0];
    const filepath = path.join(checkpointDir, latestCheckpoint.filename);
    const checkpointData = await fs.promises.readFile(filepath, "utf-8");
    const checkpoint = JSON.parse(checkpointData);

    return {
      generation: checkpoint.generation,
      population: checkpoint.population,
      stats: checkpoint.stats,
    };
  } catch (error) {
    console.log(`  ⚠️  Error loading checkpoint: ${error.message}`);
    return null;
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

  // Keep only the last 5 sessions to prevent file bloat
  if (history.trainingSessions.length > 5) {
    history.trainingSessions = history.trainingSessions.slice(-5);
    console.log(`\n🗑️  Trimmed training history to last 5 sessions`);
  }

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
  console.log(`  - Inputs: ${config.networkConfig.inputs} (ENHANCED - with enemy + weapons + context)`);
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
    console.log(`\n📂 Loading previous training session...`);
  }

  const startTime = Date.now();

  // CRITICAL FIX: Load entire population from checkpoint, not just best model!
  const checkpoint = await loadFromCheckpoint();
  let startingGeneration = 0;

  const neat = new Neat(config.networkConfig.inputs, config.networkConfig.outputs, null, {
    popsize: config.populationSize,
    mutationRate: config.mutationRate,
    elitism: config.elitism,
  });

  if (checkpoint && checkpoint.population) {
    // Check if checkpoint population size matches config
    if (checkpoint.population.length !== config.populationSize) {
      console.log(
        `  ⚠️  Checkpoint has ${checkpoint.population.length} networks but config specifies ${config.populationSize}`,
      );
      console.log(`  🆕 Starting fresh to match requested population size\n`);
      startingGeneration = 0;
    } else {
      // Restore entire population from checkpoint
      try {
        const { Network } = neataptic;
        startingGeneration = checkpoint.generation;

        neat.population = checkpoint.population.map(netJSON => Network.fromJSON(netJSON));

        console.log(`  ✅ Restored full population from generation ${startingGeneration}`);
        console.log(`  📊 Loaded ${neat.population.length} networks`);
        console.log(`  📈 Previous stats: avg self-damage ${checkpoint.stats.avgSelfDamage.toFixed(1)} HP\n`);
      } catch (error) {
        console.log(`  ⚠️  Could not load checkpoint: ${error.message}`);
        console.log(`  🆕 Starting from scratch instead\n`);
        startingGeneration = 0;
      }
    }
  }

  if (startingGeneration === 0) {
    // Starting fresh - create template network with hidden layers
    const template = createTemplateNetwork(
      config.networkConfig.inputs,
      config.networkConfig.outputs,
      config.networkConfig.hidden,
    );

    console.log(`\n🆕 Starting from generation 0`);
    console.log(`🧬 Seeding population with proper architecture...`);
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
      customEncoder: encodeSelfDamageGameState, // Pass custom 23-input encoder
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

  // startingGeneration already set during checkpoint loading above
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

    // NEW: Build ALL game tasks for ALL networks at once
    const allGameTasks = [];
    for (let i = 0; i < neat.population.length; i++) {
      const network = neat.population[i];

      for (let game = 0; game < config.gamesPerEvaluation; game++) {
        const mapIndex = game % config.maps.length;
        const map = config.maps[mapIndex];
        const tabIndex = allGameTasks.length % config.parallelTabs;
        const runner = tabPool[tabIndex];

        allGameTasks.push({
          runner,
          network,
          networkIndex: i,
          map,
          gameNum: ++currentGameNumber,
          totalGames,
          netNum: i + 1,
          generation: gen,
        });
      }
    }

    console.log(
      `  🚀 Playing ${allGameTasks.length} games across ${config.parallelTabs} tabs ` +
        `(${Math.ceil(allGameTasks.length / config.parallelTabs)} batches)`,
    );

    // NEW: Process ALL games in parallel batches (multiple networks at once!)
    const allResults = [];
    for (let batchStart = 0; batchStart < allGameTasks.length; batchStart += config.parallelTabs) {
      const batch = allGameTasks.slice(batchStart, batchStart + config.parallelTabs);
      const batchNum = Math.floor(batchStart / config.parallelTabs) + 1;
      const totalBatches = Math.ceil(allGameTasks.length / config.parallelTabs);

      if (batchNum % 5 === 0 || batchNum === totalBatches) {
        console.log(`  ⏳ Processing batch ${batchNum}/${totalBatches}...`);
      }

      const batchResults = await Promise.all(
        batch.map(task =>
          playSingleGame(
            task.runner,
            task.network,
            dumbOpponent,
            task.map,
            task.gameNum,
            task.totalGames,
            task.netNum,
            task.generation,
          ),
        ),
      );

      // Tag results with network index
      batchResults.forEach((result, idx) => {
        allResults.push({
          ...result,
          networkIndex: batch[idx].networkIndex,
        });
      });
    }

    // NEW: Aggregate results by network
    for (let i = 0; i < neat.population.length; i++) {
      const network = neat.population[i];
      const networkResults = allResults.filter(r => r.networkIndex === i);

      const validResults = networkResults.filter(r => !r.error);
      const totalFitness = validResults.reduce((sum, r) => sum + r.fitness, 0);
      const totalSelfDamage = validResults.reduce((sum, r) => sum + r.selfDamage, 0);
      const totalEnemyDamage = validResults.reduce((sum, r) => sum + r.enemyDamage, 0);
      const totalDamagePerTurn = validResults.reduce((sum, r) => sum + (r.damagePerTurn || 0), 0);
      const totalWins = validResults.reduce((sum, r) => sum + (r.won ? 1 : 0), 0);
      const gamesPlayed = validResults.length;
      const totalNetworkSelections = validResults.reduce(
        (sum, r) => sum + (r.networkAngleSelections || 0),
        0,
      );
      const totalDecisions = validResults.reduce((sum, r) => sum + (r.totalDecisions || 0), 0);

      network.score = gamesPlayed > 0 ? totalFitness / gamesPlayed : -1000;
      network.avgSelfDamage = gamesPlayed > 0 ? totalSelfDamage / gamesPlayed : 100;
      network.avgEnemyDamage = gamesPlayed > 0 ? totalEnemyDamage / gamesPlayed : 0;
      network.avgDamagePerTurn = gamesPlayed > 0 ? totalDamagePerTurn / gamesPlayed : 0;
      network.wins = totalWins;
      network.gamesPlayed = gamesPlayed;
      network.networkSelections = totalNetworkSelections;
      network.totalDecisions = totalDecisions;

      if ((i + 1) % 5 === 0 || i === neat.population.length - 1) {
        console.log(
          `  Net ${String(i + 1).padStart(2)}: Fit ${String(Math.round(network.score)).padStart(4)} | ` +
            `Self ${network.avgSelfDamage.toFixed(1)} HP | Enemy ${network.avgEnemyDamage.toFixed(1)} HP`,
        );
      }
    }

    neat.sort();

    const bestFitness = neat.population[0].score;
    const avgFitness = neat.population.reduce((sum, n) => sum + n.score, 0) / neat.population.length;
    const avgSelfDamage =
      neat.population.reduce((sum, n) => sum + n.avgSelfDamage, 0) / neat.population.length;
    const bestSelfDamage = neat.population[0].avgSelfDamage;
    const avgEnemyDamage =
      neat.population.reduce((sum, n) => sum + (n.avgEnemyDamage || 0), 0) / neat.population.length;
    const bestEnemyDamage = neat.population[0].avgEnemyDamage || 0;
    const avgDamagePerTurn =
      neat.population.reduce((sum, n) => sum + (n.avgDamagePerTurn || 0), 0) / neat.population.length;
    const bestDamagePerTurn = neat.population[0].avgDamagePerTurn || 0;

    // NETWORK ANALYSIS: Analyze best network to understand what it learned
    const networkAnalysis = analyzeNetwork(neat.population[0]);

    // Calculate win stats for this generation
    const genWins = neat.population.reduce((sum, n) => sum + (n.wins || 0), 0);
    const genGames = neat.population.reduce((sum, n) => sum + (n.gamesPlayed || 0), 0);

    // Calculate network selection rate
    const totalNetworkSelections = neat.population.reduce((sum, n) => sum + (n.networkSelections || 0), 0);
    const totalDecisionsAcrossPopulation = neat.population.reduce(
      (sum, n) => sum + (n.totalDecisions || 0),
      0,
    );
    const networkSelectionRate =
      totalDecisionsAcrossPopulation > 0
        ? (totalNetworkSelections / totalDecisionsAcrossPopulation) * 100
        : 0;

    // NEW: Calculate damage differential (enemy damage - self damage)
    const damageDifferential = avgEnemyDamage - avgSelfDamage;
    const bestDifferential = bestEnemyDamage - bestSelfDamage;

    generationStats.push({
      generation: gen,
      bestFitness,
      avgFitness,
      avgSelfDamage,
      bestSelfDamage,
      avgEnemyDamage,
      bestEnemyDamage,
      avgDamagePerTurn,
      bestDamagePerTurn,
      networkAnalysis,
      wins: genWins,
      gamesPlayed: genGames,
      networkSelectionRate, // NEW: Track per-generation
    });

    console.log(`\n📊 Gen ${gen} Summary:`);
    console.log(`  Best Fitness: ${Math.round(bestFitness)} | Avg: ${Math.round(avgFitness)}`);
    console.log(`  Self-Damage: Avg ${avgSelfDamage.toFixed(1)} HP | Best ${bestSelfDamage.toFixed(1)} HP`);
    console.log(
      `  Enemy Damage: Avg ${avgEnemyDamage.toFixed(1)} HP | Best ${bestEnemyDamage.toFixed(1)} HP`,
    );
    console.log(
      `  Dmg/Turn: Avg ${avgDamagePerTurn.toFixed(1)} HP/turn | Best ${bestDamagePerTurn.toFixed(
        1,
      )} HP/turn ${bestDamagePerTurn >= 40 ? "🔥" : bestDamagePerTurn >= 20 ? "⚡" : ""}`,
    );
    console.log(
      `  Differential: Avg ${damageDifferential >= 0 ? "+" : ""}${damageDifferential.toFixed(1)} HP | ` +
        `Best ${bestDifferential >= 0 ? "+" : ""}${bestDifferential.toFixed(1)} HP`,
    );
    console.log(`  Network Win Rate: ${networkSelectionRate.toFixed(1)}% (network angle chosen over random)`);

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

  console.log(`\n📉 Learning Curves:`);
  generationStats.forEach(stat => {
    const selfChange =
      stat.generation > 1 ? generationStats[stat.generation - 2].avgSelfDamage - stat.avgSelfDamage : 0;
    const dmgPerTurnChange =
      stat.generation > 1 ? stat.avgDamagePerTurn - generationStats[stat.generation - 2].avgDamagePerTurn : 0;
    const networkRateChange =
      stat.generation > 1
        ? stat.networkSelectionRate - generationStats[stat.generation - 2].networkSelectionRate
        : 0;
    const selfArrow = selfChange > 0 ? "↓" : selfChange < 0 ? "↑" : "→";
    const dmgArrow = dmgPerTurnChange > 0 ? "↑" : dmgPerTurnChange < 0 ? "↓" : "→";
    const rateArrow = networkRateChange > 0 ? "↑" : networkRateChange < 0 ? "↓" : "→";
    console.log(
      `  Gen ${String(stat.generation).padStart(2)}: ` +
        `Self ${stat.avgSelfDamage.toFixed(1)} HP ${selfArrow} | ` +
        `Dmg/Turn ${stat.avgDamagePerTurn.toFixed(1)} HP ${dmgArrow} | ` +
        `Net ${stat.networkSelectionRate.toFixed(1)}% ${rateArrow}`,
    );
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
