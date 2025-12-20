# AI Training Quickstart Guide

**Status:** ✅ Puppeteer System Working!  
**Last Updated:** December 20, 2025

This guide will help you test the working Combat Crocs AI automation system.

## 🎉 Current Status

**The system is functional!** You can now:

- ✅ Test the browser automation (`npm test`)
- ✅ Watch AI play complete games
- ✅ See winners determined

**Next:** Neural network integration for intelligent decisions.

## 🚀 Prerequisites

1. **Game Server Running**

   ```bash
   # Terminal 1
   cd src
   npm run dev
   ```

   Make sure the game is accessible at http://localhost:3001

2. **AI Dependencies Installed**
   ```bash
   # Terminal 2
   cd ai
   npm install
   ```

## 🧪 Test the Working System

Run the test to see AI play a complete game:

```bash
cd ai
npm test
```

**What happens:**

1. Browser window opens
2. Game loads at localhost:3001
3. Menus navigate automatically (no clicking needed!)
4. Game starts with 2 teams
5. AI plays turn-by-turn
6. Weapons fire and deal damage
7. Game ends with a winner

**Expected output:**

```
✅ Game complete: Winner = Team 1 (7 turns)

🎮 Game Result:
{
  "winner": 1,
  "stats": {
    "teams": {
      "1": { "alive": 1, "totalHealth": 62.9 },
      "2": { "alive": 0, "totalHealth": 0 }
    }
  }
}
```

### Common Issues

**Issue: Menu navigation fails**

- The test runner may get stuck on player/team selection
- This is normal - menu selectors need customization for your UI
- Watch the browser to see where it stops
- You'll need to adjust the selectors in `puppeteer-game-runner.js`

**Issue: Can't find game elements**

- Check that `window.CombatCrocs` is exposed globally
- Verify the game state structure matches what the runner expects

## 🎮 Step 2: Quick Training Run

Once the test works (or at least loads the game), try a quick training run:

```bash
npm run train-quick
```

**Settings:**

- Population: 10 networks
- Generations: 5
- Time: ~5-10 minutes
- Purpose: Verify the full training loop works

**What you'll see:**

```
🧬 Combat Crocs AI Training System
==================================================
Population Size: 10
Target Generations: 5
Games per Network: 3
==================================================

🌱 Creating initial population...
✅ Created 10 random networks

🏋️  Starting training...

📊 Generation 1/5
--------------------------------------------------
Evaluating 10 networks...
  Network 1/10:
    Fitness: 125.34 | W/L: 2/1 | Avg Damage: 45.2
  ...
```

## 🏋️ Step 3: Full Training

For production-quality AI, run the full training:

```bash
# Headed mode (watch it train)
npm run train-full

# Headless mode (faster, can run overnight)
npm run train-headless
```

**Settings:**

- Population: 50 networks
- Generations: 200
- Time: 3-6 hours (depending on hardware)
- Output: 4 difficulty levels exported

**What gets created:**

```
ai/models/
├── easy-ai.json       (Generation 30)
├── medium-ai.json     (Generation 80)
├── hard-ai.json       (Generation 200)
├── nightmare-ai.json  (Best of all)
└── training-stats.json
```

## 🎯 Training Tips

### Performance Optimization

**Speed up training:**

1. Use headless mode: `--headless`
2. Reduce population: `--population 30`
3. Reduce games per network: `--games 2`
4. Close other applications

**Example - Fast training:**

```bash
node training/trainer.js --headless --population 30 --generations 100 --games 2
```

### Monitoring Progress

Watch the fitness scores improve over generations:

- **Early gens (1-20)**: Random behavior, fitness varies wildly
- **Mid gens (20-80)**: Basic tactics emerge, fitness stabilizes
- **Late gens (80-200)**: Refined strategies, fitness plateaus

**Good training indicators:**

- Average fitness increases each generation
- Win rate approaches 50% (networks evenly matched)
- Less variance in fitness scores

**Bad training indicators:**

- Fitness stays flat or decreases
- All networks have similar (low) fitness
- Frequent game errors

## 🐛 Debugging

### Enable verbose logging

Add logging to see what's happening:

```javascript
// In puppeteer-game-runner.js
this.page.on("console", msg => {
  console.log("  🎮", msg.text()); // Already there
});
```

### Watch the browser

Run with headed mode to see actual gameplay:

```bash
node training/trainer.js --population 5 --generations 2
```

### Test individual components

```javascript
// Test just the network
import { Architect } from "neataptic";
const network = new Architect.Perceptron(24, 18, 6);
const inputs = new Array(24).fill(0.5);
const outputs = network.activate(inputs);
console.log(outputs); // Should be 6 numbers
```

## 📝 Next Steps

Once training completes:

1. **Check the models** - Look in `ai/models/`
2. **Test different difficulties** - Try easy vs nightmare AI
3. **Integrate into game** - Add AI controller to use trained models
4. **Record gameplay** - Collect training data with the 'K' key
5. **Retrain with imitation learning** - Use recorded games as starting point

## 🆘 Common Problems

### "Cannot find module"

```bash
cd ai
npm install
```

### "ECONNREFUSED localhost:3001"

```bash
# From the src/ directory
cd src
npm run dev
```

### "Navigation timeout"

- Increase timeout in puppeteer-game-runner.js
- Check game loads manually in browser
- Verify menu elements exist

### "Fitness not improving"

- Check fitness function in trainer.js
- Verify game results are being captured correctly
- Try different mutation rates
- Increase population size

### "Browser crashes"

- Reduce population size
- Add delays between games
- Enable headless mode
- Close other applications

## 💡 Pro Tips

1. **Start small**: Use `train-quick` to verify everything works
2. **Watch first**: Run headed mode first to see what's happening
3. **Check outputs**: Inspect the exported models to verify they saved
4. **Save checkpoints**: Training exports models at generations 30, 80, 200
5. **Run overnight**: Use headless mode for long training runs

## 📊 Understanding Results

After training, check `training-stats.json`:

```json
{
  "generations": [1, 2, 3, ...],
  "bestFitness": [150, 180, 220, ...],
  "avgFitness": [100, 120, 150, ...]
}
```

**Good training:**

- Best fitness trends upward
- Average fitness increases
- Gap between best and average narrows

**Need more training:**

- Fitness still climbing at end
- High variance between networks
- Win rate below 40%

## 🎓 Advanced Options

### Custom training parameters

```bash
node training/trainer.js \
  --generations 500 \
  --population 100 \
  --games 5 \
  --headless
```

### Modify fitness function

Edit `trainer.js` line ~195:

```javascript
// Reward different behaviors
fitness += wins * 100; // Victory
fitness += damage * 2; // Aggression
fitness += survival * 1; // Caution
fitness += accuracy * 50; // Precision
```

### Network architecture

Edit `network-config.js`:

```javascript
export const NETWORK_CONFIG = {
  inputs: 24, // Game state features
  outputs: 6, // Action decisions
  // ...
};
```

## 🤝 Need Help?

1. Check `IMPLEMENTATION_GUIDE.md` for detailed architecture
2. Read `README.md` for system overview
3. Inspect browser console during test runs
4. Review game recorder output format

Happy training! 🐊🤖
