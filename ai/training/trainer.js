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
  }

  async initialize() {
    console.log("\n🧬 Combat Crocs AI Training System");
    console.log("=".repeat(50));
    console.log(`Population Size: ${this.options.populationSize}`);
    console.log(`Target Generations: ${this.options.generations}`);
    console.log(`Games per Network: ${this.options.gamesPerNetwork}`);
    console.log(`Elite Percentage: ${this.options.elitePercentage * 100}%`);
    console.log("=".repeat(50) + "\n");

    // Initialize Puppeteer game runner
    this.gameRunner = new PuppeteerGameRunner({
      headless: this.options.headless,
      devServerUrl: "http://localhost:3001",
    });

    await this.gameRunner.initialize();
    await this.gameRunner.loadGame();

    // Set game speed to 2x for faster training
    await this.gameRunner.setGameSpeed(2.0);

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

    try {
      for (this.generation = 1; this.generation <= this.options.generations; this.generation++) {
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

    // Each network plays multiple games
    for (let i = 0; i < this.population.length; i++) {
      const member = this.population[i];
      console.log(`  Network ${i + 1}/${this.population.length}:`);

      for (let game = 0; game < this.options.gamesPerNetwork; game++) {
        // Pick a random opponent (excluding self)
        let opponentIndex;
        do {
          opponentIndex = Math.floor(Math.random() * this.population.length);
        } while (opponentIndex === i);

        const opponent = this.population[opponentIndex];

        // Restart browser every 20 games to prevent memory leaks
        const gamesCompleted =
          (this.generation - 1) * this.options.populationSize * this.options.gamesPerNetwork +
          i * this.options.gamesPerNetwork +
          game +
          1;

        if (gamesCompleted % 20 === 0) {
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

    // Win bonus
    if (won) {
      fitness += NETWORK_CONFIG.fitness.winBonus;
      member.wins++;
    } else {
      member.losses++;
    }

    // Survival time
    fitness += survivalTime * NETWORK_CONFIG.fitness.survivalWeight;

    // FIXED: Calculate actual damage dealt to enemies
    // Damage dealt = enemy's initial health - enemy's final health
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

    this.stats.generations.push(this.generation);
    this.stats.bestFitness.push(maxFitness);
    this.stats.avgFitness.push(avgFitness);
  }

  async exportCheckpoints() {
    // Save auto-checkpoint every 5 generations
    if (this.generation % 5 === 0) {
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
  });

  console.log("\n🎮 Combat Crocs AI Trainer");
  console.log("Make sure the game is running on http://localhost:3001\n");
  console.log("Run 'npm run dev' from the src/ folder to start the game\n");

  const trainer = new AITrainer(options);

  try {
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
