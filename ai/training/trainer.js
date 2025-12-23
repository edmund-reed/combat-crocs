// Main AI Training System using Neuroevolution
// Uses Puppeteer to run games and evolve neural networks

import neataptic from "neataptic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PuppeteerGameRunner from "./puppeteer-game-runner.js";
import { NETWORK_CONFIG, encodeGameState, decodeNetworkOutput } from "./network-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AITrainer {
  constructor(options = {}) {
    this.options = {
      populationSize: options.populationSize || NETWORK_CONFIG.training.populationSize,
      generations: options.generations || 200,
      gamesPerNetwork: options.gamesPerNetwork || 3,
      elitePercentage: options.elitePercentage || NETWORK_CONFIG.training.elitePercentage,
      mutationRate: options.mutationRate || NETWORK_CONFIG.training.mutationRate,
      headless: options.headless || false,
      exportCheckpoints: options.exportCheckpoints !== false,
      ...options,
    };

    this.population = [];
    this.generation = 0;
    this.bestNetwork = null;
    this.bestFitness = -Infinity;
    this.stats = {
      generations: [],
      bestFitness: [],
      avgFitness: [],
    };

    this.gameRunner = null;

    // PHASE 1: Map rotation for diverse training
    this.availableMaps = ["dinocoaster", "heavyMetalCoaster", "hotelOfHorror", "magnificentBulk"];
    this.currentMapIndex = 0;

    // PHASE 2.5: Progress tracking
    this.trainingStartTime = null;
    this.totalGames = 0;
    this.gamesCompleted = 0;

    // PHASE 2.5: Fixed baseline opponents
    this.baselinePopulation = null;

    // PHASE 2b: Parallel browser workers
    this.workers = [];
    this.numWorkers = options.workers || 1;
  }

  // PHASE 2.5: Load baseline opponents for fixed difficulty training
  async loadBaseline(baselinePath) {
    console.log(`\n🎯 Loading baseline opponents: ${baselinePath}`);

    const baselineData = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

    // Load baseline population
    this.baselinePopulation = baselineData.population.map(member => ({
      network: neataptic.Network.fromJSON(member.network),
    }));

    console.log(`  ✅ Loaded ${this.baselinePopulation.length} baseline opponents`);
    console.log(`  📊 Baseline from Generation ${baselineData.generation}`);
    console.log(`  🎯 Your networks will compete against this fixed difficulty\n`);
  }

  // PHASE 2.5: Load from checkpoint to resume training
  async loadFromCheckpoint(checkpointPath) {
    console.log(`\n📂 Loading checkpoint: ${checkpointPath}`);

    const checkpointData = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));

    // Restore generation counter
    this.generation = checkpointData.generation;
    console.log(`  ✅ Resuming from Generation ${this.generation}`);

    // Store checkpoint baseline for progress comparison
    this.checkpointGeneration = checkpointData.generation;
    this.checkpointBestFitness = checkpointData.bestFitness;
    const checkpointStats = checkpointData.stats;
    this.checkpointAvgFitness = checkpointStats.avgFitness[checkpointStats.avgFitness.length - 1];

    // Restore population
    this.population = checkpointData.population.map(member => ({
      network: neataptic.Network.fromJSON(member.network),
      fitness: 0, // Reset for new training
      wins: 0,
      losses: 0,
      totalDamage: 0,
      gamesPlayed: 0,
    }));
    console.log(`  ✅ Loaded ${this.population.length} networks`);

    // Restore stats
    this.stats = checkpointData.stats;
    this.bestFitness = checkpointData.bestFitness;
    this.bestNetwork = neataptic.Network.fromJSON(this.population[0].network.toJSON());
    console.log(`  ✅ Best fitness: ${this.bestFitness.toFixed(2)}`);

    console.log(`\n🚀 Ready to continue training...\n`);
  }

  async initialize() {
    console.log("\n🧬 Combat Crocs AI Training System");
    console.log("=".repeat(50));
    console.log(`Population Size: ${this.options.populationSize}`);
    console.log(`Target Generations: ${this.options.generations}`);
    console.log(`Games per Network: ${this.options.gamesPerNetwork}`);
    console.log(`Elite Percentage: ${this.options.elitePercentage * 100}%`);
    // PHASE 2b: Show parallel workers info
    if (this.numWorkers > 1) {
      console.log(`🚀 Parallel Workers: ${this.numWorkers} (${this.numWorkers}x speedup!)`);
    }
    console.log("=".repeat(50) + "\n");

    // PHASE 2b: Initialize multiple browser workers for parallel training
    if (this.numWorkers > 1) {
      console.log(`🚀 Initializing ${this.numWorkers} parallel browser workers...`);
      for (let i = 0; i < this.numWorkers; i++) {
        const worker = new PuppeteerGameRunner({
          headless: this.options.headless,
          devServerUrl: "http://localhost:3001",
        });
        await worker.initialize();
        await worker.loadGame();
        await worker.setGameSpeed(2.0);
        this.workers.push(worker);
        console.log(`  ✅ Worker ${i + 1}/${this.numWorkers} ready`);
      }
      console.log(`✅ All ${this.numWorkers} workers initialized!\n`);
    } else {
      // Single worker mode (original behavior)
      this.gameRunner = new PuppeteerGameRunner({
        headless: this.options.headless,
        devServerUrl: "http://localhost:3001",
      });
      await this.gameRunner.initialize();
      await this.gameRunner.loadGame();
      await this.gameRunner.setGameSpeed(2.0);
    }

    // Create initial population
    console.log("🌱 Creating initial population...");
    this.createInitialPopulation();
    console.log(`✅ Created ${this.population.length} random networks\n`);
  }

  createInitialPopulation() {
    this.population = [];
    for (let i = 0; i < this.options.populationSize; i++) {
      // Create a simple feedforward network
      const network = new neataptic.architect.Perceptron(
        NETWORK_CONFIG.inputs,
        Math.floor(NETWORK_CONFIG.inputs * 0.75), // Hidden layer
        NETWORK_CONFIG.outputs,
      );

      this.population.push({
        network,
        fitness: 0,
        wins: 0,
        losses: 0,
        totalDamage: 0,
        gamesPlayed: 0,
      });
    }
  }

  async train() {
    console.log("🏋️  Starting training...\n");

    // PHASE 2.5: Initialize progress tracking
    const overallTrainingStart = Date.now();
    this.trainingStartTime = Date.now();
    const startGeneration = this.generation + 1; // Next generation after checkpoint
    this.totalGames =
      (this.options.generations - this.generation) *
      this.options.populationSize *
      this.options.gamesPerNetwork;
    this.gamesCompleted = 0;

    console.log(`📊 Total games to play: ${this.totalGames}\n`);

    try {
      for (
        this.generation = startGeneration;
        this.generation <= this.options.generations;
        this.generation++
      ) {
        console.log(`\n📊 Generation ${this.generation}/${this.options.generations}`);
        console.log("-".repeat(50));

        // Evaluate all networks in the population
        await this.evaluatePopulation();

        // Check if all networks failed (fitness = 0)
        const allZero = this.population.every(m => m.fitness === 0);
        if (allZero && this.generation > 1) {
          throw new Error(`Generation ${this.generation}: All fitness = 0. Training failure detected.`);
        }

        // Sort by fitness
        this.population.sort((a, b) => b.fitness - a.fitness);

        // Track best network
        if (this.population[0].fitness > this.bestFitness) {
          this.bestFitness = this.population[0].fitness;
          this.bestNetwork = this.population[0].network;
          console.log(`\n🏆 New best fitness: ${this.bestFitness.toFixed(2)}`);
        }

        // Print generation stats
        this.printGenerationStats();

        // Export checkpoints
        if (this.options.exportCheckpoints) {
          await this.exportCheckpoints();
        }

        // Evolve population (except last generation)
        if (this.generation < this.options.generations) {
          this.evolvePopulation();
        }
      }

      console.log("\n✅ Training complete!");

      // Calculate and display training duration
      const trainingEndTime = Date.now();
      const durationMs = trainingEndTime - overallTrainingStart;
      const durationSec = Math.floor(durationMs / 1000);
      const durationMin = Math.floor(durationSec / 60);
      const remainingSec = durationSec % 60;
      const generationsTrained = this.generation - startGeneration + 1;

      console.log(`\n⏱️  Training Duration:`);
      console.log(`  Total time: ${durationMin}m ${remainingSec}s`);
      console.log(`  Generations trained: ${generationsTrained}`);
      console.log(`  Avg time per generation: ${(durationSec / generationsTrained).toFixed(1)}s`);
      console.log(`  Total games played: ${this.gamesCompleted}`);
      console.log(`  Avg time per game: ${(durationMs / this.gamesCompleted / 1000).toFixed(2)}s`);

      await this.exportFinalModels();
    } finally {
      await this.cleanup();
    }
  }

  async evaluatePopulation() {
    console.log(`Evaluating ${this.population.length} networks...`);

    // Reset fitness scores
    this.population.forEach(member => {
      member.fitness = 0;
      member.wins = 0;
      member.losses = 0;
      member.totalDamage = 0;
      member.gamesPlayed = 0;
    });

    // PHASE 2b: Parallel or sequential execution
    if (this.numWorkers > 1) {
      await this.evaluatePopulationParallel();
    } else {
      await this.evaluatePopulationSequential();
    }
  }

  async evaluatePopulationSequential() {
    // Original sequential execution (single browser)
    for (let i = 0; i < this.population.length; i++) {
      const member = this.population[i];

      for (let game = 0; game < this.options.gamesPerNetwork; game++) {
        // PHASE 2.5: Progress counter
        this.gamesCompleted++;
        const progressPercent = ((this.gamesCompleted / this.totalGames) * 100).toFixed(1);
        console.log(
          `  Network ${i + 1}/${this.population.length} [Game ${this.gamesCompleted}/${
            this.totalGames
          } - ${progressPercent}%]:`,
        );

        // PHASE 2.5: Pick opponent - use baseline if available, otherwise self-play
        let opponent;
        if (this.baselinePopulation) {
          // Use fixed baseline opponent
          const baselineIndex = Math.floor(Math.random() * this.baselinePopulation.length);
          opponent = this.baselinePopulation[baselineIndex];
        } else {
          // Use self-play opponent (excluding self)
          let opponentIndex;
          do {
            opponentIndex = Math.floor(Math.random() * this.population.length);
          } while (opponentIndex === i);
          opponent = this.population[opponentIndex];
        }

        // PHASE 2a: Restart browser every 50 games (was 20) to reduce overhead
        const gamesCompleted =
          (this.generation - 1) * this.options.populationSize * this.options.gamesPerNetwork +
          i * this.options.gamesPerNetwork +
          game +
          1;

        if (gamesCompleted % 50 === 0) {
          console.log(`    🔄 Restarting browser (${gamesCompleted} games played)...`);
          await this.gameRunner.close();
          await this.gameRunner.initialize();
          await this.gameRunner.loadGame();
          await this.gameRunner.setGameSpeed(2.0);
        }

        // Play game
        let result = await this.playGame(member.network, opponent.network, i, opponentIndex);

        // Update fitness based on result
        if (result.error) {
          console.log(`    ⚠️  Game ${game + 1} error: ${result.error}`);

          // Try restarting browser once
          console.log(`    🔄 Attempting browser restart...`);
          await this.gameRunner.close();
          await this.gameRunner.initialize();
          await this.gameRunner.loadGame();
          await this.gameRunner.setGameSpeed(2.0);

          // Retry the game once
          const retryResult = await this.playGame(member.network, opponent.network, i, opponentIndex);
          if (retryResult.error) {
            throw new Error(`Game failed after browser restart: ${retryResult.error}`);
          }
          result = retryResult; // Use retry result
        }

        // CRITICAL FIX: Only update current player's fitness, not opponent's
        // Opponent will get evaluated during its own turn
        this.updateFitness(member, result, 1); // Team 1 (current player)

        member.gamesPlayed++;
      }

      console.log(
        `    Fitness: ${member.fitness.toFixed(2)} | W/L: ${member.wins}/${member.losses} | Avg Damage: ${(
          member.totalDamage / member.gamesPlayed
        ).toFixed(1)}`,
      );
    }
  }

  // PHASE 2b: Parallel evaluation - distribute games across workers
  async evaluatePopulationParallel() {
    // Build queue of all games to play
    const gameQueue = [];
    for (let i = 0; i < this.population.length; i++) {
      for (let game = 0; game < this.options.gamesPerNetwork; game++) {
        // Pick opponent
        let opponent;
        if (this.baselinePopulation) {
          const baselineIndex = Math.floor(Math.random() * this.baselinePopulation.length);
          opponent = this.baselinePopulation[baselineIndex];
        } else {
          let opponentIndex;
          do {
            opponentIndex = Math.floor(Math.random() * this.population.length);
          } while (opponentIndex === i);
          opponent = this.population[opponentIndex];
        }

        gameQueue.push({
          networkIndex: i,
          network: this.population[i].network,
          opponent: opponent.network,
        });
      }
    }

    console.log(`  🚀 Playing ${gameQueue.length} games across ${this.numWorkers} workers...`);

    // Process games in parallel batches
    let gamesProcessed = 0;
    while (gamesProcessed < gameQueue.length) {
      // Create batch for parallel execution
      const batchSize = this.numWorkers;
      const batch = gameQueue.slice(gamesProcessed, gamesProcessed + batchSize);

      // Play games in parallel
      const promises = batch.map((gameData, workerIndex) => {
        const worker = this.workers[workerIndex];
        return this.playGameWithWorker(worker, gameData.network, gameData.opponent);
      });

      const results = await Promise.all(promises);

      // Update fitness for completed games
      results.forEach((result, batchIndex) => {
        const gameData = batch[batchIndex];
        const member = this.population[gameData.networkIndex];

        if (!result.error) {
          this.updateFitness(member, result, 1);
          member.gamesPlayed++;
        }

        this.gamesCompleted++;
      });

      // Progress update
      const progressPercent = ((this.gamesCompleted / this.totalGames) * 100).toFixed(1);
      console.log(`  Progress: ${this.gamesCompleted}/${this.totalGames} (${progressPercent}%)`);

      gamesProcessed += batch.length;
    }

    // Print final stats for each network
    this.population.forEach((member, i) => {
      console.log(
        `  Network ${i + 1}: Fitness ${member.fitness.toFixed(2)} | W/L: ${member.wins}/${
          member.losses
        } | Avg Damage: ${(member.totalDamage / member.gamesPlayed).toFixed(1)}`,
      );
    });
  }

  async playGameWithWorker(worker, network1, network2) {
    // PHASE 1: Rotate through different maps
    const selectedMap = this.availableMaps[this.currentMapIndex];
    this.currentMapIndex = (this.currentMapIndex + 1) % this.availableMaps.length;

    try {
      const result = await worker.startNewGame(network1, network2, {
        mode: "1v1",
        map: selectedMap,
      });
      return result;
    } catch (error) {
      return {
        error: error.message,
        winner: null,
        stats: null,
      };
    }
  }

  async playGame(network1, network2, id1, id2) {
    // PHASE 1: Rotate through different maps for diverse training
    const selectedMap = this.availableMaps[this.currentMapIndex];
    this.currentMapIndex = (this.currentMapIndex + 1) % this.availableMaps.length;

    try {
      const result = await this.gameRunner.startNewGame(network1, network2, {
        mode: "1v1",
        map: selectedMap,
      });

      return result;
    } catch (error) {
      return {
        error: error.message,
        winner: null,
        stats: null,
      };
    }
  }

  updateFitness(member, gameResult, team) {
    if (!gameResult.stats || !gameResult.stats.teams) return;

    const teamStats = gameResult.stats.teams[team];
    if (!teamStats) return;

    const won = gameResult.winner === team;
    const survived = teamStats.alive > 0;
    const survivalTime = gameResult.stats.turns || 0;

    // Calculate fitness based on config weights
    let fitness = 0;

    // === CORE REWARDS ===

    // Win bonus (primary goal)
    if (won) {
      fitness += NETWORK_CONFIG.fitness.winBonus;
      member.wins++;
    } else {
      member.losses++;
    }

    // Survival time (stay alive longer)
    fitness += survivalTime * NETWORK_CONFIG.fitness.survivalWeight;

    // Damage dealt to enemies (offensive power)
    const enemyTeam = team === 1 ? 2 : 1;
    const initialHealth = gameResult.stats.initialHealth;

    let damageDealt = 0;
    if (initialHealth && initialHealth[enemyTeam] && gameResult.stats.teams[enemyTeam]) {
      const enemyInitialHealth = initialHealth[enemyTeam].totalHealth;
      const enemyFinalHealth = gameResult.stats.teams[enemyTeam].totalHealth;
      damageDealt = Math.max(0, enemyInitialHealth - enemyFinalHealth);
    }

    fitness += damageDealt * NETWORK_CONFIG.fitness.damageDealtWeight;
    member.totalDamage += damageDealt;

    // === PENALTIES (BALANCED for learning safe BUT aggressive play) ===

    // Self-damage penalty (punish reckless shots)
    // Calculate self-damage as health lost beyond enemy damage
    let selfDamage = 0;
    if (initialHealth && initialHealth[team]) {
      const myInitialHealth = initialHealth[team].totalHealth;
      const myFinalHealth = teamStats.totalHealth;
      const totalHealthLost = Math.max(0, myInitialHealth - myFinalHealth);

      // Damage taken from enemy
      const damageTakenFromEnemy = damageDealt > 0 ? Math.min(totalHealthLost, damageDealt * 0.5) : 0;

      // Remaining health loss is likely self-damage
      selfDamage = Math.max(0, totalHealthLost - damageTakenFromEnemy);

      // Apply self-damage penalty (1.0x weight - REDUCED from 1.5 to encourage engagement)
      if (selfDamage > 0) {
        fitness -= selfDamage * 2.5; // INCREASED from 1.0 to punish self-harm harder
      }

      // Apply damage taken penalty (0.5x weight - REDUCED from 0.8, combat expected)
      if (damageTakenFromEnemy > 0) {
        fitness -= damageTakenFromEnemy * 0.5;
      }
    }

    // === BONUSES (Encourage smart play) ===

    // Combat engagement bonus (reward productive aggression)
    if (damageDealt >= 60) {
      fitness += 25; // Bonus for dealing significant damage
    }

    // Safe shot bonus (reward engagement without self-harm)
    if (selfDamage === 0 && damageDealt > 0) {
      fitness += 15; // Bonus for safe, productive combat
    }

    // Health efficiency bonus (reward winning with HP remaining)
    if (won && initialHealth && initialHealth[team]) {
      const myInitialHealth = initialHealth[team].totalHealth;
      const myFinalHealth = teamStats.totalHealth;
      const healthRatio = myFinalHealth / myInitialHealth;
      fitness += healthRatio * 50; // Up to +50 for perfect health preservation
    }

    member.fitness += fitness;
  }

  evolvePopulation() {
    console.log("\n🧬 Evolving population...");

    const eliteCount = Math.floor(this.population.length * this.options.elitePercentage);
    const newPopulation = [];

    // Keep elite networks
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push({
        network: neataptic.Network.fromJSON(this.population[i].network.toJSON()),
        fitness: 0,
        wins: 0,
        losses: 0,
        totalDamage: 0,
        gamesPlayed: 0,
      });
    }

    console.log(`  Kept ${eliteCount} elite networks`);

    // Create offspring through mutation and crossover
    while (newPopulation.length < this.population.length) {
      // Select two parents via tournament selection
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();

      let offspring;
      if (Math.random() < 0.5) {
        // Crossover
        offspring = neataptic.Network.crossOver(parent1.network, parent2.network);
      } else {
        // Clone and mutate
        offspring = neataptic.Network.fromJSON(parent1.network.toJSON());
      }

      // FIXED: Apply mutations probabilistically, not all at once
      // This prevents destroying good networks
      const mutationRate = this.options.mutationRate;

      if (Math.random() < mutationRate * 0.2) offspring.mutate(neataptic.methods.mutation.ADD_NODE);
      if (Math.random() < mutationRate * 0.2) offspring.mutate(neataptic.methods.mutation.SUB_NODE);
      if (Math.random() < mutationRate * 0.3) offspring.mutate(neataptic.methods.mutation.ADD_CONN);
      if (Math.random() < mutationRate * 0.3) offspring.mutate(neataptic.methods.mutation.SUB_CONN);
      if (Math.random() < mutationRate) offspring.mutate(neataptic.methods.mutation.MOD_WEIGHT);
      if (Math.random() < mutationRate * 0.5) offspring.mutate(neataptic.methods.mutation.MOD_BIAS);
      if (Math.random() < mutationRate * 0.1) offspring.mutate(neataptic.methods.mutation.MOD_ACTIVATION);

      newPopulation.push({
        network: offspring,
        fitness: 0,
        wins: 0,
        losses: 0,
        totalDamage: 0,
        gamesPlayed: 0,
      });
    }

    this.population = newPopulation;
    console.log(`  Created ${newPopulation.length - eliteCount} offspring`);
  }

  tournamentSelection() {
    const tournamentSize = 3;
    const tournament = [];

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }

    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
  }

  printGenerationStats() {
    const fitnesses = this.population.map(m => m.fitness);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const maxFitness = Math.max(...fitnesses);
    const minFitness = Math.min(...fitnesses);

    const totalWins = this.population.reduce((sum, m) => sum + m.wins, 0);
    const totalGames = this.population.reduce((sum, m) => sum + m.gamesPlayed, 0);
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    console.log(`\n📈 Statistics:`);
    console.log(`  Best Fitness:    ${maxFitness.toFixed(2)}`);
    console.log(`  Average Fitness: ${avgFitness.toFixed(2)}`);
    console.log(`  Worst Fitness:   ${minFitness.toFixed(2)}`);
    console.log(`  Win Rate:        ${winRate.toFixed(1)}%`);

    // Show progress since checkpoint (if loaded from checkpoint)
    if (this.checkpointGeneration !== undefined) {
      console.log(`\n📊 Progress Since Checkpoint (Gen ${this.checkpointGeneration}):`);

      const bestChange = maxFitness - this.checkpointBestFitness;
      const bestPercent =
        this.checkpointBestFitness > 0 ? ((bestChange / this.checkpointBestFitness) * 100).toFixed(1) : "N/A";
      const avgChange = avgFitness - this.checkpointAvgFitness;
      const avgPercent =
        this.checkpointAvgFitness > 0 ? ((avgChange / this.checkpointAvgFitness) * 100).toFixed(1) : "N/A";

      console.log(
        `  Best:    ${this.checkpointBestFitness.toFixed(2)} → ${maxFitness.toFixed(2)} (${
          bestChange >= 0 ? "+" : ""
        }${bestChange.toFixed(2)}, ${bestChange >= 0 ? "+" : ""}${bestPercent}%)`,
      );
      console.log(
        `  Average: ${this.checkpointAvgFitness.toFixed(2)} → ${avgFitness.toFixed(2)} (${
          avgChange >= 0 ? "+" : ""
        }${avgChange.toFixed(2)}, ${avgChange >= 0 ? "+" : ""}${avgPercent}%)`,
      );
    }

    // PHASE 2.5: Learning insights - human-readable analysis
    if (this.stats.bestFitness.length > 0) {
      console.log(`\n🧠 Learning Insights (vs previous generation):`);
      const lastBest = this.stats.bestFitness[this.stats.bestFitness.length - 1];
      const change = maxFitness - lastBest;
      const changePercent = lastBest > 0 ? ((change / lastBest) * 100).toFixed(1) : 0;

      if (change > 50) {
        console.log(
          `  ✓ Major breakthrough! Fitness jumped ${change.toFixed(0)} points (+${changePercent}%)`,
        );
      } else if (change > 0) {
        console.log(`  ⬆ Improving: +${change.toFixed(0)} points (+${changePercent}%)`);
      } else if (change < -50) {
        console.log(`  ⚠ Significant regression: ${change.toFixed(0)} points (${changePercent}%)`);
      } else if (change < 0) {
        console.log(
          `  ⬇ Slight decline: ${change.toFixed(0)} points (${changePercent}%) - exploring new strategies`,
        );
      } else {
        console.log(`  → Plateau: No improvement this generation`);
      }

      if (winRate > 70) {
        console.log(`  ✓ Strong win rate (${winRate.toFixed(1)}%) - AI is dominating`);
      } else if (winRate > 55) {
        console.log(`  → Good win rate (${winRate.toFixed(1)}%) - competitive AI`);
      } else if (winRate < 40) {
        console.log(`  ⚠ Low win rate (${winRate.toFixed(1)}%) - still learning fundamentals`);
      }

      const avgDamage =
        this.population.reduce((sum, m) => sum + m.totalDamage / m.gamesPlayed, 0) / this.population.length;
      if (avgDamage > 80) {
        console.log(`  ✓ High damage output (${avgDamage.toFixed(1)}) - accurate shots`);
      } else if (avgDamage < 40) {
        console.log(`  → Low damage (${avgDamage.toFixed(1)}) - working on accuracy`);
      }
    }

    this.stats.generations.push(this.generation);
    this.stats.bestFitness.push(maxFitness);
    this.stats.avgFitness.push(avgFitness);
  }

  async exportCheckpoints() {
    // PHASE 2.5: Adaptive checkpoint strategy
    let checkpointFrequency;

    if (this.generation <= 20) {
      checkpointFrequency = 1; // Every generation for early training (critical phase)
    } else if (this.generation <= 100) {
      checkpointFrequency = 5; // Every 5 for medium training
    } else {
      checkpointFrequency = 10; // Every 10 for long runs
    }

    if (this.generation % checkpointFrequency === 0) {
      await this.saveCheckpoint();
    }
  }

  async saveCheckpoint() {
    const checkpointsDir = path.join(__dirname, "../checkpoints");
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }

    const checkpointData = {
      generation: this.generation,
      population: this.population.map(member => ({
        network: member.network.toJSON(),
        fitness: member.fitness,
        wins: member.wins,
        losses: member.losses,
        totalDamage: member.totalDamage,
        gamesPlayed: member.gamesPlayed,
      })),
      bestFitness: this.bestFitness,
      stats: this.stats,
      options: this.options,
    };

    const checkpointPath = path.join(checkpointsDir, `checkpoint-gen${this.generation}.json`);
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpointData, null, 2));
    console.log(`\n💾 Auto-checkpoint saved: Generation ${this.generation}`);

    // Keep only last 3 checkpoints
    this.cleanupOldCheckpoints(checkpointsDir);
  }

  cleanupOldCheckpoints(checkpointsDir) {
    const files = fs
      .readdirSync(checkpointsDir)
      .filter(f => f.startsWith("checkpoint-gen") && f.endsWith(".json"))
      .map(f => ({
        name: f,
        gen: parseInt(f.match(/checkpoint-gen(\d+)\.json/)?.[1] || "0"),
        path: path.join(checkpointsDir, f),
      }))
      .sort((a, b) => b.gen - a.gen);

    // Delete all but the 3 most recent
    files.slice(3).forEach(file => {
      fs.unlinkSync(file.path);
      console.log(`    🗑️  Removed old checkpoint: ${file.name}`);
    });
  }

  async exportFinalModels() {
    console.log("\n💾 Exporting final model...");

    // Export the best network as a single model
    const modelsToExport = [{ index: 0, name: "best-ai.json", desc: "Best AI from training" }];

    for (const model of modelsToExport) {
      await this.exportModel(this.population[model.index].network, model.name);
      console.log(`  ✅ ${model.name} - ${model.desc}`);
    }

    // Export training stats
    const statsPath = path.join(__dirname, "../models/training-stats.json");
    fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2));
    console.log(`  ✅ training-stats.json`);

    console.log(`\n✨ Model exported to ai/models/best-ai.json`);
  }

  async exportModel(network, filename) {
    const modelsDir = path.join(__dirname, "../models");
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const modelPath = path.join(modelsDir, filename);
    const networkJSON = network.toJSON();

    fs.writeFileSync(modelPath, JSON.stringify(networkJSON, null, 2));
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up...");
    // PHASE 2b: Close all worker browsers
    if (this.workers.length > 0) {
      console.log(`🔒 Closing ${this.workers.length} browser workers...`);
      for (const worker of this.workers) {
        await worker.close();
      }
    }
    // Close single browser if in single-worker mode
    if (this.gameRunner) {
      await this.gameRunner.close();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    populationSize: 50,
    generations: 10, // Start with 10 for testing
    gamesPerNetwork: 3,
    headless: args.includes("--headless"),
  };

  // PHASE 2.5: Parse resume checkpoint and baseline paths
  let resumeCheckpoint = null;
  let baselineCheckpoint = null;

  // Parse command line arguments
  args.forEach((arg, i) => {
    if (arg === "--generations" && args[i + 1]) {
      options.generations = parseInt(args[i + 1]);
    }
    if (arg === "--population" && args[i + 1]) {
      options.populationSize = parseInt(args[i + 1]);
    }
    if (arg === "--games" && args[i + 1]) {
      options.gamesPerNetwork = parseInt(args[i + 1]);
    }
    // PHASE 2.5: Resume from checkpoint
    if (arg === "--resume" && args[i + 1]) {
      resumeCheckpoint = args[i + 1];
    }
    // PHASE 2.5: Use baseline opponents
    if (arg === "--baseline" && args[i + 1]) {
      baselineCheckpoint = args[i + 1];
    }
    // PHASE 2b: Number of parallel workers
    if (arg === "--workers" && args[i + 1]) {
      options.workers = parseInt(args[i + 1]);
    }
  });

  console.log("\n🎮 Combat Crocs AI Trainer");
  console.log("Make sure the game is running on http://localhost:3001\n");
  console.log("Run 'npm run dev' from the src/ folder to start the game\n");

  const trainer = new AITrainer(options);

  try {
    // PHASE 2.5: Load checkpoint if resuming
    if (resumeCheckpoint) {
      const checkpointPath = path.join(__dirname, "../checkpoints", resumeCheckpoint);
      await trainer.loadFromCheckpoint(checkpointPath);
    }

    // PHASE 2.5: Load baseline opponents if specified
    if (baselineCheckpoint) {
      const baselinePath = path.join(__dirname, "../baselines", baselineCheckpoint);
      await trainer.loadBaseline(baselinePath);
    }

    await trainer.initialize();
    await trainer.train();
  } catch (error) {
    console.error("\n❌ Training failed:", error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default AITrainer;
