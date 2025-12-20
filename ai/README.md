# Combat Crocs AI Training System

**Status:** ✅ **Phase 1 Complete - Puppeteer System Functional**  
**Latest Update:** December 20, 2025

This directory contains the machine learning training infrastructure for Combat Crocs AI opponents.

## 🎉 Current Status

**The Puppeteer browser automation system is complete and working!**

- ✅ Browser launches and controls game automatically
- ✅ Games complete successfully with winners determined
- ✅ AI fires weapons and deals damage
- ✅ Ready for neural network integration

**See [STATUS.md](STATUS.md) for complete implementation details.**

## 🧬 Architecture

The AI uses **Neuroevolution** (genetic algorithms + neural networks) powered by **Puppeteer browser automation**:

1. **Browser Automation**: Puppeteer controls the real game in Chrome
2. **Turn Detection**: Hooks into game's turn manager
3. **Weapon Firing**: Uses actual game WeaponManager (no simulation needed)
4. **Evolutionary Training**: Networks compete and evolve over generations

## 📁 Directory Structure

```
ai/
├── training/          # Training algorithms and simulators
├── data/             # Training data (gameplay recordings)
├── models/           # Trained AI models (exported to game)
├── ui/               # Training dashboard
└── testing/          # Validation and benchmarks
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai
npm install
```

### 2. Test the System

```bash
# Terminal 1 - Start game server
cd src
npm run dev

# Terminal 2 - Test AI automation
cd ai
npm test
```

**Expected Result:** Browser opens, navigates menus, plays a complete game, shows winner!

### 3. Train AI Models (Coming Soon)

```bash
npm run train
```

Training will:

- Create population of 50 neural networks
- Evolve through self-play (200+ generations)
- Export models to `models/` directory

**Note:** Neural network integration is next on the roadmap. See [STATUS.md](STATUS.md) for details.

### 4. What Works Now

✅ **Puppeteer automation** - Launches and controls game  
✅ **Turn detection** - Hooks into game's turn manager  
✅ **Weapon firing** - AI fires bazookas and deals damage  
✅ **Game completion** - Plays until winner determined

🚧 **In Progress:** Neural network decision making (currently uses random aim)

## 📊 Model Outputs

Training produces 4 difficulty levels:

- `easy-ai.json` - Generation 30 (~30% win rate)
- `medium-ai.json` - Generation 80 (~50% win rate)
- `hard-ai.json` - Generation 200 (~70% win rate)
- `nightmare-ai.json` - Generation 500 (~85% win rate)

## 🧠 Neural Network Architecture

**Inputs (24 neurons):**

- Self state: health, position
- Enemy states: health, distance, angle, threat (×4 enemies)
- Weapon ammo: bazooka, grenade, shotgun
- Context: turn number, time remaining

**Outputs (6 neurons):**

- Target selection
- Weapon choice
- Aim angle
- Shot power
- Movement direction

## 🎮 Testing

Validate trained models:

```bash
npm run validate
```

## 📝 Notes

- Training takes 2-8 hours depending on hardware
- Models are only ~5KB each
- AI runs entirely offline in the browser
- No external API calls required
