// Main AI Training System using Neuroevolution
// Uses Puppeteer to run games and evolve neural networks

import { Architect, Network } from "neataptic";
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

    // Create initial population
    console.log("🌱 Creating initial population...");
    this.createInitialPopulation();
    console.log(`✅ Created ${this.population.length} random networks\n`);
  }

  createInitialPopulation() {
    this.population = [];
    for (let i = 0; i < this.options.populationSize; i++) {
      // Create a simple feedforward network
      const network = new Architect.Perceptron(
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
        // Pick a random opponent
        const opponentIndex = Math.floor(Math.random() * this.population.length);
        const opponent = this.population[opponentIndex];

        // Play game
        const result = await this.playGame(member.network, opponent.network, i, opponentIndex);

        // Update fitness based on result
        if (result.error) {
          console.log(`    ⚠️  Game ${game + 1} error: ${result.error}`);
          continue;
        }

        this.updateFitness(member, result, 1); // Team 1
        this.updateFitness(opponent, result, 2); // Team 2

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
    // For now, we'll use a simple wrapper that uses the game runner
    // In the future, this will inject the actual networks into the game
    try {
      const result = await this.gameRunner.startNewGame(network1, network2, {
        mode: "1v1",
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

    // Damage dealt (estimated from remaining health)
    const maxHealth = 100; // Placeholder
    const healthRemaining = teamStats.totalHealth;
    const damageTaken = maxHealth - healthRemaining;
    const damageDealt = 100 - damageTaken; // Rough estimate

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
        network: Network.fromJSON(this.population[i].network.toJSON()),
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
        offspring = Network.crossOver(parent1.network, parent2.network);
      } else {
        // Clone and mutate
        offspring = Network.fromJSON(parent1.network.toJSON());
      }

      // Mutate
      offspring.mutate(Network.mutation.ADD_NODE);
      offspring.mutate(Network.mutation.SUB_NODE);
      offspring.mutate(Network.mutation.ADD_CONN);
      offspring.mutate(Network.mutation.SUB_CONN);
      offspring.mutate(Network.mutation.MOD_WEIGHT);
      offspring.mutate(Network.mutation.MOD_BIAS);
      offspring.mutate(Network.mutation.MOD_ACTIVATION);

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
    const checkpoints = [
      { gen: NETWORK_CONFIG.training.easyAI, name: "easy" },
      { gen: NETWORK_CONFIG.training.mediumAI, name: "medium" },
      { gen: NETWORK_CONFIG.training.hardAI, name: "hard" },
    ];

    for (const checkpoint of checkpoints) {
      if (this.generation === checkpoint.gen) {
        await this.exportModel(this.population[0].network, `${checkpoint.name}-ai.json`);
        console.log(`\n💾 Checkpoint: Exported ${checkpoint.name} AI model`);
      }
    }
  }

  async exportFinalModels() {
    console.log("\n💾 Exporting final models...");

    // Export best models at different difficulty levels
    const modelsToExport = [
      { index: 0, name: "nightmare-ai.json", desc: "Best overall" },
      { index: Math.floor(this.population.length * 0.2), name: "hard-ai.json", desc: "Top 20%" },
      { index: Math.floor(this.population.length * 0.5), name: "medium-ai.json", desc: "Top 50%" },
      { index: Math.floor(this.population.length * 0.8), name: "easy-ai.json", desc: "Top 80%" },
    ];

    for (const model of modelsToExport) {
      await this.exportModel(this.population[model.index].network, model.name);
      console.log(`  ✅ ${model.name} - ${model.desc}`);
    }

    // Export training stats
    const statsPath = path.join(__dirname, "../models/training-stats.json");
    fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2));
    console.log(`  ✅ training-stats.json`);

    console.log(`\n✨ All models exported to ai/models/`);
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
