# Combat Crocs AI Training System

**Status:** ✅ **Phase 1 Complete - Self-Damage Avoidance Working!**  
**Latest Update:** December 24, 2025

This directory contains the machine learning training infrastructure for Combat Crocs AI opponents.

## 🎉 Current Achievement

**We have a WORKING self-damage avoidance trainer with measurable results!**

- ✅ **48% self-damage reduction** (18.9 HP → 9.8 HP in 10 generations)
- ✅ **96.1% win rate** against random opponent
- ✅ **Look-ahead physics simulation** for safe shot selection
- ✅ **Parallel training** (6 browser tabs, 36x speedup)
- ✅ **Optimized to ~25-30 min** per training run

**See [AI_SESSION_HANDOVER.md](AI_SESSION_HANDOVER.md) for complete details.**

## 🧬 Architecture

The AI uses **NEAT** (NeuroEvolution of Augmenting Topologies) powered by **Puppeteer browser automation**:

1. **Browser Automation**: Puppeteer controls the real game in Chrome
2. **Instant Bazooka Mode**: Projectiles land instantly for fast training
3. **Look-Ahead Simulation**: AI simulates 5 candidate shots, picks safest
4. **Real Physics**: Uses actual Phaser Matter.js physics engine
5. **Evolutionary Training**: Networks compete over generations

## 📁 Directory Structure

```
ai/
├── simple/                              # Current working trainer ⭐
│   ├── self-damage-trainer.js          # Main trainer (USE THIS!)
│   ├── network-analyzer.js             # Network introspection
│   └── SELF_DAMAGE_TRAINER_README.md   # Detailed docs
├── training/                            # Core infrastructure
│   ├── puppeteer-game-runner.js        # Browser automation
│   └── network-config.js               # Input encoding
├── checkpoints/                         # Saved generations
│   ├── self-damage-checkpoint-gen05.json
│   ├── self-damage-checkpoint-gen10.json
│   ├── self-damage-checkpoint-gen15.json
│   └── self-damage-checkpoint-gen20.json  ⭐ Latest
├── models/                              # Trained models
│   └── self-damage-avoidance.json      # Best network
├── analysis/                            # Training metrics
│   └── training-history.json           # All training runs
├── data/                                # Input logs
│   └── input-logs/                     # Turn-by-turn game data
├── AI_SESSION_HANDOVER.md              # Complete system documentation
└── QUICKSTART.md                        # Getting started guide
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai
npm install
```

### 2. Start Development Server

```bash
# From project root
npm run start:training
# Runs on http://localhost:3001
```

### 3. Run Training

```bash
cd ai/simple
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --elitism 5
```

**Expected:** ~30-35 minutes, continues from last checkpoint (Gen 20)

**Result:**

- Training progress logged to console
- Checkpoints saved every 5 generations
- Best model saved to `models/self-damage-avoidance.json`
- Training history logged to `analysis/training-history.json`

### 4. Test Mode (Quick Verification)

```bash
cd ai/simple
node self-damage-trainer.js --test --headed
# Runs 1 network, 3 games, with visible browser
```

## 📊 Current Model

### Self-Damage Avoidance (Phase 1) ✅

**Location:** `models/self-damage-avoidance.json`  
**Performance:** 9.8 HP average self-damage (48% improvement)  
**Checkpoints:** Gen 5, 10, 15, 20 available

**What it learned:**

- Avoid shooting too close (100% input influence on `didDamageSelf`)
- Spatial awareness (77% influence on terrain sensors)
- Memory of last shot (64% influence on explosion distance)

### Future Models (Coming Soon)

- **Phase 2:** Enemy targeting + self-avoidance combined
- **Phase 3:** Multi-player (2v2) support
- **Phase 4:** Advanced tactics (cover, timing, combos)

## 🧠 Neural Network Architecture

### Current (Phase 1 - Self-Damage Avoidance)

**Inputs (16 neurons):**

- Blast radius (140px for bazooka)
- Self position (x, y)
- Self health (0-1 normalized)
- Self-damage feedback (did damage self, damage taken)
- Last explosion distance
- Terrain distances (8 directions)
- Minimum terrain distance

**Hidden Layers:** [16, 12, 8] neurons

**Output (1 neuron):**

- Base aim angle (0-2π)

**Look-Ahead Enhancement:**

