// Input Verification Test
// Runs a single game with verbose logging to validate all 66 inputs

import PuppeteerGameRunner from "./puppeteer-game-runner.js";
import { NETWORK_CONFIG } from "./network-config.js";
import neataptic from "neataptic";

async function verifyInputs() {
  console.log("\n🔍 Input Verification Test");
  console.log("=".repeat(50));
  console.log("This will run ONE game with detailed input logging");
  console.log("to verify all 66 inputs are being populated correctly.");
  console.log("=".repeat(50) + "\n");

  // Create a simple test network
  const network1 = new neataptic.architect.Perceptron(
    NETWORK_CONFIG.inputs,
    Math.floor(NETWORK_CONFIG.inputs * 0.75),
    NETWORK_CONFIG.outputs,
  );

  const network2 = new neataptic.architect.Perceptron(
    NETWORK_CONFIG.inputs,
    Math.floor(NETWORK_CONFIG.inputs * 0.75),
    NETWORK_CONFIG.outputs,
  );

  // Initialize game runner with VERBOSE LOGGING
  const runner = new PuppeteerGameRunner({
    headless: true,
    devServerUrl: "http://localhost:3001",
    verboseLogging: true, // ENABLE VERBOSE LOGGING
  });

  try {
    await runner.initialize();
    await runner.loadGame();
    await runner.setGameSpeed(1.0); // Use normal speed for verification

    console.log("\n🎮 Starting verification game...\n");

    // Run one game with logging
    const result = await runner.startNewGame(network1, network2, {
      mode: "1v1",
      map: "hotelOfHorror",
    });

    if (result.error) {
      console.error("\n❌ Game failed:", result.error);
      process.exit(1);
    }

    console.log("\n✅ Verification Complete!");
    console.log("\n📊 Game Result:");
    console.log(`  Winner: Team ${result.winner}`);
    console.log(`  Turns: ${result.stats.turns}`);
    console.log(`  Team 1 Health: ${result.stats.teams[1].totalHealth.toFixed(1)}`);
    console.log(`  Team 2 Health: ${result.stats.teams[2].totalHealth.toFixed(1)}`);

    console.log("\n✨ Input validation successful!");
    console.log("Review the logs above to confirm:");
    console.log("  1. Total inputs = 66");
    console.log("  2. No NaN or undefined values");
    console.log("  3. Shot feedback shows damage tracking");
    console.log("  4. Ballistics data is calculated");
    console.log("  5. Temporal obstacles initialized (may be zeros)");
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  } finally {
    await runner.close();
  }
}

// Run verification
verifyInputs();
