# Fixed Baseline Training System ✅

**Date:** December 21, 2025  
**Status:** Implemented and Ready to Use

## Overview

Train your AI against a **fixed baseline opponent** to measure absolute skill improvement, solving the self-play win rate paradox where networks always hover around 50% win rate regardless of skill level.

---

## 🎯 The Problem We Solved

### Self-Play Paradox:

```
Generation 1:   Weak vs Weak     = 50% win rate
Generation 50:  Strong vs Strong = 50% win rate ← Can't measure progress!
Generation 100: Master vs Master = 50% win rate
```

### Solution: Fixed Baseline

```
Generation 13: Gen-13 vs Gen-11 baseline = 50% win rate (equal)
Generation 20: Gen-20 vs Gen-11 baseline = 68% win rate ← Improving!
Generation 30: Gen-30 vs Gen-11 baseline = 85% win rate ← Getting better!
Generation 50: Gen-50 vs Gen-11 baseline = 96% win rate ← MASTERY! ✅
```

**Win rate now shows ABSOLUTE improvement!**

---

## 📂 File Structure

```
ai/
├── baselines/                    ← Permanent benchmarks (never deleted)
│   └── baseline-v1.json         ← checkpoint-gen11 copy (your current baseline)
│
├── checkpoints/                  ← Training checkpoints (auto-cleanup)
│   ├── checkpoint-gen13.json
│   ├── checkpoint-gen14.json
│   └── checkpoint-gen15.json    (only last 3 kept)
│
└── models/
    └── best-ai.json             ← Your best AI so far
```

---

## 🚀 Usage Examples

### Train Against Baseline (From Gen 13)

```bash
cd ai
npm run train -- --resume checkpoint-gen13.json --generations 20 --baseline baseline-v1.json --population 10 --headless
```

**What this does:**

- Loads your gen-13 population
- Trains to generation 20
- Each network plays against **gen-11 baseline** (fixed difficulty)
- Win rate shows absolute improvement

**Expected output:**

```
🎯 Loading baseline opponents: baseline-v1.json
  ✅ Loaded 10 baseline opponents
  📊 Baseline from Generation 11
  🎯 Your networks will compete against this fixed difficulty

Generation 14: Win Rate 56% vs baseline
Generation 15: Win Rate 62% vs baseline
Generation 20: Win Rate 78% vs baseline ← Clear progress!
```

### Continue Without Baseline (Self-Play)

```bash
cd ai
npm run train -- --resume checkpoint-gen20.json --generations 30 --population 10 --headless
```

**Without --baseline flag:**

- Falls back to self-play (networks compete against each other)
- Win rate returns to ~50%
- Use fitness and damage to measure progress

---

## 📊 Interpreting Results

### Progress Metrics

| Win Rate vs Baseline | Skill Level          | Next Action                         |
| -------------------- | -------------------- | ----------------------------------- |
| 30-45%               | Below baseline       | Keep training                       |
| 50-55%               | Equal to baseline    | Improving                           |
| 60-75%               | Better than baseline | Good progress                       |
| 80-90%               | Much better          | Near mastery                        |
| 95%+                 | Mastery! ✅          | Ready for next tier or add movement |

### Example Training Run

```
Gen 13: Fitness 773,  Win 50% vs baseline  ← Starting point
Gen 15: Fitness 850,  Win 58% vs baseline  ← +8% improvement
Gen 18: Fitness 920,  Win 67% vs baseline  ← +17% improvement
Gen 20: Fitness 1020, Win 76% vs baseline  ← +26% improvement!
Gen 25: Fitness 1180, Win 88% vs baseline  ← +38% improvement!
Gen 30: Fitness 1290, Win 96% vs baseline  ← MASTERED! 🎉
```

**Both metrics climb together:**

- ✅ Win rate: Absolute skill vs fixed opponent
- ✅ Fitness: Overall performance quality

---

## 🎓 Training Strategies

### Strategy 1: Beat Current Baseline

```bash
# Train until you dominate gen-11 baseline
npm run train -- --resume checkpoint-gen13.json --generations 30 --baseline baseline-v1.json --headless
```

**Goal:** Win rate ≥95% vs baseline-v1
**Expected:** 15-20 generations

### Strategy 2: Create Harder Baseline

Once you achieve 95%+ win rate:

```bash
# Save current best as new baseline
cp ai/checkpoints/checkpoint-gen30.json ai/baselines/baseline-v2.json

# Train against harder baseline
npm run train -- --resume checkpoint-gen30.json --generations 50 --baseline baseline-v2.json --headless
```

**Goal:** Win rate ≥90% vs baseline-v2
**Expected:** Another 20-30 generations

### Strategy 3: Alternate Training Modes

