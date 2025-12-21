# 🔧 Training System Fix Plan

**Date:** December 21, 2025  
**Status:** Ready to implement

---

## ✅ GOOD NEWS: Bug Fixes ARE Applied!

After auditing `trainer.js`, I found that the documented critical bugs **WERE actually fixed**:

1. ✅ **Line 159:** Only current player gets fitness (opponent excluded)
2. ✅ **Line 211-220:** Actual damage calculation using initialHealth
3. ✅ **Line 267-274:** Probabilistic mutations (not all 7 at once)
4. ✅ **Line 144-148:** Opponent selection excludes self

**This explains why Gen 1-5 worked reasonably well!**

---

## ❌ MISSING FIXES: Why Training Crashed at Gen 6

Three critical issues remain:

### 1. **NO Browser Restart Logic** 🚨 CRITICAL

**Problem:** Browser runs continuously for all games

- Gen 1-5: 150 games (30 per generation)
- Memory accumulates
- Chrome crashes at Gen 6

**Evidence in code:** No `gameRunner.close()` or restart logic in `evaluatePopulation()`

**Impact:** 100% of Gen 6+ failures

---

### 2. **NO Error Detection** ⚠️ HIGH

**Problem:** Training continues even when games fail

**Current behavior (line 163-166):**

```javascript
if (result.error) {
  console.log(`    ⚠️  Game ${game + 1} error: ${result.error}`);
  continue; // Just skips the game!
}
```

**Result:** Training runs 15 more generations with zero data

**Impact:** Wastes compute, hides failures

---

### 3. **4-Model Export (Not Critical)** 📦 MEDIUM

**Current (lines 423-429):** Exports easy/medium/hard/nightmare
**Problem:** Assumes 200+ generation training succeeds
**User request:** Simplify to just ONE best model

**Impact:** Complexity, assumes success

---

## 🛠️ Implementation Plan

### Fix #1: Add Browser Restart (CRITICAL)

**Location:** `evaluatePopulation()` method, after line 142

**Code to add:**

```javascript
// Restart browser every 20 games to prevent memory leaks
const gamesCompleted =
  (this.generation - 1) * this.options.populationSize * this.options.gamesPerNetwork +
  i * this.options.gamesPerNetwork +
  game +
  1;

if (gamesCompleted % 20 === 0) {
  console.log(`    🔄 Restarting browser (${gamesCompleted} games played)...`);
  await this.gameRunner.close();
  await this.gameRunner.initialize();
  await this.gameRunner.loadGame();
  await this.gameRunner.setGameSpeed(2.0);
}
```

**Time:** 5 minutes  
**Lines changed:** ~8 lines added

---

### Fix #2: Add Error Detection (HIGH)

**Location A:** After game error (line 166), add early stopping:

```javascript
if (result.error) {
  console.log(`    ⚠️  Game ${game + 1} error: ${result.error}`);

  // Try restarting browser once
  console.log(`    🔄 Attempting browser restart...`);
  await this.gameRunner.close();
  await this.gameRunner.initialize();
  await this.gameRunner.loadGame();
  await this.gameRunner.setGameSpeed(2.0);

  // Retry the game once
  const retryResult = await this.playGame(member.network, opponent.network, i, opponentIndex);
  if (retryResult.error) {
    throw new Error(`Game failed after browser restart: ${retryResult.error}`);
  }
  result = retryResult; // Use retry result
}
```

**Location B:** After `evaluatePopulation()` (line 109), check for zero fitness:

```javascript
// Check if all networks failed (fitness = 0)
const allZero = this.population.every(m => m.fitness === 0);
if (allZero && this.generation > 1) {
  throw new Error(`Generation ${this.generation}: All fitness = 0. Training failure detected.`);
}
```

**Time:** 10 minutes  
**Lines changed:** ~15 lines added

---

### Fix #3: Simplify Model Export (MEDIUM)

**Location:** `exportFinalModels()` method, replace lines 423-433

**Before:**

```javascript
const modelsToExport = [
  { index: 0, name: "nightmare-ai.json", desc: "Best overall" },
  { index: Math.floor(this.population.length * 0.2), name: "hard-ai.json", desc: "Top 20%" },
  { index: Math.floor(this.population.length * 0.5), name: "medium-ai.json", desc: "Top 50%" },
  { index: Math.floor(this.population.length * 0.8), name: "easy-ai.json", desc: "Top 80%" },
];
```

**After:**

```javascript
const modelsToExport = [{ index: 0, name: "best-ai.json", desc: "Best AI from training" }];
```

**Also remove:** Lines 372-386 (checkpoint exports for easy/medium/hard)

**Time:** 5 minutes  
**Lines changed:** ~20 lines removed, 1 line modified

---

## 📊 Testing Strategy

### Phase 1: Quick Validation (1 hour)

1. **Apply all 3 fixes**
2. **Run 5-generation test:**

   ```bash
   cd ai
   node training/trainer.js --generations 5 --population 10 --headless
   ```

3. **Success criteria:**
   - ✅ All 5 generations complete
   - ✅ Browser restarts visible in logs (every 20 games)
   - ✅ No crashes
   - ✅ Fitness > 0 for all generations
   - ✅ One `best-ai.json` exported

### Phase 2: Extended Test (3 hours)

If Phase 1 succeeds:

```bash
node training/trainer.js --generations 20 --population 10 --headless
```

**Success criteria:**

- ✅ Passes Gen 6 boundary (the previous crash point)
- ✅ Fitness stable or increasing
- ✅ Checkpoint system works
- ✅ Final model exported

---

## 📝 Summary

### Changes Required:

1. **Browser restart** - 8 lines, prevents Gen 6 crash
2. **Error detection** - 15 lines, catches failures early
3. **Simplify export** - Remove ~20 lines, export 1 model

### Total effort:

- **Coding:** 20-30 minutes
- **Testing:** 1 hour (5 generations)
- **Total:** ~1.5 hours to stable system

### Expected outcome:

- ✅ Training completes 5 generations successfully
- ✅ No more Gen 6 crashes
- ✅ Clear error messages if something fails
- ✅ One simple `best-ai.json` output
- ✅ Foundation for longer training runs

---

## 🎯 Next Steps

1. **Apply Fix #1** (browser restart) - CRITICAL
2. **Apply Fix #2** (error detection) - HIGH
3. **Apply Fix #3** (simplify export) - MEDIUM
4. **Test with 5 generations**
5. **If successful, scale to 20 generations**

**Ready to implement?** Say the word and I'll make these changes!

---

**Note:** The good news is that the core training logic is ALREADY FIXED. We just need to add stability features (browser restart + error handling) and simplification (1 model export).
