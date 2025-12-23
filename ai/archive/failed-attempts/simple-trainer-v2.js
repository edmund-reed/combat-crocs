// Minimal AI Trainer V2 - Using Working PuppeteerGameRunner
// 10 inputs, 1 output, simple fitness, comprehensive logging

import neataptic from "neataptic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import { SIMPLE_CONFIG, encodeSimpleGameState, decodeSimpleOutput } from "./simple-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleTrainerV2 {
  constructor(options = {}) {
    this.options = {
      generations: options.generations || 5,
      headless: options.headless !== false,
      ...options,
    };

    this.population = [];
    this.generation = 0;
    this.gameRunner = null;

    this.logs = {
      generations: [],
    };
  }

  async initialize() {
    console.log("\n🎮 MINIMAL AI TRAINER V2 - USING WORKING GAME RUNNER");
    console.log("=".repeat(60));
    console.log("Goal: Prove the AI can learn basic gameplay");
    console.log("Inputs: 10 (simplified from 66)");
    console.log("Outputs: 1 (aim angle only)");
    console.log("Using: Working PuppeteerGameRunner");
    console.log("=".repeat(60) + "\n");

    // Initialize game runner
    console.log("🚀 Initializing game runner...");
    this.gameRunner = new PuppeteerGameRunner({
      headless: this.options.headless,
      devServerUrl: "http://localhost:3001",
    });

    await this.gameRunner.initialize();
    await this.gameRunner.loadGame();
    await this.gameRunner.setGameSpeed(2.0);
    console.log("✅ Game runner ready\n");

    // Create population
    console.log("🌱 Creating population...");
    this.createPopulation();
    console.log(`✅ Created ${this.population.length} networks\n`);
  }

  createPopulation() {
    for (let i = 0; i < SIMPLE_CONFIG.training.populationSize; i++) {
      const network = new neataptic.architect.Perceptron(
        SIMPLE_CONFIG.inputs,
        Math.floor(SIMPLE_CONFIG.inputs * 0.5), // 5 hidden
        SIMPLE_CONFIG.outputs,
      );

      this.population.push({
        network,
        fitness: 0,
        wins: 0,
        losses: 0,
        damageDealt: 0,
        selfDamage: 0,
        gamesPlayed: 0,
      });
    }
  }

  async train() {
    for (this.generation = 1; this.generation <= this.options.generations; this.generation++) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📊 GENERATION ${this.generation}/${this.options.generations}`);
      console.log("=".repeat(60));

      await this.evaluatePopulation();

      this.population.sort((a, b) => b.fitness - a.fitness);

      this.printStats();
      this.logGeneration();

      if (this.generation < this.options.generations) {
        this.evolve();
      }
    }

    console.log("\n✅ Training complete!");
    await this.saveResults();
  }

  async evaluatePopulation() {
    for (let i = 0; i < this.population.length; i++) {
      const member = this.population[i];

      // Reset
      member.fitness = 0;
      member.wins = 0;
      member.losses = 0;
      member.damageDealt = 0;
      member.selfDamage = 0;
      member.gamesPlayed = 0;

      // Play games
      for (let game = 0; game < SIMPLE_CONFIG.training.gamesPerNetwork; game++) {
        // Create simple opponent
        const opponent = this.population[Math.floor(Math.random() * this.population.length)];

        // Wrap networks for game runner
        const network1Wrapper = this.createNetworkWrapper(member.network);
        const network2Wrapper = this.createNetworkWrapper(opponent.network);

        // Play game
        const result = await this.gameRunner.startNewGame(network1Wrapper, network2Wrapper, {
          mode: "1v1",
          map: "hotelOfHorror",
        });

        if (result.error) {
          console.log(`  ⚠️  Network ${i + 1} Game ${game + 1} error: ${result.error}`);
          continue;
        }

        // Calculate fitness
        this.updateFitness(member, result);
      }

      const avgSelfDmg = member.gamesPlayed > 0 ? member.selfDamage / member.gamesPlayed : 0;

      console.log(
        `  Network ${i + 1}/${this.population.length}: ` +
          `Fitness ${member.fitness.toFixed(0)} | ` +
          `W/L ${member.wins}/${member.losses} | ` +
          `Dmg ${member.damageDealt.toFixed(0)} | ` +
          `Self ${avgSelfDmg.toFixed(1)}`,
      );
    }
  }

  createNetworkWrapper(network) {
    // Wrapper that adapts complex game state to simple 10 inputs
    return {
      activate: gameState => {
        // Simplify game state to 10 inputs
        const simpleState = this.simplifyGameState(gameState);

        // Encode to 10 values
        const inputs = encodeSimpleGameState(simpleState);

        // Get network output
        const outputs = network.activate(inputs);

        // Decode to aim angle
        const decision = decodeSimpleOutput(outputs[0]);

        // Return in format expected by game runner
        // Game runner expects 6 outputs: [target0, target1, weapon, angle, power, movement]
        return [
          1, // target enemy 0
          0, // don't target enemy 1
          0.5, // bazooka (0-0.33)
          (decision.aimAngle + Math.PI) / (Math.PI * 2), // convert back to 0-1
          0.8, // power
          0.5, // no movement
        ];
      },
      toJSON: () => network.toJSON(),
    };
  }

  simplifyGameState(complexState) {
    // Convert complex 66-input state to simple 10-input state
    const self = complexState.self || {};
    const enemies = complexState.enemies || [];
    const enemy = enemies[0] || {};
    const weapons = complexState.weapons || {};
    const feedback = complexState.shotFeedback || {};

    return {
      self: {
        health: self.health || 100,
        x: self.x || 600,
        y: self.y || 350,
      },
      enemies: [
        {
          health: enemy.health || 100,
          x: enemy.x || 600,
          y: enemy.y || 350,
          distance: enemy.distance || 500,
          angle: enemy.angle || 0,
        },
      ],
      weapons: {
        ammo: {
          BAZOOKA: weapons.ammo?.BAZOOKA || 5,
        },
      },
      lastShotHitSelf: feedback.didDamageSelf || false,
    };
  }

  updateFitness(member, gameResult) {
    if (!gameResult.stats || !gameResult.stats.teams) return;

    const team = 1;
    const enemyTeam = 2;
    const teamStats = gameResult.stats.teams[team];
    if (!teamStats) return;

    // Win/loss
    const won = gameResult.winner === team;
    if (won) member.wins++;
    else member.losses++;

    member.gamesPlayed++;

    // Damage dealt
    const initialHealth = gameResult.stats.initialHealth;
    let damageDealt = 0;
    if (initialHealth && initialHealth[enemyTeam] && gameResult.stats.teams[enemyTeam]) {
      const enemyInitialHealth = initialHealth[enemyTeam].totalHealth;
      const enemyFinalHealth = gameResult.stats.teams[enemyTeam].totalHealth;
      damageDealt = Math.max(0, enemyInitialHealth - enemyFinalHealth);
    }
    member.damageDealt += damageDealt;

    // Self damage
    let selfDamage = 0;
    if (initialHealth && initialHealth[team]) {
      const myInitialHealth = initialHealth[team].totalHealth;
      const myFinalHealth = teamStats.totalHealth;
      const totalHealthLost = Math.max(0, myInitialHealth - myFinalHealth);

      // Rough estimate: assume half of health lost is from enemy, rest is self-damage
      const estimatedEnemyDamage = damageDealt > 0 ? Math.min(totalHealthLost, damageDealt * 0.5) : 0;
      selfDamage = Math.max(0, totalHealthLost - estimatedEnemyDamage);
    }
    member.selfDamage += selfDamage;

    // Calculate fitness (SIMPLE)
    let fitness = 0;

    // Win bonus
    if (won) {
      fitness += SIMPLE_CONFIG.fitness.winBonus;
    }

    // Damage dealt
    fitness += damageDealt * SIMPLE_CONFIG.fitness.damageDealtWeight;

    // Self damage penalty (HARSH)
    fitness -= selfDamage * SIMPLE_CONFIG.fitness.selfDamageWeight;

    member.fitness += fitness;
  }

  evolve() {
    const eliteCount = Math.floor(this.population.length * SIMPLE_CONFIG.training.elitePercentage);
    const newPop = [];

    // Keep elite
    for (let i = 0; i < eliteCount; i++) {
      newPop.push({
        network: neataptic.Network.fromJSON(this.population[i].network.toJSON()),
        fitness: 0,
        wins: 0,
        losses: 0,
        damageDealt: 0,
        selfDamage: 0,
        gamesPlayed: 0,
      });
    }

    // Breed rest
    while (newPop.length < this.population.length) {
      const parent = this.tournamentSelect();
      const offspring = neataptic.Network.fromJSON(parent.network.toJSON());

      // Mutate
      if (Math.random() < SIMPLE_CONFIG.training.mutationRate) {
        offspring.mutate(neataptic.methods.mutation.MOD_WEIGHT);
      }
      if (Math.random() < SIMPLE_CONFIG.training.mutationRate * 0.5) {
        offspring.mutate(neataptic.methods.mutation.MOD_BIAS);
      }

      newPop.push({
        network: offspring,
        fitness: 0,
        wins: 0,
        losses: 0,
        damageDealt: 0,
        selfDamage: 0,
        gamesPlayed: 0,
      });
    }

    this.population = newPop;
  }

  tournamentSelect() {
    const tournament = [];
    for (let i = 0; i < 3; i++) {
      tournament.push(this.population[Math.floor(Math.random() * this.population.length)]);
    }
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
  }

  printStats() {
    const fitnesses = this.population.map(m => m.fitness);
    const best = Math.max(...fitnesses);
    const avg = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const worst = Math.min(...fitnesses);

    const totalWins = this.population.reduce((sum, m) => sum + m.wins, 0);
    const totalGames = this.population.reduce((sum, m) => sum + m.gamesPlayed, 0);
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
      this.population.length;

    const avgDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.damageDealt / m.gamesPlayed : 0), 0) /
      this.population.length;

    console.log(`\n📈 Generation ${this.generation} Summary:`);
    console.log(`  Best Fitness:     ${best.toFixed(0)}`);
    console.log(`  Average Fitness:  ${avg.toFixed(0)}`);
    console.log(`  Worst Fitness:    ${worst.toFixed(0)}`);
    console.log(`  Win Rate:         ${winRate.toFixed(1)}%`);
    console.log(`  Avg Damage:       ${avgDmg.toFixed(1)} per game`);
    console.log(`  Avg Self-Damage:  ${avgSelfDmg.toFixed(1)} per game`);

    // Learning indicator
    if (this.generation > 1) {
      const lastGen = this.logs.generations[this.logs.generations.length - 1];
      const selfDmgChange = avgSelfDmg - lastGen.avgSelfDamage;
      const dmgChange = avgDmg - lastGen.avgDamage;

      if (selfDmgChange < -5) {
        console.log(`  ✅ Learning! Self-damage reduced by ${Math.abs(selfDmgChange).toFixed(1)}`);
      } else if (selfDmgChange > 5) {
        console.log(`  ⚠️  Self-damage increased by ${selfDmgChange.toFixed(1)}`);
      }

      if (dmgChange > 10) {
        console.log(`  ✅ Improving! Damage increased by ${dmgChange.toFixed(1)}`);
      }
    }
  }

  logGeneration() {
    const fitnesses = this.population.map(m => m.fitness);
    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
      this.population.length;
    const avgDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.damageDealt / m.gamesPlayed : 0), 0) /
      this.population.length;

    this.logs.generations.push({
      generation: this.generation,
      bestFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      worstFitness: Math.min(...fitnesses),
      avgSelfDamage: avgSelfDmg,
      avgDamage: avgDmg,
    });
  }

  async saveResults() {
    const logsDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logPath = path.join(logsDir, `simple-v2-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.logs, null, 2));
    console.log(`\n💾 Logs saved: ${logPath}`);

    const modelsDir = path.join(__dirname, "../models");
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const modelPath = path.join(modelsDir, "simple-v2-best.json");
    fs.writeFileSync(modelPath, JSON.stringify(this.population[0].network.toJSON(), null, 2));
    console.log(`💾 Best network saved: ${modelPath}`);
  }

  async cleanup() {
    if (this.gameRunner) {
      await this.gameRunner.close();
    }
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = {
    generations: 5,
    headless: args.includes("--headless"),
  };

  args.forEach((arg, i) => {
    if (arg === "--generations" && args[i + 1]) {
      options.generations = parseInt(args[i + 1]);
    }
  });

  const trainer = new SimpleTrainerV2(options);

  try {
    await trainer.initialize();
    await trainer.train();
  } catch (error) {
    console.error("\n❌ Training failed:", error);
    console.error(error.stack);
  } finally {
    await trainer.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default SimpleTrainerV2;
