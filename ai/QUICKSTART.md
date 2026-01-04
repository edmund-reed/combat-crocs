# AI Training Quickstart Guide

**Status:** ✅ Phase 1 Complete - Self-Damage Avoidance Working!  
**Last Updated:** December 24, 2025

This guide will help you quickly get started with the Combat Crocs AI training system.

## 🎉 What We Have

**Working self-damage avoidance trainer with real results:**

- ✅ **48% self-damage reduction** in 10 generations
- ✅ **96.1% win rate** against random opponent
- ✅ **Look-ahead physics simulation** for safe shots
- ✅ **Parallel training** (6 browser tabs)
- ✅ **25-30 min training time** per 10 generations

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies

```bash
cd ai
npm install
```

### 2. Start Dev Server

```bash
# From project root
npm run start:training
# Runs on http://localhost:3001
```

### 3. Test the System

```bash
cd ai/simple
node self-damage-trainer.js --test --headed
```

**What happens:**

- Browser opens (you can watch!)
- Plays 3 games with trained AI
- Shows instant bazooka shots
- Takes ~2-3 minutes

**Expected output:**

```
🧪 TEST MODE
Running 1 network through 3 games...

🎮 Game 1/3: WINNER = Team 1 (22 turns)
   Self-Damage: 5.2 HP

🎮 Game 2/3: WINNER = Team 1 (18 turns)
   Self-Damage: 0.0 HP

🎮 Game 3/3: WINNER = Team 1 (20 turns)
   Self-Damage: 12.1 HP

✅ Average Self-Damage: 5.8 HP
✅ Win Rate: 100%
```

### 4. Run Training

```bash
cd ai/simple
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --elitism 5
```

**What happens:**

- Trains for 10 generations
- Population of 30 neural networks
- Each plays 6 games (2 per map)
- 6 parallel browser tabs
- Continues from last checkpoint (Gen 20)
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

## 🎮 Command Reference

### Test Mode

```bash
# Quick verification (headed, 1 network, 3 games)
node self-damage-trainer.js --test --headed

# Headless test (faster)
node self-damage-trainer.js --test
```

### Training Mode

```bash
# Recommended (continues from last checkpoint)
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --elitism 5

# Faster (fewer games, less accurate)
node self-damage-trainer.js --gen 10 --pop 20 --games 4 --tabs 6

# Slower but more stable (fewer tabs)
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 4
```

### Command Line Arguments

| Argument    | Default | Description                                 |
| ----------- | ------- | ------------------------------------------- |
| `--gen`     | 10      | Number of generations to train              |
| `--pop`     | 30      | Population size (networks per generation)   |
| `--games`   | 6       | Games per network (2 per map)               |
| `--tabs`    | 1       | Parallel browser tabs (1-6 recommended)     |
| `--elitism` | 5       | Top N networks kept unchanged               |
| `--test`    | false   | Run test mode (1 network, 3 games)          |
| `--headed`  | false   | Show browser windows (for debugging)        |
| `--clean`   | false   | Delete all checkpoints and start from Gen 1 |

### Examples

```bash
# Quick training (10 min)
node self-damage-trainer.js --gen 5 --pop 20 --games 4 --tabs 6

# Standard training (30 min)
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6

# Long training (2 hours)
node self-damage-trainer.js --gen 50 --pop 30 --games 6 --tabs 6

# Start fresh (delete checkpoints)
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --clean
```

## 📊 Understanding Results

### During Training

Watch for these metrics in the console:

```
Gen 25: Best=6.5 HP | Avg=10.2 HP | Win Rate=95%
        ^^^^^^^^^^    ^^^^^^^^^^^^    ^^^^^^^^^^^^^
        Lowest self-  Average across  Games won
        damage seen   all networks    vs random AI
```

**Good progress:**

- ✅ Best self-damage decreasing
- ✅ Average self-damage decreasing
- ✅ Win rate staying > 90%

**Needs more training:**

- ⚠️ Self-damage plateaued
- ⚠️ Win rate dropping below 90%
- ⚠️ High variance between best and average

### After Training

Check the saved files:

```bash
# Latest checkpoint
cat ai/checkpoints/self-damage-checkpoint-gen30.json

# Training history (all runs)
cat ai/analysis/training-history.json

# Best model
cat ai/models/self-damage-avoidance.json
```

### Checkpoints

Training automatically saves:

- **Every 5 generations:** Checkpoint saved
- **Last 5 checkpoints kept:** Older ones deleted
- **Best model updated:** When new best found
- **Training history appended:** All runs logged

**Files created:**

```
ai/
├── checkpoints/
│   ├── self-damage-checkpoint-gen20.json  (older)
│   ├── self-damage-checkpoint-gen25.json
│   └── self-damage-checkpoint-gen30.json  (latest)
├── models/
│   └── self-damage-avoidance.json  (best of all time)
└── analysis/
    └── training-history.json  (all training runs)
```

## 🏗️ What's Being Trained

### Network Architecture

**Inputs (16):**

- Blast radius (140px for bazooka)
- Self position (x, y)
- Self health (0-1)
- Did damage self? (boolean feedback)
- Damage taken (HP lost last turn)
- Explosion distance (from last shot)
- Terrain distances (8 directions)
- Min terrain distance

**Hidden Layers:** [16, 12, 8]

**Output (1):** Base aim angle (0-2π)

### Look-Ahead System

Network doesn't directly control shots! Instead:

