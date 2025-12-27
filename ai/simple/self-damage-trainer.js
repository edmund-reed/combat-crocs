// Strategic AI Trainer
// Goal: Teach AI strategic positioning and shooting decisions
// 24 inputs: self + enemy + strategic feedback + terrain + context
// 3 outputs: actionType (shoot/move), movementDistance, aimAngle

import neataptic from "neataptic";
const { Neat } = neataptic;
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import fs from "fs";
import path from "path";
import { analyzeNetwork, generateAnalysisSummary, compareGenerations } from "./network-analyzer.js";

// Modular components
import { encodeSelfDamageGameState } from "../training/input-encoder.js";
import { calculateFitness, aggregateNetworkStats } from "../training/fitness-calculator.js";
import {
  saveCheckpoint,
  loadFromCheckpoint,
  cleanupOldCheckpoints,
  saveBestModel,
} from "../training/checkpoint-manager.js";
import { addGameLog, saveInputLogs, saveTrainingHistory } from "../training/logger.js";

// NOTE: encodeSelfDamageGameState, calculateFitness, and other functions
// are now imported from modular components in ai/training/

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

// NOTE: Checkpoint and logging functions now imported from modular components

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
  logInputs: !hasFlag("--no-log"),
  logLimit: parseInt(getArg("--log-limit", "1")),
  debugInputs: hasFlag("--debug"),
  verifyPhysics: hasFlag("--verify-physics"),
  instantShot: hasFlag("--instant-shot"), // NEW: Enable instant bazooka (no projectile travel)

  maps: ["heavyMetalCoaster", "dinocoaster", "magnificentBulk"],

  networkConfig: {
    inputs: 24,
    outputs: 3,
    hidden: [24, 16, 10],
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
  config.verifyPhysics = true; // Enable physics verification
  console.log("\n🧪 TEST MODE");
  console.log("  - 1 network, 1 gen, 3 games");
  console.log("  - Input logging enabled");
  console.log("  - Physics verification enabled\n");
}

// =============================================================================
// HELPER: Play game with optional logging
// =============================================================================

