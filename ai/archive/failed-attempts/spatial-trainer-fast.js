// Fast Spatial Trainer - 15 minute test
// 20 inputs (spatial aware), 5 networks, 3 generations = 30 games

import neataptic from "neataptic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import {
  SPATIAL_CONFIG,
  encodeSpatialGameState,
  decodeSpatialOutput,
  calculateSpatialAwareness,
  calculateBallistics,
  validateSpatialInputs,
} from "./spatial-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SpatialTrainerFast {
  constructor(options = {}) {
    this.options = {
      generations: options.generations || SPATIAL_CONFIG.training.generations,
      headless: options.headless !== false,
      ...options,
    };

    this.population = [];
    this.generation = 0;
    this.gameRunner = null;
    this.logs = { generations: [] };
  }

  async initialize() {
    console.log("\n🚀 COMPLETE SPATIAL + BALLISTICS TRAINER");
    console.log("=".repeat(60));
    console.log("Inputs: 25 (10 basic + 10 spatial + 5 ballistics)");
    console.log("Networks: 5 | Games: 2 each | Generations: 3");
    console.log("Total games: 30 (~15 minutes)");
    console.log("Goal: AI learns BOTH where to aim AND how to avoid self-damage");
    console.log("=".repeat(60) + "\n");

    this.gameRunner = new PuppeteerGameRunner({
      headless: this.options.headless,
      devServerUrl: "http://localhost:3001",
    });

    await this.gameRunner.initialize();
    await this.gameRunner.loadGame();
    await this.gameRunner.setGameSpeed(2.0);

    console.log("🌱 Creating population...");
    for (let i = 0; i < SPATIAL_CONFIG.training.populationSize; i++) {
      const network = new neataptic.architect.Perceptron(
        SPATIAL_CONFIG.inputs,
        10, // 10 hidden nodes
        SPATIAL_CONFIG.outputs,
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
      member.wins = 0;
      member.losses = 0;
      member.damageDealt = 0;
      member.selfDamage = 0;
      member.gamesPlayed = 0;

      for (let game = 0; game < SPATIAL_CONFIG.training.gamesPerNetwork; game++) {
        const opponent = this.population[Math.floor(Math.random() * this.population.length)];
        const network1Wrapper = this.createSpatialWrapper(member.network);
        const network2Wrapper = this.createSpatialWrapper(opponent.network);

        const result = await this.gameRunner.startNewGame(network1Wrapper, network2Wrapper, {
          mode: "1v1",
          map: "hotelOfHorror",
        });

        if (!result.error) {
          this.updateFitness(member, result);
        }
      }

      const avgSelf = member.gamesPlayed > 0 ? member.selfDamage / member.gamesPlayed : 0;
      console.log(
        `  Net ${i + 1}: Fit ${member.fitness.toFixed(0)} | W/L ${member.wins}/${member.losses} | ` +
          `Dmg ${(member.damageDealt / member.gamesPlayed).toFixed(1)} | Self ${avgSelf.toFixed(1)}`,
      );
    }
  }

  createSpatialWrapper(network) {
    return {
      activate: complexState => {
        // Add spatial awareness and ballistics to state
        const spatial = calculateSpatialAwareness(complexState);
        const ballistics = calculateBallistics(complexState);
        const enhancedState = { ...complexState, spatial, ballistics };

        // Simplify to spatial format
        const simpleState = this.simplifyToSpatialState(enhancedState);

        // Encode to 25 inputs
        const inputs = encodeSpatialGameState(simpleState);

        if (!validateSpatialInputs(inputs)) {
          console.warn("Invalid spatial inputs, using defaults");
        }

        // Get network output
        const outputs = network.activate(inputs);
        const decision = decodeSpatialOutput(outputs[0]);

        // Return in game runner format
        return [
          1, // target enemy 0
          0,
          0.5, // bazooka
          (decision.aimAngle + Math.PI) / (Math.PI * 2),
          0.8,
          0.5,
        ];
      },
      toJSON: () => network.toJSON(),
    };
  }

  simplifyToSpatialState(complexState) {
    const self = complexState.self || {};
    const enemies = complexState.enemies || [];
    const enemy = enemies[0] || {};
    const weapons = complexState.weapons || {};
    const feedback = complexState.shotFeedback || {};
    const spatial = complexState.spatial || {};
    const ballistics = complexState.ballistics || {};

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
      spatial, // Pass through spatial data
      ballistics, // Pass through ballistics data
    };
  }

  updateFitness(member, gameResult) {
    if (!gameResult.stats?.teams) return;

    const team = 1;
    const teamStats = gameResult.stats.teams[team];
    if (!teamStats) return;

    const won = gameResult.winner === team;
    if (won) member.wins++;
    else member.losses++;
    member.gamesPlayed++;

    // Damage dealt
    const enemyTeam = 2;
    const initialHealth = gameResult.stats.initialHealth;
    let damageDealt = 0;
    if (initialHealth?.[enemyTeam] && gameResult.stats.teams[enemyTeam]) {
      const enemyInitial = initialHealth[enemyTeam].totalHealth;
      const enemyFinal = gameResult.stats.teams[enemyTeam].totalHealth;
      damageDealt = Math.max(0, enemyInitial - enemyFinal);
    }
    member.damageDealt += damageDealt;

    // Self damage (estimated)
    let selfDamage = 0;
    if (initialHealth?.[team]) {
      const myInitial = initialHealth[team].totalHealth;
      const myFinal = teamStats.totalHealth;
      const totalLost = Math.max(0, myInitial - myFinal);
      const estimatedEnemyDmg = damageDealt > 0 ? Math.min(totalLost, damageDealt * 0.5) : 0;
      selfDamage = Math.max(0, totalLost - estimatedEnemyDmg);
    }
    member.selfDamage += selfDamage;

    // Calculate fitness with binary bonuses
    let fitness = 0;

    // Base rewards/penalties
    if (won) fitness += SPATIAL_CONFIG.fitness.winBonus;
    fitness += damageDealt * SPATIAL_CONFIG.fitness.damageDealtWeight;
    fitness -= selfDamage * SPATIAL_CONFIG.fitness.selfDamageWeight;

    // Binary bonuses (NEW)
    if (selfDamage > 0) {
      fitness -= SPATIAL_CONFIG.fitness.anySelfDamagePenalty; // -40 for ANY self-damage
    }
    if (selfDamage === 0 && damageDealt > 0) {
      fitness += SPATIAL_CONFIG.fitness.safeShotBonus; // +20 for safe productive shot
    }

    member.fitness += fitness;
  }

  evolve() {
    const eliteCount = Math.floor(this.population.length * SPATIAL_CONFIG.training.elitePercentage);
    const newPop = [];

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

    while (newPop.length < this.population.length) {
      const parent = this.tournamentSelect();
      const offspring = neataptic.Network.fromJSON(parent.network.toJSON());

      if (Math.random() < SPATIAL_CONFIG.training.mutationRate) {
        offspring.mutate(neataptic.methods.mutation.MOD_WEIGHT);
      }
      if (Math.random() < SPATIAL_CONFIG.training.mutationRate * 0.5) {
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

    const totalWins = this.population.reduce((sum, m) => sum + m.wins, 0);
    const totalGames = this.population.reduce((sum, m) => sum + m.gamesPlayed, 0);
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
      this.population.length;

    const avgDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.damageDealt / m.gamesPlayed : 0), 0) /
      this.population.length;

    console.log(`\n📈 Gen ${this.generation}:`);
    console.log(`  Best Fit: ${best.toFixed(0)} | Avg Fit: ${avg.toFixed(0)}`);
    console.log(
      `  Win Rate: ${winRate.toFixed(1)}% | Avg Dmg: ${avgDmg.toFixed(1)} | Avg Self: ${avgSelfDmg.toFixed(
        1,
      )}`,
    );

    if (this.generation > 1) {
      const lastGen = this.logs.generations[this.logs.generations.length - 1];
      const selfChange = avgSelfDmg - lastGen.avgSelfDamage;

      if (selfChange < -3) {
        console.log(`  ✅ LEARNING! Self-damage reduced by ${Math.abs(selfChange).toFixed(1)}`);
      } else if (selfChange > 3) {
        console.log(`  ⚠️  Regression: Self-damage increased by ${selfChange.toFixed(1)}`);
      } else {
        console.log(`  → Stable: Self-damage change ${selfChange.toFixed(1)}`);
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

    const logPath = path.join(logsDir, `spatial-fast-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.logs, null, 2));
    console.log(`\n💾 Logs: ${logPath}`);

    const modelPath = path.join(logsDir.replace("logs", "models"), "spatial-fast-best.json");
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
    generations: 3,
    headless: args.includes("--headless"),
  };

  args.forEach((arg, i) => {
    if (arg === "--generations" && args[i + 1]) {
      options.generations = parseInt(args[i + 1]);
    }
  });

  const trainer = new SpatialTrainerFast(options);

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

export default SpatialTrainerFast;
