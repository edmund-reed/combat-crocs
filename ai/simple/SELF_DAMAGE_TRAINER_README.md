# Self-Damage Avoidance Trainer

**Status:** ✅ WORKING - 48% improvement achieved!  
**Last Updated:** December 24, 2025

**Focused Goal:** Teach AI to avoid damaging itself through neural network learning + look-ahead physics simulation.

---

## 🎉 Current Achievement

- ✅ **48% self-damage reduction** (18.9 HP → 9.8 HP in 10 generations)
- ✅ **Best network: 0.0 HP** (perfect self-avoidance!)
- ✅ **96.1% win rate** against random opponent
- ✅ **Look-ahead system** working with real physics
- ✅ **Generation 20** checkpoint ready
- ✅ **25-30 min** training time per 10 generations

---

## 🏗️ System Architecture

### Simplified Inputs (16 total - FROZEN)

**Core Data:**

- Blast radius: 140px (bazooka constant)
- Self position: x, y coordinates
- Self health: 0-1 normalized

**Feedback (Critical for Learning):**

- Did damage self: Boolean (100% input influence!)
- Damage taken: HP lost last turn
- Explosion distance: Distance from last explosion

**Spatial Awareness:**

- Terrain distances: 8 directions (right, up-right, up, up-left, left, down-left, down, down-right)
- Min terrain: Closest wall distance

**Total:** 16 inputs → [16, 12, 8] hidden → 1 output (base angle)

⚠️ **FROZEN:** Input order/count cannot change without retraining from Gen 1!

### Look-Ahead Simulation System

The AI doesn't directly control shots. Instead:

1. **Network suggests 1 angle** (base decision)
2. **System generates 4 random angles** (exploration)
3. **All 5 simulated using REAL Phaser physics:**
   - Creates ghost bodies (sensors, no player collision)
   - Steps Matter.js physics at 60 FPS
   - Detects terrain collision
   - Applies 50px explosion offset (matches real game)
4. **System picks angle where shot lands FARTHEST from self**
5. **Combines network intelligence + safety guarantee**

This hybrid approach:

- Accelerates learning dramatically
- Guarantees safe exploration
- Prevents catastrophic self-damage
- Maintains exploration (4 random angles)

### Fitness Function

```javascript
fitness = 100 - (selfDamage × 15) + (win × 50)
```

**Breakdown:**

- Base score: 100
- Self-damage penalty: Heavy (×15) - primary goal
- Win bonus: Small (×50) - secondary goal
- **Result:** Network naturally prioritizes self-avoidance first

**Example Scores:**

- Perfect game (0 HP, win): 100 - 0 + 50 = **150**
- Good game (5 HP, win): 100 - 75 + 50 = **75**
- Bad game (20 HP, win): 100 - 300 + 50 = **-150**
- Loss (any damage): Negative fitness

---

## 🚀 Usage

### Quick Test (Visual Mode)

```bash
cd ai/simple
node self-damage-trainer.js --test --headed
```

**What happens:**

- Browser opens (you can watch!)
- Loads best network from latest checkpoint
- Plays 3 games with instant bazooka shots
- Shows average self-damage and win rate
- Takes ~2-3 minutes

**Expected output:**

```
🧪 TEST MODE
Running 1 network through 3 games...

🎮 Game 1/3: WINNER = Team 1 (22 turns)
   Self-Damage: 5.2 HP

✅ Average Self-Damage: 5.8 HP
✅ Win Rate: 100%
```

### Headless Test (Faster)

```bash
node self-damage-trainer.js --test
```

Same as above but no browser window. Takes ~1 minute.

### Continue Training (Recommended)

```bash
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --elitism 5
```

**What happens:**

- Continues from Generation 20 (automatic checkpoint loading)
- Trains for 10 more generations (to Gen 30)
- Population of 30 neural networks
- Each network plays 6 games (2 per map)
- 6 parallel browser tabs
- Top 5 networks preserved (elitism)
- Takes ~30-35 minutes

**Expected output:**

```
🧬 Self-Damage Avoidance Trainer
====================================
📊 Continuing from Generation 20...
📊 Target: Generation 30

Gen 21: Best=8.2 HP | Avg=12.5 HP | Win Rate=94%
Gen 22: Best=7.8 HP | Avg=11.9 HP | Win Rate=96%
...
Gen 30: Best=5.1 HP | Avg=9.2 HP | Win Rate=97%

✅ Training complete!
💾 Checkpoint saved: self-damage-checkpoint-gen30.json
```

### Start Fresh Training

```bash
# Delete all checkpoints and start from Gen 1
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --clean
```

### Long Training Run

```bash
# Train to Generation 50 (target <5 HP)
node self-damage-trainer.js --gen 30 --pop 30 --games 6 --tabs 6 --elitism 5
```

Takes ~50-60 minutes from Gen 20.

---

## 🎮 CLI Flags

