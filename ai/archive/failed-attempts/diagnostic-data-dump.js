// Diagnostic Tool: Dump ALL available game state data
// This shows us exactly what information the network can access

import PuppeteerGameRunner from "../training/puppeteer-game-runner.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDiagnostic() {
  console.log("\n🔍 DIAGNOSTIC: Dumping Game State Data");
  console.log("=".repeat(60));
  console.log("Goal: See ALL available data for encoding\n");

  const gameRunner = new PuppeteerGameRunner({
    headless: false, // Show browser so we can see what's happening
    devServerUrl: "http://localhost:3001",
  });

  await gameRunner.initialize();
  await gameRunner.loadGame();
  await gameRunner.setGameSpeed(1.0); // Slow for observation

  const dataDump = {
    turns: [],
  };

  // Create a wrapper that logs all data
  const diagnosticNetwork = {
    activate: gameState => {
      // Capture complete game state
      const turnData = {
        turn: dataDump.turns.length + 1,
        raw: JSON.parse(JSON.stringify(gameState)), // Deep copy
      };

      dataDump.turns.push(turnData);

      console.log(`\n📍 Turn ${turnData.turn}:`);
      console.log("  Self:", gameState.self);
      console.log("  Enemies:", gameState.enemies);
      console.log("  Terrain:", gameState.terrain);
      console.log("  Ballistics:", gameState.ballistics);
      console.log("  Obstacles:", gameState.obstacles);
      console.log("  Shot Feedback:", gameState.shotFeedback);
      console.log("  Context:", gameState.context);

      // Return random valid output for testing
      return [1, 0, 0.5, Math.random(), 0.8, 0.5];
    },
    toJSON: () => ({}),
  };

  console.log("\n▶️  Starting diagnostic game...\n");

  const result = await gameRunner.startNewGame(diagnosticNetwork, diagnosticNetwork, {
    mode: "1v1",
    map: "hotelOfHorror",
  });

  console.log("\n✅ Game complete!");
  console.log(`Winner: Team ${result.winner}`);
  console.log(`Total turns logged: ${dataDump.turns.length}`);

  // Save complete data dump
  const dumpPath = path.join(__dirname, "../logs/diagnostic-dump.json");
  fs.writeFileSync(dumpPath, JSON.stringify(dataDump, null, 2));
  console.log(`\n💾 Full data saved to: ${dumpPath}`);

  // Analyze what's available
  console.log("\n📊 DATA ANALYSIS:");
  console.log("=".repeat(60));

  if (dataDump.turns.length > 0) {
    const sample = dataDump.turns[0].raw;

    console.log("\n✅ AVAILABLE DATA:");
    console.log(`  Self: ${Object.keys(sample.self || {}).join(", ")}`);
    console.log(`  Enemies: ${sample.enemies?.length || 0} enemies`);
    if (sample.enemies?.[0]) {
      console.log(`    Enemy fields: ${Object.keys(sample.enemies[0]).join(", ")}`);
    }
    console.log(`  Terrain: ${sample.terrain ? "Available" : "NOT AVAILABLE"}`);
    console.log(`  Ballistics: ${sample.ballistics ? "Available" : "NOT AVAILABLE"}`);
    console.log(`  Obstacles: ${sample.obstacles ? "Available" : "NOT AVAILABLE"}`);
    console.log(`  Shot Feedback: ${sample.shotFeedback ? "Available" : "NOT AVAILABLE"}`);

    // Check for explosion/damage data
    const lastTurn = dataDump.turns[dataDump.turns.length - 1].raw;
    if (lastTurn.shotFeedback) {
      console.log(`\n📍 Shot Feedback Fields:`);
      console.log(`  ${Object.keys(lastTurn.shotFeedback).join(", ")}`);
    }
  }

  console.log("\n=".repeat(60));
  console.log("✅ Diagnostic complete! Check the JSON file for full details.\n");

  await gameRunner.close();
}

runDiagnostic().catch(err => {
  console.error("\n❌ Diagnostic failed:", err);
  process.exit(1);
});
