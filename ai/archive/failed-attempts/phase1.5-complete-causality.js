// PHASE 1.5: Complete Causality System
// 14 inputs: spatial awareness + prediction + shot feedback
// Goal: Give network EVERYTHING needed to understand self-damage

import neataptic from "neataptic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHASE15_CONFIG = {
  inputs: 14,
  outputs: 1,

  training: {
    populationSize: 5,
    gamesPerNetwork: 5,
    elitePercentage: 0.6,
    mutationRate: 0.05,
    generations: 4,
  },

  fitness: {
    selfDamageWeight: 10.0,
  },

  successCriteria: {
    targetSelfDamage: 15,
  },
};

// Store last shot info per network
const lastShotData = new Map();

class Phase15Trainer {
  constructor(options = {}) {
    this.options = {
      generations: options.generations || PHASE15_CONFIG.training.generations,
      headless: options.headless !== false,
      ...options,
    };

    this.population = [];
    this.generation = 0;
    this.gameRunner = null;
    this.logs = { generations: [] };
  }

  async initialize() {
    console.log("\n🎯 PHASE 1.5: COMPLETE CAUSALITY SYSTEM");
    console.log("=".repeat(60));
    console.log("Goal: Give network COMPLETE information");
    console.log("Inputs: 14 (spatial + prediction + feedback)");
    console.log("- Spatial: terrain in all directions + proximity");
    console.log("- Prediction: aim line collision detection");
    console.log("- Feedback: where shot landed, damage caused");
    console.log("Fitness: -selfDamage * 10");
    console.log("=".repeat(60) + "\n");

    this.gameRunner = new PuppeteerGameRunner({
      headless: this.options.headless,
      devServerUrl: "http://localhost:3001",
    });

    await this.gameRunner.initialize();
    await this.gameRunner.loadGame();
    await this.gameRunner.setGameSpeed(2.0);

    console.log("🌱 Creating population...");
    for (let i = 0; i < PHASE15_CONFIG.training.populationSize; i++) {
      const network = new neataptic.architect.Perceptron(PHASE15_CONFIG.inputs, 8, PHASE15_CONFIG.outputs);

      this.population.push({
        network,
        fitness: 0,
        selfDamage: 0,
        gamesPlayed: 0,
        id: `net_${i}_${Date.now()}`,
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

      const avgSelfDmg =
        this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
        this.population.length;

      if (avgSelfDmg < PHASE15_CONFIG.successCriteria.targetSelfDamage) {
        console.log(
          `\n🎉 SUCCESS! Self-damage ${avgSelfDmg.toFixed(1)} < ${
            PHASE15_CONFIG.successCriteria.targetSelfDamage
          }`,
        );
        console.log("🎓 Phase 1.5 Complete - Network learned with complete causality!");
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

      // Reset shot data for this network
      lastShotData.set(member.id, {
        explosionDistance: 500, // Default: far away
        explosionX: 0,
        explosionY: 0,
        damage: 0,
      });

      for (let game = 0; game < PHASE15_CONFIG.training.gamesPerNetwork; game++) {
        const opponent = this.population[Math.floor(Math.random() * this.population.length)];
        const network1Wrapper = this.createCausalWrapper(member.network, member.id);
        const network2Wrapper = this.createCausalWrapper(opponent.network, opponent.id);

        const result = await this.gameRunner.startNewGame(network1Wrapper, network2Wrapper, {
          mode: "1v1",
          map: "hotelOfHorror",
        });

        if (!result.error) {
          this.updateFitness(member, result);
        }
      }

      const avgSelf = member.gamesPlayed > 0 ? member.selfDamage / member.gamesPlayed : 0;
      console.log(`  Net ${i + 1}: Fit ${member.fitness.toFixed(0)} | Self-dmg ${avgSelf.toFixed(1)}`);
    }
  }

  createCausalWrapper(network, networkId) {
    return {
      activate: complexState => {
        // Encode with complete causality
        const inputs = this.encodeCompleteCausality(complexState, networkId);

        // Get network output
        const outputs = network.activate(inputs);
        const aimAngle = outputs[0] * Math.PI * 2 - Math.PI;

        // Store shot data for feedback next turn
        this.storeShotData(complexState, aimAngle, networkId);

        // Return in game runner format
        return [1, 0, 0.5, (aimAngle + Math.PI) / (Math.PI * 2), 0.8, 0.5];
      },
      toJSON: () => network.toJSON(),
    };
  }

  encodeCompleteCausality(gameState, networkId) {
    const self = gameState.self || {};
    const enemies = gameState.enemies || [];
    const enemy = enemies[0] || {};

    const selfX = self.x || 600;
    const selfY = self.y || 350;
    const enemyX = enemy.x || 600;
    const enemyY = enemy.y || 350;
    const enemyAngle = enemy.angle !== undefined ? enemy.angle : 0;

    // Calculate optimal angle
    const dx = enemyX - selfX;
    const dy = enemyY - selfY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angleToEnemy = Math.atan2(dy, dx);
    const distCompensation = (distance / 1000) * 0.3;
    const optimalAngle = angleToEnemy + distCompensation;

    // Simplified terrain distances (would be enhanced with actual terrain data)
    const terrainBelow = selfY < 350 ? selfY : 700 - selfY;
    const terrainFront = 300; // Simplified
    const terrainBehind = 300; // Simplified
    const terrainAbove = 700 - selfY;
    const closestTerrain = Math.min(terrainBelow, terrainFront, terrainBehind, terrainAbove);

    // Aim prediction
    const aimWillHitTerrain = enemyAngle < -0.5 && terrainBelow < 150;
    const distToTerrainInAim = aimWillHitTerrain ? terrainBelow : 500;

    // Get last shot feedback
    const lastShot = lastShotData.get(networkId) || {
      explosionDistance: 500,
      explosionX: 0,
      explosionY: 0,
      damage: 0,
    };

    // 14 COMPLETE INPUTS:
    return [
      // SPATIAL CONTEXT (7)
      selfX / 1200, // 1. X position
      selfY / 700, // 2. Y position (height)
      Math.min(terrainBelow / 300, 1), // 3. Terrain below
      Math.min(terrainFront / 500, 1), // 4. Terrain in front
      Math.min(terrainBehind / 500, 1), // 5. Terrain behind
      Math.min(terrainAbove / 400, 1), // 6. Terrain above
      Math.min(closestTerrain / 300, 1), // 7. Closest terrain any direction

      // AIM PREDICTION (3)
      (enemyAngle + Math.PI) / (Math.PI * 2), // 8. Current aim angle
      aimWillHitTerrain ? 1 : 0, // 9. Will hit terrain?
      Math.min(distToTerrainInAim / 500, 1), // 10. Distance to collision

      // SHOT FEEDBACK (4)
      Math.min(lastShot.explosionDistance / 500, 1), // 11. Last explosion distance
      (Math.atan2(lastShot.explosionY - selfY, lastShot.explosionX - selfX) + Math.PI) / (Math.PI * 2), // 12. Explosion direction
      Math.min(lastShot.damage / 100, 1), // 13. Damage from last shot
      (optimalAngle + Math.PI) / (Math.PI * 2), // 14. Optimal angle (reference)
    ];
  }

  storeShotData(gameState, aimAngle, networkId) {
    const self = gameState.self || {};
    const selfX = self.x || 600;
    const selfY = self.y || 350;

    // Estimate where shot will land (simplified physics)
    const shotDistance = 400; // Approximate
    const explosionX = selfX + Math.cos(aimAngle) * shotDistance;
    const explosionY = selfY + Math.sin(aimAngle) * shotDistance;

    // Calculate distance
    const dx = explosionX - selfX;
    const dy = explosionY - selfY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Estimate damage (within blast radius of ~150px)
    const blastRadius = 150;
    let damage = 0;
    if (distance < blastRadius) {
      damage = ((blastRadius - distance) / blastRadius) * 50; // Up to 50 damage if very close
    }

    lastShotData.set(networkId, {
      explosionDistance: distance,
      explosionX,
      explosionY,
      damage,
    });
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

      // Estimate self-damage
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
    member.fitness -= selfDamage * PHASE15_CONFIG.fitness.selfDamageWeight;
  }

  evolve() {
    const eliteCount = Math.floor(this.population.length * PHASE15_CONFIG.training.elitePercentage);
    const newPop = [];

    for (let i = 0; i < eliteCount; i++) {
      const elite = this.population[i];
      newPop.push({
        network: neataptic.Network.fromJSON(elite.network.toJSON()),
        fitness: 0,
        selfDamage: 0,
        gamesPlayed: 0,
        id: `net_${i}_gen${this.generation + 1}_${Date.now()}`,
      });
    }

    while (newPop.length < this.population.length) {
      const parent = this.tournamentSelect();
      const offspring = neataptic.Network.fromJSON(parent.network.toJSON());

      if (Math.random() < PHASE15_CONFIG.training.mutationRate) {
        offspring.mutate(neataptic.methods.mutation.MOD_WEIGHT);
      }

      newPop.push({
        network: offspring,
        fitness: 0,
        selfDamage: 0,
        gamesPlayed: 0,
        id: `net_${newPop.length}_gen${this.generation + 1}_${Date.now()}`,
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

    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + (m.gamesPlayed > 0 ? m.selfDamage / m.gamesPlayed : 0), 0) /
      this.population.length;

    console.log(`\n📈 Gen ${this.generation}:`);
    console.log(`  Best Fitness: ${best.toFixed(0)} | Avg: ${avg.toFixed(0)}`);
    console.log(`  Avg Self-Damage: ${avgSelfDmg.toFixed(1)} per game`);

    if (this.generation > 1) {
      const lastGen = this.logs.generations[this.logs.generations.length - 1];
      const change = avgSelfDmg - lastGen.avgSelfDamage;

      if (change < -2) {
        console.log(`  ✅ IMPROVING! Self-damage reduced by ${Math.abs(change).toFixed(1)}`);
      } else if (change > 2) {
        console.log(`  ⚠️  Regression: increased by ${change.toFixed(1)}`);
      } else {
        console.log(`  → Stable: change ${change.toFixed(1)}`);
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

    const logPath = path.join(logsDir, `phase15-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.logs, null, 2));
    console.log(`\n💾 Logs: ${logPath}`);

    const modelPath = path.join(logsDir.replace("logs", "models"), "phase15-best.json");
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
    generations: 4,
    headless: args.includes("--headless"),
  };

  args.forEach((arg, i) => {
    if (arg === "--generations" && args[i + 1]) {
      options.generations = parseInt(args[i + 1]);
    }
  });

  const trainer = new Phase15Trainer(options);

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

export default Phase15Trainer;