- Network suggests 1 angle
- System tests 4 additional random angles
- Picks angle where shot lands farthest from self
- Combines network intelligence + safety guarantee

⚠️ **Important:** Input order is FROZEN. Changing breaks trained models!

## 🎮 Training Parameters

### Recommended Settings

```bash
--gen 10      # Train for 10 generations
--pop 30      # Population of 30 networks
--games 6     # Each network plays 6 games (2 per map)
--tabs 6      # 6 parallel browser tabs
--elitism 5   # Keep top 5 networks unchanged
```

### Maps Used

- `heavyMetalCoaster` - Palm trees, donut obstacles
- `dinocoaster` - Curved terrain, varied height
- `magnificentBulk` - Open terrain, different layout

⚠️ **Not used:** `hotelOfHorror` (moving elevator breaks physics)

## 📈 Training Progress

View results:

```bash
# Latest checkpoint
cat ai/checkpoints/self-damage-checkpoint-gen20.json

# Training history
cat ai/analysis/training-history.json

# Input logs (turn-by-turn data)
cat ai/data/input-logs/*.json
```

Good progress indicators:

- ✅ Self-damage decreasing each generation
- ✅ Network prioritizing `didDamageSelf` input
- ✅ Win rate staying > 90%
- ✅ Best network < 5 HP average

## ⚡ Performance Optimizations

**Speedup Factors:**

- Instant bazooka mode: ~6x faster
- Parallel browser tabs (6): ~6x faster
- Removed delays (headless): ~1.4x faster
- **Total speedup: ~50x** (from ~3 hours to ~30 minutes)

**Key Optimizations:**

- `__INSTANT_BAZOOKA__` flag skips projectile flight
- Zero delays between turns in headless mode
- Physics simulation uses ghost bodies (no collision with players)
- Training history logged once at end (not per turn)

## 🐛 Troubleshooting

### Games taking 20+ turns?

**Status:** Normal! Random opponent takes time to self-damage.  
**Benefit:** More training data per game.

### Training stalls around Gen 15?

**Fix:** Increase mutation rate: `--mutation 0.3`

### Browser tabs crashing?

**Fix:** Reduce parallel tabs: `--tabs 4`

## 📚 Documentation

- **[AI_SESSION_HANDOVER.md](AI_SESSION_HANDOVER.md)** - Complete system documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Quick reference guide
- **[simple/SELF_DAMAGE_TRAINER_README.md](simple/SELF_DAMAGE_TRAINER_README.md)** - Trainer details
- **[TRAINING_SPEED_OPTIMIZATIONS.md](TRAINING_SPEED_OPTIMIZATIONS.md)** - Performance details

## 🔬 Technical Details

### Physics Simulation

Uses real Phaser Matter.js physics:

- Creates ghost bodies (sensors, no collision)
- Steps physics at 60 FPS
- Detects terrain collision
- Applies 50px explosion offset (matches real game)
- Returns clamped explosion position

### Fitness Function

```javascript
fitness = 100 - (selfDamage × 15) + (win × 50)
```

- Heavy penalty for self-damage (primary goal)
- Small bonus for winning (secondary goal)
- Network naturally learns self-avoidance first

### Input Encoding

⚠️ **FROZEN** - Do not change order or count!

```javascript
[
  blastRadius,
  selfX,
  selfY,
  selfHealthPercent,
  didDamageSelf,
  damageTaken,
  explosionDistance,
  terrain[8],
  minTerrain,
];
```

Changing this breaks all trained models. Must retrain from Gen 1.

## 🎯 Next Steps

### Continue Phase 1 (Recommended)

```bash
node self-damage-trainer.js --gen 30 --pop 30 --games 6 --tabs 6
```

**Target:** <5 HP average (75% total improvement)

### Start Phase 2 (After Phase 1 Mastery)

- Add enemy position inputs (2 more inputs = 18 total)
- New fitness: `damage_enemy - (self_damage × 3)`
- Use Phase 1 network as foundation

## 📝 Notes

- Training continues from last checkpoint automatically
- Checkpoints saved every 5 generations
- Last 5 checkpoints kept (older ones deleted)
- Models are ~50KB each (includes full network topology)
- AI runs entirely offline in browser
- No external API calls required

---

**Ready to continue training? See [AI_SESSION_HANDOVER.md](AI_SESSION_HANDOVER.md) for the complete handover!**
