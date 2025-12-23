// Minimal AI Trainer - PROOF OF CONCEPT
// 10 inputs, 1 output, comprehensive logging
// Goal: PROVE the system can learn

import neataptic from "neataptic";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import { SIMPLE_CONFIG, encodeSimpleGameState, decodeSimpleOutput, validateInputs } from "./simple-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SimpleTrainer {
  constructor(options = {}) {
    this.options = {
      generations: options.generations || SIMPLE_CONFIG.training.generations,
      headless: options.headless !== false, // Default true
      ...options,
    };

    this.population = [];
    this.generation = 0;
    this.browser = null;
    this.page = null;

    // Logging
    this.logs = {
      generations: [],
    };
  }

  async initialize() {
    console.log("\n🎮 MINIMAL AI TRAINER - PROOF OF CONCEPT");
    console.log("=".repeat(60));
    console.log("Goal: Prove the AI can learn to avoid shooting itself");
    console.log("Inputs: 10 (self, enemy, ammo, lastShotHitSelf)");
    console.log("Outputs: 1 (aim angle)");
    console.log("Fitness: win + damage - 5x self-damage");
    console.log("=".repeat(60) + "\n");

    // Launch browser
    console.log("🚀 Launching browser...");
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security", "--mute-audio"],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1200, height: 800 });

    // Load game
    console.log("🎮 Loading game from http://localhost:3001...");
    await this.page.goto("http://localhost:3001", { waitUntil: "networkidle0" });
    await this.page.waitForFunction(() => window.Phaser && window.CombatCrocs, { timeout: 30000 });
    console.log("✅ Game loaded\n");

    // Create initial population
    console.log("🌱 Creating initial population...");
    this.createInitialPopulation();
    console.log(`✅ Created ${this.population.length} random networks\n`);
  }

  createInitialPopulation() {
    for (let i = 0; i < SIMPLE_CONFIG.training.populationSize; i++) {
      const network = new neataptic.architect.Perceptron(
        SIMPLE_CONFIG.inputs,
        Math.floor(SIMPLE_CONFIG.inputs * 0.5), // 5 hidden nodes
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
        shots: [], // Log all shots
      });
    }
  }

  async train() {
    for (this.generation = 1; this.generation <= this.options.generations; this.generation++) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📊 GENERATION ${this.generation}/${this.options.generations}`);
      console.log("=".repeat(60));

      // Evaluate
      await this.evaluatePopulation();

      // Sort
      this.population.sort((a, b) => b.fitness - a.fitness);

      // Stats
      this.printStats();

      // Log
      this.logGeneration();

      // Evolve (except last gen)
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
      member.shots = [];

      // Play games
      for (let game = 0; game < SIMPLE_CONFIG.training.gamesPerNetwork; game++) {
        await this.playGame(member);
      }

      // Calculate average self-damage
      const avgSelfDmg = member.selfDamage / member.gamesPlayed;

      console.log(
        `  Network ${i + 1}/${this.population.length}: ` +
          `Fitness ${member.fitness.toFixed(0)} | ` +
          `W/L ${member.wins}/${member.losses} | ` +
          `Dmg ${member.damageDealt.toFixed(0)} | ` +
          `Self ${avgSelfDmg.toFixed(1)}`,
      );
    }
  }

  async playGame(member) {
    // Start game
    const gameResult = await this.page.evaluate(() => {
      // Navigate to game
      const phaserGame = window.CombatCrocs?.game;
      if (!phaserGame) return { error: "No game" };

      // Setup teams
      const teams = [
        {
          id: 1,
          name: "AI",
          crocCount: 1,
          color: { name: "Blue", key: "blue", hex: "#0066CC" },
          players: [{ characterType: "CROCODILE" }],
        },
        {
          id: 2,
          name: "Opponent",
          crocCount: 1,
          color: { name: "Red", key: "red", hex: "#CC0000" },
          players: [{ characterType: "CROCODILE" }],
        },
      ];

      window.CombatCrocs.gameState.game.teams = teams;
      window.CombatCrocs.gameState.game.selectedMap = "hotelOfHorror";

      // Start game
      phaserGame.scene.start("GameScene");

      return { ok: true };
    });

    if (gameResult.error) {
      console.log(`    ⚠️ Error starting game: ${gameResult.error}`);
      return;
    }

    // Wait for game to initialize
    await this.delay(2000);

    // Play turns (simplified - just track basic stats)
    let lastShotHitSelf = false;

    for (let turn = 0; turn < 20; turn++) {
      // Get game state
      const state = await this.page.evaluate(() => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        if (!scene || !scene.players) return null;

        const p1 = scene.players[0];
        const p2 = scene.players[1];

        if (!p1 || !p2) return null;

        return {
          self: { health: p1.health, x: p1.x, y: p1.y },
          enemies: [
            {
              health: p2.health,
              x: p2.x,
              y: p2.y,
              distance: Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y),
              angle: Phaser.Math.Angle.Between(p1.x, p1.y, p2.x, p2.y),
            },
          ],
          weapons: { ammo: { BAZOOKA: 5 } },
          gameOver: p1.health <= 0 || p2.health <= 0,
          winner: p1.health <= 0 ? 2 : p2.health <= 0 ? 1 : null,
        };
      });

      if (!state || state.gameOver) {
        // Calculate final fitness
        const won = state?.winner === 1;
        const damage = state ? 100 - state.enemies[0].health : 0;

        if (won) member.wins++;
        else member.losses++;

        member.damageDealt += damage;
        member.fitness += won ? SIMPLE_CONFIG.fitness.winBonus : 0;
        member.fitness += damage * SIMPLE_CONFIG.fitness.damageDealtWeight;
        member.fitness -= member.selfDamage * SIMPLE_CONFIG.fitness.selfDamageWeight;
        member.gamesPlayed++;

        break;
      }

      // Encode inputs
      const inputs = encodeSimpleGameState({
        ...state,
        lastShotHitSelf,
      });

      if (!validateInputs(inputs)) {
        console.log("    ⚠️ Invalid inputs, skipping");
        break;
      }

      // Get network decision
      const outputs = member.network.activate(inputs);
      const decision = decodeSimpleOutput(outputs[0]);

      // Log shot
      member.shots.push({
        turn,
        aimAngle: decision.aimAngle,
        inputs: [...inputs],
      });

      // Execute shot
      const shotResult = await this.page.evaluate(aimAngle => {
        const scene = window.CombatCrocs?.game?.scene?.getScene("GameScene");
        if (!scene) return { error: "No scene" };

        const p1 = scene.players[0];
        const p1HealthBefore = p1.health;

        // Shoot
        p1.aimAngle = aimAngle;
        const targetX = p1.x + Math.cos(aimAngle) * 500;
        const targetY = p1.y + Math.sin(aimAngle) * 500;

        if (window.WeaponManager) {
          window.WeaponManager.fireWeapon(scene, p1, targetX, targetY, "BAZOOKA");
        }

        // Wait a moment for damage
        return new Promise(resolve => {
          setTimeout(() => {
            const p1HealthAfter = p1.health;
            const selfDamage = Math.max(0, p1HealthBefore - p1HealthAfter);
            resolve({ selfDamage });
          }, 500);
        });
      }, decision.aimAngle);

      if (shotResult.selfDamage > 0) {
        member.selfDamage += shotResult.selfDamage;
        lastShotHitSelf = true;
      } else {
        lastShotHitSelf = false;
      }

      await this.delay(100);
    }
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
        shots: [],
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
        shots: [],
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
    const winRate = (totalWins / totalGames) * 100;

    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + m.selfDamage / m.gamesPlayed, 0) / this.population.length;

    console.log(`\n📈 Generation ${this.generation} Summary:`);
    console.log(`  Best Fitness:     ${best.toFixed(0)}`);
    console.log(`  Average Fitness:  ${avg.toFixed(0)}`);
    console.log(`  Worst Fitness:    ${worst.toFixed(0)}`);
    console.log(`  Win Rate:         ${winRate.toFixed(1)}%`);
    console.log(`  Avg Self-Damage:  ${avgSelfDmg.toFixed(1)} per game`);

    // Learning indicator
    if (this.generation > 1) {
      const lastGen = this.logs.generations[this.logs.generations.length - 1];
      const selfDmgChange = avgSelfDmg - lastGen.avgSelfDamage;
      if (selfDmgChange < -5) {
        console.log(`  ✅ Learning! Self-damage reduced by ${Math.abs(selfDmgChange).toFixed(1)}`);
      } else if (selfDmgChange > 5) {
        console.log(`  ⚠️ Regression! Self-damage increased by ${selfDmgChange.toFixed(1)}`);
      }
    }
  }

  logGeneration() {
    const fitnesses = this.population.map(m => m.fitness);
    const avgSelfDmg =
      this.population.reduce((sum, m) => sum + m.selfDamage / m.gamesPlayed, 0) / this.population.length;

    this.logs.generations.push({
      generation: this.generation,
      bestFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      worstFitness: Math.min(...fitnesses),
      avgSelfDamage: avgSelfDmg,
      // Top 3 networks shots
      top3Shots: this.population.slice(0, 3).map(m => ({
        fitness: m.fitness,
        shots: m.shots.map(s => ({
          turn: s.turn,
          aimAngle: s.aimAngle.toFixed(2),
        })),
      })),
    });
  }

  async saveResults() {
    const logsDir = path.join(__dirname, "../logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Save detailed logs
    const logPath = path.join(logsDir, `simple-training-${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(this.logs, null, 2));
    console.log(`\n💾 Logs saved: ${logPath}`);

    // Save best network
    const modelsDir = path.join(__dirname, "../models");
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const modelPath = path.join(modelsDir, "simple-best.json");
    fs.writeFileSync(modelPath, JSON.stringify(this.population[0].network.toJSON(), null, 2));
    console.log(`💾 Best network saved: ${modelPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = {
    generations: 20,
    headless: args.includes("--headless"),
  };

  // Parse args
  args.forEach((arg, i) => {
    if (arg === "--generations" && args[i + 1]) {
      options.generations = parseInt(args[i + 1]);
    }
  });

  const trainer = new SimpleTrainer(options);

  try {
    await trainer.initialize();
    await trainer.train();
  } catch (error) {
    console.error("\n❌ Training failed:", error);
  } finally {
    await trainer.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default SimpleTrainer;