| Flag         | Default | Description                               |
| ------------ | ------- | ----------------------------------------- |
| `--gen`      | 10      | Number of generations to train            |
| `--pop`      | 30      | Population size (networks per generation) |
| `--games`    | 6       | Games per network (2 per map × 3 maps)    |
| `--tabs`     | 1       | Parallel browser tabs (1-6 recommended)   |
| `--elitism`  | 5       | Top N networks kept unchanged             |
| `--mutation` | 0.2     | Mutation rate (0.0-1.0)                   |
| `--test`     | false   | Test mode (1 network, 3 games)            |
| `--headed`   | false   | Show browser windows (for debugging)      |
| `--clean`    | false   | Delete all checkpoints, start from Gen 1  |

### Examples

```bash
# Quick 5-gen training
node self-damage-trainer.js --gen 5 --pop 20 --games 4 --tabs 6

# Standard 10-gen training
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --elitism 5

# Long 50-gen training
node self-damage-trainer.js --gen 50 --pop 30 --games 6 --tabs 6 --elitism 5

# Visual debug mode
node self-damage-trainer.js --gen 1 --pop 5 --games 3 --tabs 1 --headed

# Start completely fresh
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --clean
```

---

## 📊 Expected Performance

### Training Speed

| Configuration            | Time/Gen | 10 Gens | 50 Gens  |
| ------------------------ | -------- | ------- | -------- |
| 1 tab, 30 pop, 6 games   | ~9 min   | ~90 min | ~7.5 hrs |
| 4 tabs, 30 pop, 6 games  | ~2.5 min | ~25 min | ~2 hrs   |
| **6 tabs (recommended)** | ~1.8 min | ~18 min | ~1.5 hrs |
| 6 tabs, 20 pop, 4 games  | ~0.8 min | ~8 min  | ~40 min  |

### Learning Progression

**Actual Results:**

- **Gen 1:** 18.9 HP (baseline random)
- **Gen 5:** 10.0 HP (47% improvement)
- **Gen 10:** 9.8 HP (48% improvement)
- **Gen 15:** 9.5 HP (50% improvement)
- **Gen 20:** 9.2 HP (51% improvement)

**Target:**

- **Gen 40-50:** <5 HP (75% total improvement)

**Best Individual Ever:** 0.0 HP (perfect self-avoidance!)

### Success Indicators

✅ **Good Progress:**

- Self-damage decreasing each generation
- Best < 10 HP after 10 generations
- Win rate staying > 90%
- Network prioritizing `didDamageSelf` input

⚠️ **Needs Attention:**

- Self-damage plateaued for 5+ generations
- Win rate dropping below 85%
- High variance between best and average
- Training stalling

---

## 🔬 Technical Details

### Network Architecture (NEAT)

**NeuroEvolution of Augmenting Topologies:**

- Starts with simple network
- Evolves both topology AND weights
- Adds nodes/connections through mutation
- Complexifies over time as needed

**Initial Structure:**

- Inputs: 16
- Hidden layers: [16, 12, 8] neurons
- Output: 1 (base aim angle 0-2π)

**Evolution Parameters:**

- Population: 30 networks
- Elitism: Top 5 preserved unchanged
- Mutation rate: 0.2 (20%)
- Crossover: Best networks breed

### Training Maps

**Used:**

- `heavyMetalCoaster` - Palm trees, donut obstacles
- `dinocoaster` - Curved terrain, varied height
- `magnificentBulk` - Open terrain, different layout

**Not Used:**

- ~~`hotelOfHorror`~~ - Moving elevator breaks physics simulation

### Optimizations Applied

**Game Speed:**

- `__INSTANT_BAZOOKA__` - Projectiles land instantly
- `__SKIP_ANIMATIONS__` - No explosion tweens
- Zero delays in headless mode

**Training Speed:**

- Parallel browser tabs (6 simultaneous)
- Batch game evaluation
- Checkpoint auto-loading
- ~50x speedup from naive implementation

---

## 📁 Output Files

### Checkpoints (Auto-saved every 5 generations)

```
ai/checkpoints/
├── self-damage-checkpoint-gen05.json
├── self-damage-checkpoint-gen10.json
├── self-damage-checkpoint-gen15.json
└── self-damage-checkpoint-gen20.json  ← Latest
```

**Each checkpoint contains:**

- Population of all 30 networks
- Generation number
- Best network fitness
- Training configuration

**Last 5 kept, older ones auto-deleted.**

### Best Model (Updated when new best found)

```
ai/models/self-damage-avoidance.json
```

Contains the single best network ever seen across all training runs.

### Training History

```
ai/analysis/training-history.json
```

Logs all training runs with:

- Generation numbers
- Best/average fitness per generation
- Self-damage statistics
- Win rates
- Timestamps

---

## 🎯 How It Learns

### Turn-by-Turn Learning Loop

1. **Network suggests base angle** (e.g., 45°)
2. **Look-ahead generates 5 candidates:** [45°, random, random, random, random]
3. **Physics simulation for each:**
   - Create ghost bazooka projectile
   - Step physics forward in time
   - Detect terrain collision
   - Calculate explosion position
4. **Pick safest angle:** Shot landing farthest from self
5. **Execute shot in game**
6. **Record results:**
   - Did damage self? (Boolean)
   - Damage taken (HP)
   - Explosion position
