// PHASE 1: Learn ONE Thing - Don't Shoot Yourself
// 5 inputs, 1 output, ONLY self-damage penalty
// Curriculum learning: Master this before adding complexity

import neataptic from "neataptic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PHASE 1 CONFIG - Ultra-minimal
const PHASE1_CONFIG = {
  inputs: 5,
  outputs: 1,

  training: {
    populationSize: 5,
    gamesPerNetwork: 5, // Increased from 2 for better evaluation
    elitePercentage: 0.6, // Keep best 3 unchanged
    mutationRate: 0.05, // Gentle mutations
    generations: 5, // Enough to see trend
  },

  fitness: {
    selfDamageWeight: 10.0, // ONLY penalty (no rewards yet)
  },

  successCriteria: {
    targetSelfDamage: 15, // If we get below this, Phase 1 succeeds!
  },
};

class Phase1Trainer {
  constructor(options = {}) {
    this.options = {
      generations: options.generations || PHASE1_CONFIG.training.generations,
      headless: options.headless !== false,
      ...options,
    };

    this.population = [];
    this.generation = 0;
    this.gameRunner = null;
    this.logs = { generations: [] };
  }

  async initialize() {
    console.log("\n🎯 PHASE 1: LEARN TO AVOID SELF-DAMAGE");
    console.log("=".repeat(60));
    console.log("Goal: ONLY learn to not shoot yourself");
    console.log("Inputs: 5 (minimal - just safety info)");
    console.log("Fitness: -selfDamage * 10 (pure penalty, no rewards)");
    console.log("Evolution: Gentle (5% mutation, 60% elite)");
    console.log("Success: Self-damage < 15 per game");
    console.log("=".repeat(60) + "\n");

    this.gameRunner = new PuppeteerGameRunner({
      headless: this.options.headless,
      devServerUrl: "http://localhost:3001",
    });

    await this.gameRunner.initialize();
    await this.gameRunner.loadGame();
    await this.gameRunner.setGameSpeed(2.0);

    console.log("🌱 Creating population...");
    for (let i = 0; i < PHASE1_CONFIG.training.populationSize; i++) {
      const network = new neataptic.architect.Perceptron(PHASE1_CONFIG.inputs, 5, PHASE1_CONFIG.outputs);

      this.population.push({
        network,
        fitness: 0,
        selfDamage: 0,
        gamesPlayed: 0,
      });
    }
    console.log(`✅ Created ${this.population.length} networks\n`);
  }

