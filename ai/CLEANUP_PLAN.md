# AI Folder Cleanup Plan

## Current Situation

The ai folder has become cluttered with:

- Old and new systems
- Failed experimental approaches
- Documentation of failures
- Broken/abandoned code

## What We Know Now

1. **Original 66-input system** in `ai/training/` has comprehensive data encoding
2. **Multiple simplified attempts** in `ai/simple/` all failed to show learning
3. **Root cause unclear**: Could be data encoding, fitness function, or algorithm
4. **Next step**: Ultra-minimal approach to prove learning is possible

---

## Files to KEEP (Core System)

### Training Infrastructure (Working)

- ✅ `ai/training/puppeteer-game-runner.js` - Game automation (WORKS)
- ✅ `ai/training/network-config.js` - 66-input encoding system
- ✅ `ai/training/trainer.js` - Original training system
- ✅ `ai/package.json` - Dependencies

### Documentation (Reference)

- ✅ `ai/README.md` - Main documentation
- ✅ `ai/QUICKSTART.md` - Getting started guide

---

## Files to ARCHIVE (Historical Reference)

### Failed Experiments - Move to `ai/archive/failed-attempts/`

- 📦 `ai/simple/simple-trainer.js` - First simplification attempt
- 📦 `ai/simple/simple-trainer-v2.js` - Second attempt
- 📦 `ai/simple/simple-config.js`
- 📦 `ai/simple/spatial-trainer-fast.js` - Spatial approach
- 📦 `ai/simple/spatial-config.js`
- 📦 `ai/simple/phase1-avoid-self-damage.js` - 5-input attempt (failed)
- 📦 `ai/simple/phase1.5-complete-causality.js` - 14-input attempt (failed)
- 📦 `ai/simple/diagnostic-data-dump.js` - Diagnostic (didn't capture data)

### Analysis Documents - Move to `ai/archive/analysis/`

- 📦 `ai/ENHANCED_INPUTS.md`
- 📦 `ai/FIXES_APPLIED_SUMMARY.md`
- 📦 `ai/INPUT_SYSTEM_ROADMAP.md`
- 📦 `ai/BASELINE_TRAINING.md`
- 📦 `ai/PARALLEL_TRAINING.md`
- 📦 `ai/FITNESS_SYSTEM_V2.1_BALANCED.md`
- 📦 `ai/GEN45_REGRESSION_ANALYSIS.md`
- 📦 `ai/GEN45-70_ANALYSIS.md`
- 📦 `ai/GEN50_ANALYSIS.md`
- 📦 `ai/PARALLEL_WORKERS_CRASH.md`
- 📦 `ai/REGRESSION_DIAGNOSIS.md`
- 📦 `ai/FINAL_FIXES_APPLIED.md`
- 📦 `ai/MINIMAL_RESTART_PLAN.md`

### Old Models - Keep for reference but document as failed

- 📦 `ai/models/simple-v2-best.json` - From failed simple system
- 📦 `ai/models/spatial-fast-best.json` - From failed spatial system
- 📦 `ai/models/phase1-best.json` - From failed Phase 1
- 📦 `ai/models/phase15-best.json` - From failed Phase 1.5
- ✅ `ai/models/best-ai.json` - Keep (from original system)

### Checkpoints - Archive old ones

- 📦 `ai/checkpoints/checkpoint-gen60.json`
- 📦 `ai/checkpoints/checkpoint-gen65.json`
- 📦 `ai/checkpoints/checkpoint-gen70.json`
  Note: These are from the original 66-input system that showed regression

---

## Files to DELETE (No Value)

### Empty/Useless

- 🗑️ `ai/logs/diagnostic-dump.json` - Empty (0 turns captured)
- 🗑️ `ai/data/gameplay-recordings/.gitkeep` - Just a placeholder

### Potentially Redundant Tools

- 🗑️ `ai/training/verify-inputs.js` - Unclear if used
- 🗑️ `ai/training/test-runner.js` - Unclear if used

---

## New Structure (After Cleanup)

```
ai/
├── README.md                          # Main docs
├── QUICKSTART.md                     # Getting started
├── CURRENT_STATUS.md                 # NEW: Current state & next steps
├── package.json
├── training/                         # Core working system
│   ├── puppeteer-game-runner.js
│   ├── network-config.js
│   └── trainer.js
├── simple/                           # NEW: Fresh minimal approach
│   └── minimal-trainer.js            # To be created
├── models/                           # Active models only
│   └── best-ai.json
├── logs/                             # Active training logs
│   └── (cleaned out)
├── checkpoints/                      # Active checkpoints
│   └── (cleaned out)
├── archive/                          # Historical reference
│   ├── failed-attempts/              # All the "simple" experiments
│   ├── analysis/                     # All the MD analysis docs
│   ├── old-models/                   # Failed model files
│   └── old-checkpoints/              # Old checkpoint files
└── baselines/                        # Keep as-is
    └── baseline-v1.json
```

---

## Next Steps After Cleanup

1. **Create CURRENT_STATUS.md** - Document where we are and why
2. **Create minimal-trainer.js** - Ultra-simple 5-input approach with real spatial data
3. **Test 3 generations** - Prove learning is possible
4. **If successful**: Build up from there
5. **If fails**: Investigate fundamental algorithm issues

---

## Why This Cleanup Matters

- **Clarity**: Easy to see what's active vs historical
- **Focus**: No distractions from failed approaches
- **Learning**: Archive preserves lessons learned
- **Fresh start**: Clean slate for minimal approach

**Ready to execute this cleanup?**