```bash
# Phase 1: Train vs baseline (focused improvement)
npm run train -- --resume checkpoint-gen20.json --generations 30 --baseline baseline-v1.json --headless

# Phase 2: Self-play (strategy refinement)
npm run train -- --resume checkpoint-gen30.json --generations 40 --headless

# Phase 3: Back to baseline (validate improvement)
npm run train -- --resume checkpoint-gen40.json --generations 50 --baseline baseline-v1.json --headless
```

---

## 💡 Advanced Features

### Multiple Baselines

Create a difficulty ladder:

```bash
# Easy baseline (gen-5 networks)
cp ai/checkpoints/checkpoint-gen5.json ai/baselines/baseline-easy.json

# Medium baseline (gen-11 networks) ← Current
# baseline-v1.json

# Hard baseline (gen-30 networks - create after training)
cp ai/checkpoints/checkpoint-gen30.json ai/baselines/baseline-hard.json
```

### Validation Testing

Test your best AI against all baselines:

```bash
# Test vs easy
npm run train -- --generations 1 --baseline baseline-easy.json --headless

# Test vs medium
npm run train -- --generations 1 --baseline baseline-v1.json --headless

# Test vs hard
npm run train -- --generations 1 --baseline baseline-hard.json --headless
```

Expected results:

- Easy: 99%+ win rate
- Medium: 95%+ win rate
- Hard: 50-60% win rate (next challenge!)

---

## 🔍 What to Watch For

### Good Signs ✅

```
Generation 20:
  Win Rate: 72% vs baseline (+22% from gen 13)
  Fitness: 1050 (+277 from gen 13)
  Avg Damage: 88.5 (high accuracy)

🧠 Learning Insights:
  ⬆ Improving: +45 points (+4.5%)
  ✓ Strong win rate (72.0%) - AI is dominating
  ✓ High damage output (88.5) - accurate shots
```

### Warning Signs ⚠️

```
Generation 20:
  Win Rate: 48% vs baseline (-2% from gen 13)
  Fitness: 755 (-18 from gen 13)
  Avg Damage: 62.0 (declining)

🧠 Learning Insights:
  ⬇ Regression: Networks got worse
  ⚠ Low win rate (48.0%) - below baseline
  → Low damage (62.0) - accuracy declining
```

**What to do:** This suggests overtraining or bad mutations. Try:

- Lower mutation rate
- Increase elite percentage
- Resume from earlier checkpoint

---

## 🎯 Mastery Criteria

**You've mastered the current baseline when:**

1. ✅ **Win rate ≥95%** vs baseline for 5+ consecutive generations
2. ✅ **Fitness ≥1400** (arbitrary but indicates strong performance)
3. ✅ **Avg damage ≥90** (near-perfect accuracy)
4. ✅ **Learning insights stable** (no longer rapidly improving)

**Then you can:**

- Create a harder baseline (baseline-v2)
- Add movement mechanics
- Test against human players
- Deploy to production

---

## 📝 Quick Reference

### Command Syntax

```bash
npm run train -- [OPTIONS]

OPTIONS:
  --resume CHECKPOINT      Resume from checkpoint (e.g., checkpoint-gen13.json)
  --baseline BASELINE      Train vs fixed baseline (e.g., baseline-v1.json)
  --generations N          Train up to generation N
  --population N           Population size (default: 10)
  --headless              Run without browser UI
```

### Common Commands

```bash
# Resume from gen 13, train to gen 20, vs baseline
npm run train -- --resume checkpoint-gen13.json --generations 20 --baseline baseline-v1.json --headless

# Fresh start with baseline
npm run train -- --generations 10 --baseline baseline-v1.json --population 10 --headless

# Self-play (no baseline)
npm run train -- --resume checkpoint-gen20.json --generations 30 --headless
```

---

## 🚀 Next Steps

1. **Test the system:**

   ```bash
   cd ai
   npm run train -- --resume checkpoint-gen13.json --generations 15 --baseline baseline-v1.json --population 10 --headless
   ```

2. **Watch for improvement:**

   - Win rate should climb from ~50% (gen 13) to 60-70% (gen 15)
   - Progress counter shows "Game X/Y"
   - Learning insights explain performance

3. **Run longer training:**

   - Once validated, train to gen 30-50
   - Watch win rate climb toward 95%
   - Save successful checkpoints as new baselines

4. **Implement Phase 2b:**
   - Parallel browser training (4x speedup)
   - Combined with baseline system
   - Reach mastery faster!

---

## ✅ Summary

**Baseline training delivers:**

- ✅ Clear, measurable progress (win rate vs fixed opponent)
- ✅ No self-play paradox (win rate actually changes)
- ✅ Confidence in AI improvement
- ✅ Graduate to harder difficulties systematically
- ✅ Know when AI has "mastered" current level

**Ready to train!** 🎮🧠