  async train() {
    const startTime = Date.now();

    for (this.generation = 1; this.generation <= this.options.generations; this.generation++) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📊 GENERATION ${this.generation}/${this.options.generations}`);
      console.log("=".repeat(60));

      await this.evaluatePopulation();
      this.population.sort((a, b) => b.fitness - a.fitness);
      this.printStats();
      this.logGeneration();

      // Check success criteria
      const avgSelfDmg =
        this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
        this.population.length;

      if (avgSelfDmg < PHASE1_CONFIG.successCriteria.targetSelfDamage) {
        console.log(
          `\n🎉 SUCCESS! Average self-damage (${avgSelfDmg.toFixed(1)}) < ${
            PHASE1_CONFIG.successCriteria.targetSelfDamage
          }`,
        );
        console.log("🎓 Phase 1 Complete - Network learned to avoid self-damage!");
        console.log("🚀 Ready for Phase 2: Add enemy damage rewards");
        break;
      }

      if (this.generation < this.options.generations) {
        this.evolve();
      }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`\n✅ Training complete in ${duration} minutes!`);
    await this.saveResults();
  }

  async evaluatePopulation() {
    for (let i = 0; i < this.population.length; i++) {
      const member = this.population[i];
      member.fitness = 0;
      member.selfDamage = 0;
      member.gamesPlayed = 0;

      for (let game = 0; game < PHASE1_CONFIG.training.gamesPerNetwork; game++) {
        const opponent = this.population[Math.floor(Math.random() * this.population.length)];
        const network1Wrapper = this.createMinimalWrapper(member.network);
        const network2Wrapper = this.createMinimalWrapper(opponent.network);

        const result = await this.gameRunner.startNewGame(network1Wrapper, network2Wrapper, {
          mode: "1v1",
          map: "hotelOfHorror",
        });

        if (!result.error) {
          this.updateFitness(member, result);
        }
      }

      const avgSelf = member.gamesPlayed > 0 ? member.selfDamage / member.gamesPlayed : 0;
      console.log(`  Net ${i + 1}: Fitness ${member.fitness.toFixed(0)} | Self-damage ${avgSelf.toFixed(1)}`);
    }
  }

  createMinimalWrapper(network) {
    return {
      activate: complexState => {
        // Extract ONLY the 5 inputs needed to avoid self-damage
        const inputs = this.encodeMinimal(complexState);

        // Get network output
        const outputs = network.activate(inputs);

        // Decode to aim angle
        const aimAngle = outputs[0] * Math.PI * 2 - Math.PI;

        // Return in game runner format
        return [1, 0, 0.5, (aimAngle + Math.PI) / (Math.PI * 2), 0.8, 0.5];
      },
      toJSON: () => network.toJSON(),
    };
  }

  encodeMinimal(gameState) {
    const self = gameState.self || {};
    const enemies = gameState.enemies || [];
    const enemy = enemies[0] || {};

    // Calculate what we need
    const selfY = self.y || 350;
    const enemyAngle = enemy.angle !== undefined ? enemy.angle : 0;
    const distance = enemy.distance || 500;

    // Calculate ballistics
    const selfX = self.x || 600;
    const enemyX = enemy.x || 600;
    const enemyY = enemy.y || 350;
    const dx = enemyX - selfX;
    const dy = enemyY - selfY;
    const angleToEnemy = Math.atan2(dy, dx);
    const distCompensation = (distance / 1000) * 0.3;
    const optimalAngle = angleToEnemy + distCompensation;

    // 5 CRITICAL INPUTS for avoiding self-damage:
    return [
      // 1. How close to ground? (low = danger)
      Math.min(selfY / 700, 1),

      // 2. Distance to terrain below (closer = more danger)
      Math.min((selfY < 350 ? selfY : 350 - selfY) / 200, 1),

      // 3. Current aim angle (where network is pointing)
      (enemyAngle + Math.PI) / (Math.PI * 2),

      // 4. Optimal angle to hit enemy (where network SHOULD point)
      (optimalAngle + Math.PI) / (Math.PI * 2),

      // 5. How far off optimal? (big difference = potential problem)
      Math.abs(enemyAngle - optimalAngle) / Math.PI,
    ];
  }

  updateFitness(member, gameResult) {
    if (!gameResult.stats?.teams) return;

    const team = 1;
    const teamStats = gameResult.stats.teams[team];
    if (!teamStats) return;

    member.gamesPlayed++;

    // Calculate self damage
    const initialHealth = gameResult.stats.initialHealth;
    let selfDamage = 0;

    if (initialHealth?.[team]) {
      const myInitial = initialHealth[team].totalHealth;
      const myFinal = teamStats.totalHealth;
      const totalLost = Math.max(0, myInitial - myFinal);

      // Estimate self-damage (rough but sufficient for Phase 1)
      const enemyTeam = 2;
      let enemyDamageDealt = 0;
      if (initialHealth?.[enemyTeam] && gameResult.stats.teams[enemyTeam]) {
        const enemyInitial = initialHealth[enemyTeam].totalHealth;
        const enemyFinal = gameResult.stats.teams[enemyTeam].totalHealth;
        enemyDamageDealt = Math.max(0, enemyInitial - enemyFinal);
      }

      const estimatedEnemyDmgToMe = enemyDamageDealt > 0 ? Math.min(totalLost, enemyDamageDealt * 0.5) : 0;
      selfDamage = Math.max(0, totalLost - estimatedEnemyDmgToMe);
    }

    member.selfDamage += selfDamage;

    // PHASE 1 FITNESS: Only penalty for self-damage
    // No rewards yet - just learn to minimize this ONE metric
    member.fitness -= selfDamage * PHASE1_CONFIG.fitness.selfDamageWeight;
  }

  evolve() {
    const eliteCount = Math.floor(this.population.length * PHASE1_CONFIG.training.elitePercentage);
    const newPop = [];

    // Keep elite UNCHANGED (no mutations)
    for (let i = 0; i < eliteCount; i++) {
      newPop.push({
        network: neataptic.Network.fromJSON(this.population[i].network.toJSON()),
        fitness: 0,
        selfDamage: 0,
        gamesPlayed: 0,
      });
    }

    // Breed rest with GENTLE mutations
    while (newPop.length < this.population.length) {
      const parent = this.tournamentSelect();
      const offspring = neataptic.Network.fromJSON(parent.network.toJSON());

      // Only mutate with low probability
      if (Math.random() < PHASE1_CONFIG.training.mutationRate) {
        offspring.mutate(neataptic.methods.mutation.MOD_WEIGHT);
      }

      newPop.push({
        network: offspring,
        fitness: 0,
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

    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
      this.population.length;

    console.log(`\n📈 Gen ${this.generation}:`);
    console.log(`  Best Fitness: ${best.toFixed(0)} | Avg: ${avg.toFixed(0)} | Worst: ${worst.toFixed(0)}`);
    console.log(`  Avg Self-Damage: ${avgSelfDmg.toFixed(1)} per game`);

    if (this.generation > 1) {
      const lastGen = this.logs.generations[this.logs.generations.length - 1];
      const change = avgSelfDmg - lastGen.avgSelfDamage;

      if (change < -2) {
        console.log(`  ✅ IMPROVING! Self-damage reduced by ${Math.abs(change).toFixed(1)}`);
      } else if (change > 2) {
        console.log(`  ⚠️  Regression: Self-damage increased by ${change.toFixed(1)}`);
      } else {
        console.log(`  → Stable: Change ${change.toFixed(1)}`);
      }
    }
  }

  logGeneration() {
    const fitnesses = this.population.map(m => m.fitness);
    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
      this.population.length;

    this.logs.generations.push({
      generation: this.generation,
      bestFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      avgSelfDamage: avgSelfDmg,
    });
  }

  async saveResults() {
    const logsDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logPath = path.join(logsDir, `phase1-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.logs, null, 2));
    console.log(`\n💾 Logs: ${logPath}`);

    const modelPath = path.join(logsDir.replace("logs", "models"), "phase1-best.json");
    fs.writeFileSync(modelPath, JSON.stringify(this.population[0].network.toJSON(), null, 2));
    console.log(`💾 Model: ${modelPath}`);
  }

  async cleanup() {
    if (this.gameRunner) await this.gameRunner.close();
  }
}

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

  const trainer = new Phase1Trainer(options);

  try {
    await trainer.initialize();
    await trainer.train();
  } catch (error) {
    console.error("\n❌ Failed:", error);
    console.error(error.stack);
  } finally {
    await trainer.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default Phase1Trainer;