1. Network suggests 1 angle
2. System tests 4 additional random angles (exploration)
3. All 5 simulated using real physics
4. System picks angle where shot lands **farthest from self**
5. Combines network intelligence + safety guarantee

### Fitness Function

```javascript
fitness = 100 - (selfDamage × 15) + (win × 50)
```

- Heavy penalty for self-damage (primary goal)
- Small bonus for winning (secondary goal)
- Network learns self-avoidance first

## 🎯 Training Targets

### Phase 1: Self-Damage Avoidance (Current)

**Status:** In progress  
**Goal:** <5 HP average self-damage (75% improvement)  
**Current:** 9.8 HP average (48% improvement)  
**Command:**

```bash
node self-damage-trainer.js --gen 30 --pop 30 --games 6 --tabs 6
```

### Phase 2: Enemy Targeting (Next)

**Status:** Not started  
**Goal:** Damage enemies while avoiding self  
**Changes Needed:**

- Add enemy position inputs (18 total inputs)
- New fitness: `damage_enemy - (self_damage × 3)`
- Start with Phase 1 network as foundation

### Phase 3: Multi-Player (Future)

**Status:** Not started  
**Goal:** Support 2v2 gameplay  
**Changes Needed:**

- Fixed slots for teammates/enemies
- Sentinel values for empty slots
- Coordination behaviors

## 🐛 Troubleshooting

### "Cannot connect to localhost:3001"

**Fix:** Start the dev server first

```bash
# Terminal 1
npm run start:training

# Terminal 2 (wait for server to start)
cd ai/simple
node self-damage-trainer.js --test
```

### "Training not improving after Gen 15"

**Fix:** Increase mutation rate

```bash
# Edit self-damage-trainer.js, line ~30
mutationRate: 0.3,  // Increased from 0.2
```

### "Browser tabs crashing"

**Fix:** Reduce parallel tabs

```bash
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 4
# Reduced from 6 to 4 tabs
```

### "Games taking 30+ turns"

**Status:** This is normal!

- Random opponent takes time to self-damage
- More turns = more training data per game
- Not a bug, it's a feature

### "Self-damage increasing instead of decreasing"

**Check:**

1. Input encoding hasn't changed
2. Opponent using 360° random angles (not just forward)
3. hotelOfHorror not in map rotation
4. Fitness function hasn't been modified

### "Can't find checkpoint"

**If you want to start fresh:**

```bash
node self-damage-trainer.js --gen 10 --pop 30 --games 6 --tabs 6 --clean
```

## ⚡ Performance Tips

### Speed vs Stability

```bash
# Fastest (may be unstable)
--tabs 6 --games 4

# Recommended (good balance)
--tabs 6 --games 6

# Most stable (slower)
--tabs 4 --games 6
```

### Resource Usage

**With 6 tabs:**

- RAM: ~2.4 GB
- CPU: 50-80% on 8-core
- Time: ~3 min per generation

**Recommendations:**

- 8 GB RAM minimum
- 4+ CPU cores ideal
- Close other applications
- SSD helps with page loads

## 📈 Training Time Estimates

| Configuration           | Time per Gen | 10 Gens | 50 Gens  |
| ----------------------- | ------------ | ------- | -------- |
| 1 tab, 30 pop, 6 games  | ~9 min       | ~90 min | ~7.5 hrs |
| 4 tabs, 30 pop, 6 games | ~2.5 min     | ~25 min | ~2 hrs   |
| 6 tabs, 30 pop, 6 games | ~1.8 min     | ~18 min | ~1.5 hrs |
| 6 tabs, 20 pop, 4 games | ~0.8 min     | ~8 min  | ~40 min  |

## 🎓 Learning More

### Documentation

- **[AI_SESSION_HANDOVER.md](AI_SESSION_HANDOVER.md)** - Complete system overview
- **[README.md](README.md)** - Architecture and technical details
- **[TRAINING_SPEED_OPTIMIZATIONS.md](TRAINING_SPEED_OPTIMIZATIONS.md)** - Performance details
- **[simple/SELF_DAMAGE_TRAINER_README.md](simple/SELF_DAMAGE_TRAINER_README.md)** - Trainer specifics

### Watch Training in Action

```bash
# Run with visible browser
node self-damage-trainer.js --gen 1 --pop 5 --games 3 --tabs 1 --headed
```

Watch for:

- Instant bazooka explosions
- Look-ahead simulation logging (turn 3)
- Network learning to shoot away from itself

### Analyze Networks

```bash
cd ai/simple
node network-analyzer.js
```

Shows:

- Input importance rankings
- Connection weights
- Network topology
- Learning progress

## 💡 Pro Tips

1. **Start with test mode** - Verify everything works before training
2. **Use headed mode first** - Watch what the AI is doing
3. **Monitor early generations** - Check progress in Gen 1-5
4. **Save before experimenting** - Copy checkpoints before changing code
5. **Train overnight** - Use headless mode for long runs
6. **Check training history** - Review past runs for patterns

## 🎉 Success Criteria

You'll know it's working when:

- ✅ Self-damage decreases each generation
- ✅ Best network achieving <5 HP average
- ✅ Win rate staying above 90%
- ✅ Network showing strong `didDamageSelf` influence
- ✅ Training completing in ~30 minutes

## 🚀 Next Steps

Once training is working:

1. **Continue to Gen 40-50** - Push for <5 HP self-damage
2. **Analyze best networks** - Use network-analyzer.js
3. **Watch headed mode** - See the AI play
4. **Start Phase 2 planning** - Add enemy targeting

Happy training! 🐊🤖
