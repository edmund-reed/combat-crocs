# Minimal AI System - Fresh Start

**Date:** December 22, 2025  
**Status:** Starting from scratch with proven approach

---

## Why We're Restarting

**What failed:**

- 66 inputs (too complex, can't verify)
- Complex fitness function (hard to debug)
- No logging (couldn't see what's wrong)
- Assumed it worked without proof

**Result:** 70 generations, got worse, wasted time/money

---

## New Approach: Prove Each Step Works

### Phase 1: Absolute Minimum (PROVE IT LEARNS)

**Goal:** Network learns "don't shoot yourself" - that's it

**Inputs: 10 total**

```javascript
[
  selfHealth / 100, // 0-1
  selfX / 1200, // 0-1
  selfY / 700, // 0-1
  enemyHealth / 100, // 0-1
  enemyX / 1200, // 0-1
  enemyY / 700, // 0-1
  enemyDistance / 1000, // 0-1
  enemyAngle / (2 * PI), // 0-1 (where is enemy relative to me)
  bazookaAmmo, // 0-5
  lastShotHitSelf, // 0 or 1 (CRITICAL: immediate feedback)
];
```

**Outputs: 1 total**

```javascript
[
  aimAngle, // 0-1 mapped to -PI to PI
];
```

**Fitness: Ultra Simple**

```javascript
fitness = 0;
if (won) fitness += 100;
fitness += damageToEnemy * 1.0;
fitness -= damageToSelf * 5.0; // HARSH penalty
```

**Success Criteria:**

- After 10 generations, average self-damage < 20 per game
- Networks learn to avoid shooting down/at feet
- PROOF: Log every shot angle and result

---

### Phase 2: Add Weapon Choice (IF Phase 1 Works)

**Add 2 inputs:**

```javascript
grenadeAmmo, shotgunAmmo;
```

**Add 1 output:**

```javascript
weaponChoice; // 0-0.33=bazooka, 0.34-0.66=grenade, 0.67-1=shotgun
```

**Success Criteria:**

- Networks use different weapons appropriately
- Win rate > 40%

---

### Phase 3: Add Basic Tactics (IF Phase 2 Works)

**Add 3-4 inputs:**

```javascript
enemy2Health,
enemy2Distance,
enemy2Angle,
teammatHealth (if 2v2)
```

**Success Criteria:**

- Win rate > 55%
- Networks target weak enemies

---

## Implementation Plan

### Step 1: Clean Slate (30 min)

1. Archive old system to `ai/archive-v1/`
2. Create `ai/simple/` with new minimal files
3. Copy only what's needed from puppeteer-game-runner.js

### Step 2: Minimal Network Config (15 min)

```javascript
// ai/simple/simple-config.js
export const SIMPLE_CONFIG = {
  inputs: 10,
  outputs: 1,
  populationSize: 20, // Small for fast iterations
  gamesPerNetwork: 3,
  generations: 20, // Quick test
};
```

### Step 3: Minimal Trainer (30 min)

- Load game via Puppeteer
- Run games
- Calculate simple fitness
- Evolve with NEAT
- **LOG EVERYTHING**

### Step 4: Logging System (15 min)

Save to `ai/logs/gen-X-detailed.json`:

```json
{
  "generation": 1,
  "networks": [
    {
      "id": 0,
      "fitness": 45,
      "games": [
        {
          "turn": 1,
          "inputs": [...],
          "output": 0.65,
          "aimAngle": 1.2,
          "hitSelf": false,
          "hitEnemy": true,
          "damageDealt": 25,
          "damageTaken": 0
        }
      ]
    }
  ]
}
```

### Step 5: Test Run (10 min)

```bash
cd ai/simple
node simple-trainer.js --generations 5
```

**Verify:**

- Games run without errors
- Fitness calculated correctly
- Logs show what's happening
- Can see if learning occurs

### Step 6: Full 20-Gen Test (30 min)

```bash
node simple-trainer.js --generations 20
```

**Expected:**

- Gen 1: Random (lots of self-damage)
- Gen 5: Some avoid shooting down
- Gen 10: Most avoid self-damage
- Gen 20: Avg self-damage < 20, some decent shots

**If this works:** We have proof the system CAN learn

---

## Acceptance Criteria

**Before adding ANY complexity:**

✅ Network learns "don't shoot down" (Gen 1: 60 self-dmg → Gen 20: 15 self-dmg)  
✅ Logs show clear correlation (bad angles → low fitness)  
✅ Some networks win games (win rate > 30%)  
✅ Can explain WHY it's improving (from logs)

**If these fail:** System is fundamentally broken, fix before continuing

---

## Total Time Estimate

- Clean slate: 30 min
- Build minimal system: 1 hour
- Test & verify: 40 min
- **Total: ~2 hours**

If it works after 2 hours: We have a foundation to build on.

If it doesn't work after 2 hours: The problem is deeper (Puppeteer, game integration, NEAT library itself).

---

## What We Learned from Failure

1. **Don't assume it works** - prove each step
2. **Start simple** - 10 inputs, not 66
3. **Log everything** - can't debug blind
4. **Verify learning** - quantifiable improvement
5. **Harsh penalties work** - 5x self-damage penalty

---

## Key Differences from Old System

| Old System        | New System                              |
| ----------------- | --------------------------------------- |
| 66 inputs         | 10 inputs                               |
| 6 outputs         | 1 output (just aim angle)               |
| Complex fitness   | Simple fitness (win/damage/self-damage) |
| No logging        | Log every shot                          |
| Assumed it worked | Prove it works                          |
| Elite 20-40%      | Elite 30% (from mistakes)               |
| Population 50     | Population 20 (faster)                  |
| 3 games/network   | 3 games/network (same)                  |

---

## Success Looks Like

**After Phase 1 (10-input system):**

```
Gen 1:  Best: 150, Avg: 80,  Self-dmg: 60, Win: 15%
Gen 10: Best: 400, Avg: 250, Self-dmg: 25, Win: 35%
Gen 20: Best: 550, Avg: 350, Self-dmg: 15, Win: 45%
```

**Clear upward trend = system works!**

Then we can add Phase 2, Phase 3, etc. with confidence.