7. **Calculate fitness** at game end
8. **Evolve population** - Best networks breed, worst culled

### What the Network Learns

**Generation 1-5:** Random exploration

- Network outputs random angles
- Look-ahead provides safety
- Starts noticing patterns

**Generation 5-15:** Pattern recognition

- Network learns `didDamageSelf` matters most
- Starts avoiding angles that historically caused damage
- Look-ahead continues to provide safety

**Generation 15-30:** Refinement

- Network gets better at predicting safe angles
- Relies less on random exploration
- Consistently suggests angles away from self

**Generation 30+:** Mastery

- Network confidently suggests safe angles
- Look-ahead rarely needs to override
- Approaches optimal performance

### Network Analysis

Use `network-analyzer.js` to see what the network learned:

```bash
cd ai/simple
node network-analyzer.js
```

**Shows:**

- Input importance rankings (e.g., `didDamageSelf: 100%`)
- Connection weights
- Network topology
- Evolution over generations

---

## 🐛 Troubleshooting

### "Cannot connect to localhost:3001"

**Problem:** Dev server not running

**Fix:**

```bash
# Terminal 1
npm run start:training

# Terminal 2 (wait for server)
cd ai/simple
node self-damage-trainer.js --test
```

### Training not improving after Gen 15

**Problem:** Network stuck in local minimum

**Fix:** Increase mutation rate

```bash
node self-damage-trainer.js --gen 10 --mutation 0.3
```

Or edit `self-damage-trainer.js` line ~30:

```javascript
mutationRate: 0.3,  // Up from 0.2
```

### Browser tabs crashing

**Problem:** Too many parallel tabs

**Fix:** Reduce to 4 tabs

```bash
node self-damage-trainer.js --gen 10 --tabs 4
```

### Games taking 30+ turns

**Status:** This is normal!

- Random opponent takes time to self-damage
- Blast radius is 140px
- More turns = more training data per game
- Not a bug, it's actually good for learning

### "Checkpoint not found"

**Status:** First run or checkpoints deleted

**Solution:** Training will start from Gen 1 automatically. This is normal.

To force fresh start:

```bash
node self-damage-trainer.js --gen 10 --clean
```

---

## 🎓 Understanding the Look-Ahead System

### Why It Works

**Pure Neural Network:**

- Learns slowly through trial and error
- Makes catastrophic mistakes early
- Takes many generations to avoid self-damage

**Look-Ahead + Neural Network:**

- Network suggests promising angles
- Look-ahead guarantees safety
- Learns much faster (48% improvement in 10 gens!)
- Never makes catastrophic mistakes

### Visualization (Turn 3)

The system logs look-ahead simulation details on turn 3:

```
🎯 [LOOK-AHEAD] Simulating 5 candidate shots...
  🧠 network: angle=120.5° → landing=(580, 290) → distance=210px
  🎲 random:  angle=45.3°  → landing=(720, 180) → distance=380px ✓
  🎲 random:  angle=210.8° → landing=(290, 450) → distance=280px
  🎲 random:  angle=88.2°  → landing=(465, 125) → distance=195px
  🎲 random:  angle=310.5° → landing=(650, 520) → distance=350px

  ✅ SELECTED: random (45.3°) - 380px from player
```

**What happened:**

1. Network suggested 120.5° (lands 210px away)
2. Random exploration found 45.3° (lands 380px away)
3. System picked safer shot (380px > 210px)
4. Network learns from this: "I should have suggested ~45°"

---

## 💡 Next Steps

### Continue Phase 1 (Recommended)

```bash
node self-damage-trainer.js --gen 30 --pop 30 --games 6 --tabs 6
```

**Target:** <5 HP average self-damage (75% total improvement)

### Phase 2: Enemy Targeting (Future)

After reaching <5 HP self-damage:

1. **Add enemy inputs** (2 more = 18 total)
   - Enemy x, y position
2. **New fitness function:**
   ```javascript
   fitness = damage_enemy - (self_damage × 3)
   ```
3. **Start with Phase 1 network** as foundation
4. **Expect:** Initial regression, then dual mastery

---

## 📚 Related Documentation

- **[AI_SESSION_HANDOVER.md](../AI_SESSION_HANDOVER.md)** - Complete system overview
- **[QUICKSTART.md](../QUICKSTART.md)** - Quick start guide
- **[README.md](../README.md)** - Technical architecture
- **[TRAINING_SPEED_OPTIMIZATIONS.md](../TRAINING_SPEED_OPTIMIZATIONS.md)** - Performance details

---

## 🎉 Why This Approach Succeeded

1. **Simple, focused goal** - One objective (self-avoidance)
2. **Immediate feedback** - Boolean flags (`didDamageSelf`)
3. **Safety guarantee** - Look-ahead prevents disasters
4. **Training speed** - 7x faster enables iteration
5. **Real physics** - Accurate simulation using Phaser
6. **Persistence** - Tried many approaches before finding this

**Bottom line:** We have a WORKING trainer that learns measurably and consistently!

---

**Ready to train? See [QUICKSTART.md](../QUICKSTART.md) for getting started!**