async function playSingleGame(runner, network, opponent, map, gameNum, totalGames, netNum, generation) {
  console.log(`\n🎲 Game ${gameNum}/${totalGames}: Net ${netNum}, ${map}`);

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

  // Calculate fitness using imported module
  const fitnessResult = calculateFitness(result.stats, result.decision);
  const { fitness, enemyDamageDealt, selfDamage, turns, damagePerTurn } = fitnessResult;

  const myStartHealth = result.stats.initialHealth?.team1?.totalHealth || 100;
  const myEndHealth =
    result.stats.teams?.[1]?.totalHealth !== undefined ? result.stats.teams[1].totalHealth : 100;

  // Log game data with turn-by-turn inputs if logging enabled
  if (config.logInputs) {
    const gameLog = {
      gameId: `game-${Date.now()}-${gameNum}`,
      network: netNum,
      generation: generation,
      map: map,
      result: {
        winner: result.stats.winner,
        selfDamage: selfDamage,
        enemyDamage: enemyDamageDealt,
        fitness: fitness,
        initialHealth: myStartHealth,
        finalHealth: myEndHealth,
        turns: result.stats.turns || 0,
      },
      turns: result.stats.turnData || [],
    };
    addGameLog(gameLog); // Use imported logging function
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

  // NEW: Calculate shot-level statistics from turn data
  const turnData = result.stats.turnData || [];
  const shotsDealtDamage = turnData.filter(turn => {
    return (
      turn.team === 2 && turn.inputs?.shotFeedback?.didDamageSelf && turn.inputs.shotFeedback.damageTaken > 0
    );
  }).length;

  const totalShots = turnData.filter(turn => turn.team === 2).length;
  const missRate = totalShots > 0 ? ((totalShots - shotsDealtDamage) / totalShots) * 100 : 0;
  const effectiveDamagePerTurn = shotsDealtDamage > 0 ? enemyDamageDealt / shotsDealtDamage : 0;

  return {
    fitness,
    selfDamage,
    enemyDamage: enemyDamageDealt,
    damagePerTurn,
    effectiveDamagePerTurn, // NEW: Damage per successful hit
    missRate, // NEW: Percentage of shots that missed
    shotsDealtDamage, // NEW: Count of successful hits
    totalShots, // NEW: Total shots taken
    won,
    error: false,
    networkAngleSelections,
    totalDecisions,
  };
}

// NOTE: Model persistence and history functions still local (could be modularized further)

async function loadBestModel() {
  const modelPath = path.join(process.cwd(), "../../ai/models/self-damage-avoidance.json");
  try {
    const modelData = await fs.promises.readFile(modelPath, "utf-8");
    return JSON.parse(modelData);
  } catch (error) {
    return null;
  }
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
      instantShot: config.instantShot, // NEW: Pass instant shot flag
      customEncoder: encodeSelfDamageGameState,
    });

    await runner.initialize();
    await runner.loadGame();
    await runner.setGameSpeed(2.0);

    // Inject custom encoder - puppeteer-game-runner handles the rest (physics simulation, look-ahead)
    await runner.page.evaluate(encodeFn => {
      window.__CUSTOM_ENCODE__ = new Function("gameState", encodeFn);
    }, encodeSelfDamageGameState.toString().replace(/^function[^{]*{|}$/g, ""));

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

    // Aggregate results by network using modular function
    for (let i = 0; i < neat.population.length; i++) {
      const network = neat.population[i];
      const networkResults = allResults.filter(r => r.networkIndex === i);

      // Use aggregateNetworkStats for basic stats
      const stats = aggregateNetworkStats(networkResults);

      // Calculate additional stats not in aggregateNetworkStats
      const validResults = networkResults.filter(r => !r.error);
      const totalNetworkSelections = validResults.reduce(
        (sum, r) => sum + (r.networkAngleSelections || 0),
        0,
      );
      const totalDecisions = validResults.reduce((sum, r) => sum + (r.totalDecisions || 0), 0);
      const totalEffectiveDamage = validResults.reduce(
        (sum, r) => sum + (r.effectiveDamagePerTurn || 0) * (r.shotsDealtDamage || 0),
        0,
      );
      const totalShotsHit = validResults.reduce((sum, r) => sum + (r.shotsDealtDamage || 0), 0);
      const totalShots = validResults.reduce((sum, r) => sum + (r.totalShots || 0), 0);

      // Assign all stats to network
      network.score = stats.avgFitness;
      network.avgSelfDamage = stats.avgSelfDamage;
      network.avgEnemyDamage = stats.avgEnemyDamage;
      network.avgDamagePerTurn = stats.avgDamagePerTurn;
      network.wins = stats.wins;
      network.gamesPlayed = stats.gamesPlayed;
      network.avgEffectiveDamagePerTurn = totalShotsHit > 0 ? totalEffectiveDamage / totalShotsHit : 0;
      network.missRate = totalShots > 0 ? ((totalShots - totalShotsHit) / totalShots) * 100 : 0;
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

    // NEW: Aggregate shot-level metrics for population
    const avgEffectiveDamagePerTurn =
      neat.population.reduce((sum, n) => sum + (n.avgEffectiveDamagePerTurn || 0), 0) /
      neat.population.length;
    const bestEffectiveDamagePerTurn = neat.population[0].avgEffectiveDamagePerTurn || 0;
    const avgMissRate =
      neat.population.reduce((sum, n) => sum + (n.missRate || 0), 0) / neat.population.length;
    const bestMissRate = neat.population[0].missRate || 0;

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
      avgEffectiveDamagePerTurn, // NEW: Track effective damage
      bestEffectiveDamagePerTurn, // NEW: Track best effective damage
      avgMissRate, // NEW: Track miss rate
      bestMissRate, // NEW: Track best miss rate
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
      `  Effective Dmg/Turn: Avg ${avgEffectiveDamagePerTurn.toFixed(
        1,
      )} HP/turn | Best ${bestEffectiveDamagePerTurn.toFixed(1)} HP/turn (when damage > 0)`,
    );
    console.log(
      `  Miss Rate: Avg ${avgMissRate.toFixed(1)}% | Best ${bestMissRate.toFixed(
        1,
      )}% of shots dealt 0 damage`,
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
    const effectiveChange =
      stat.generation > 1
        ? stat.avgEffectiveDamagePerTurn - generationStats[stat.generation - 2].avgEffectiveDamagePerTurn
        : 0;
    const missRateChange =
      stat.generation > 1 ? stat.avgMissRate - generationStats[stat.generation - 2].avgMissRate : 0;
    const networkRateChange =
      stat.generation > 1
        ? stat.networkSelectionRate - generationStats[stat.generation - 2].networkSelectionRate
        : 0;
    const selfArrow = selfChange > 0 ? "↓" : selfChange < 0 ? "↑" : "→";
    const dmgArrow = dmgPerTurnChange > 0 ? "↑" : dmgPerTurnChange < 0 ? "↓" : "→";
    const effectiveArrow = effectiveChange > 0 ? "↑" : effectiveChange < 0 ? "↓" : "→";
    const missArrow = missRateChange > 0 ? "↑" : missRateChange < 0 ? "↓" : "→";
    const rateArrow = networkRateChange > 0 ? "↑" : networkRateChange < 0 ? "↓" : "→";
    console.log(
      `  Gen ${String(stat.generation).padStart(2)}: ` +
        `Self ${stat.avgSelfDamage.toFixed(1)} HP ${selfArrow} | ` +
        `Dmg/Turn ${stat.avgDamagePerTurn.toFixed(1)} HP ${dmgArrow} | ` +
        `Effective ${stat.avgEffectiveDamagePerTurn.toFixed(1)} HP ${effectiveArrow} | ` +
        `Miss ${stat.avgMissRate.toFixed(1)}% ${missArrow} | ` +
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
    await saveBestModel(bestNetwork, "self-damage-avoidance");
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
