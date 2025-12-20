// Simple test script to verify Puppeteer game runner works
// Run this before full training to test the automation

import PuppeteerGameRunner from "./puppeteer-game-runner.js";

async function test() {
  console.log("🧪 Testing Puppeteer Game Runner\n");
  console.log("This will:");
  console.log("1. Launch the game in a browser");
  console.log("2. Navigate through menus");
  console.log("3. Start a game with random AI");
  console.log("4. Play a few turns\n");

  const runner = new PuppeteerGameRunner({
    headless: false, // Show browser so you can see what's happening
    slowMo: 100, // Slow down for easier observation
  });

  try {
    console.log("Initializing browser...");
    try {
      await runner.initialize();
    } catch (initError) {
      console.error("\n❌ Browser initialization failed!");
      console.error("Error details:", initError.message);
      console.error("Full error:", initError);
      throw initError;
    }

    console.log("Loading game...");
    try {
      await runner.loadGame();
    } catch (loadError) {
      console.error("\n❌ Game loading failed!");
      console.error("Error details:", loadError.message);
      console.error("Full error:", loadError);
      throw loadError;
    }

    console.log("\n✅ Setup complete!");
    console.log("Starting a test game with random AI...\n");

    const result = await runner.startNewGame(null, null, {
      mode: "1v1",
    });

    console.log("\n🎮 Game Result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.error) {
      console.log("\n⚠️  There was an error during the game.");
      console.log("This is normal on first run - the menu navigation may need adjustment.");
      console.log("Check the browser window to see where it got stuck.\n");
    } else {
      console.log("\n✅ Test successful!");
      console.log("The automation is working. You can now run full training.\n");
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
  } finally {
    console.log("\nClosing browser in 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    await runner.close();
  }
}

test();
