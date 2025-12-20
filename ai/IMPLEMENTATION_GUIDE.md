# Combat Crocs AI - Implementation Guide

**Last Updated:** December 20, 2025  
**Status:** Phase 1 Complete, Phase 2 Ready

## 🎉 BREAKTHROUGH: Puppeteer System Complete!

**We chose a different path and it worked!** Instead of building a headless simulator, we use **Puppeteer to control the real game in a browser**. This approach:

- ✅ Uses 100% accurate game physics (no approximation needed)
- ✅ Reduces implementation complexity significantly
- ✅ Makes debugging easier (can watch the AI play)
- ✅ Already complete and functional!

**See [STATUS.md](STATUS.md) for complete technical details.**

---

## ✅ COMPLETED: Phase 1 - Puppeteer Game Automation

### What's Been Built

#### 1. **Recording System** (`src/utils/gameplay-recorder.js`)

- ✅ Captures complete game state every turn
- ✅ Records player actions (aim angle, weapon choice, movement)
- ✅ Records results (damage dealt, enemies hit, accuracy)
- ✅ Exports training data as JSON files
- ✅ Encodes data in neural network-ready format

#### 2. **Game Integration**

- ✅ Recording toggle with 'K' key
- ✅ Hooks into turn manager
- ✅ Hooks into input manager
- ✅ Hooks into explosion system
- ✅ Visual feedback for recording status

#### 3. **AI Infrastructure** (`ai/` directory)

- ✅ Separate package structure
- ✅ Network configuration (`ai/training/network-config.js`)
- ✅ Input/output encoding functions
- ✅ 24-input, 6-output architecture defined

### How to Use What's Built

#### Step 1: Record Training Data

```bash
# Start the game
npm start

# In-game: Press 'K' to start recording
# Play 30-50 games naturally
# Press 'K' again to stop and download JSON
```

#### Step 2: Organize Training Data

```bash
# Move downloaded files to:
ai/data/gameplay-recordings/gameplay-1234567890.json
```

## 🚧 TODO: Remaining Implementation

### Phase 2: Neural Network Integration (Est. 2-3 days)

#### A. Replace Random Decisions with Networks

**Current State:** AI makes random decisions in `puppeteer-game-runner.js`

**Goal:** Use neural networks to make intelligent decisions

**Implementation:**

```javascript
// In puppeteer-game-runner.js
makeAIDecision(gameState, network) {
  // 1. Encode game state (24 inputs)
  const inputs = encodeGameState(gameState);

  // 2. Run through network
  const outputs = network.activate(inputs);

  // 3. Decode to actions
  return decodeNetworkOutput(outputs, gameState);
}
```

**Dependencies:** Already installed!

- `neataptic` - ✅ In package.json

**Complexity:** ~100 lines
**Time:** 1-2 hours

#### B. Implement Evolutionary Training (`ai/training/trainer.js`)

**Hybrid Training Approach:**

**Phase 1: Imitation Learning**

```javascript
// Load recorded gameplay
// Train networks to mimic human decisions
// Gives AI baseline competence
```

**Phase 2: Evolutionary Training**

```javascript
// Create population of 50 networks
// Each network plays 10 games per generation
// Top 20% survive and reproduce
// Mutations add variation
// Repeat for 200-500 generations
```

**Fitness Function:**

```javascript
fitness = (damageDealt × 2) +
          (survivalTime) +
          (win ? 100 : 0) +
          (accuracy × 50) +
          (kills × 25)
```

**Complexity:** ~800 lines
**Time:** 1-2 weeks
**Training Duration:** 2-8 hours on laptop

#### D. Training Dashboard (`ai/ui/`)

**Simple Express Server:**

- Real-time generation updates
- Fitness charts
- Win rate tracking
- Best network preview
- Export controls

**Complexity:** ~300 lines HTML/JS
**Time:** 2-3 days
**Optional but helpful**

### Phase 3: Game Integration (Est. 1 week)

#### A. Lightweight AI Controller (`src/ai/ai-controller.js`)

**Purpose:** Load trained models and make decisions in-game

```javascript
class AIController {
  constructor(difficulty) {
    // Load pre-trained network (easy/medium/hard)
    this.brain = loadNetwork(`ai/models/${difficulty}-ai.json`);
  }

  async decideTurn(scene) {
    // 1. Encode game state
    // 2. Run through neural network
    // 3. Decode output into actions
    // 4. Add human-like delay
    return { weapon, aimAngle, target };
  }
}
```

**Complexity:** ~200 lines
**Time:** 2-3 days

#### B. Team Setup Modifications

Add AI toggle to team selection screen:

- Checkbox for "AI Controlled"
- Dropdown for difficulty (Easy/Medium/Hard)
- Visual indicator (robot icon)

**Complexity:** ~100 lines
**Time:** 1 day

#### C. Turn Manager Integration

Modify `TurnManager.startTurn()`:

```javascript
if (currentPlayer.isAI) {
  await this.executeAITurn(currentPlayer);
}
```

**Complexity:** ~150 lines
**Time:** 1 day

## 📊 Estimated Timeline

| Phase     | Task                    | Duration     | Status       |
| --------- | ----------------------- | ------------ | ------------ |
| 1         | Recording System        | 3-4 days     | ✅ COMPLETE  |
| 2a        | Headless Simulator      | 5-7 days     | 🔜 NEXT      |
| 2b        | Neuroevolution          | 7-10 days    | 🔜 TODO      |
| 2c        | Training Dashboard      | 2-3 days     | 🔜 TODO      |
| 3         | Game Integration        | 5-7 days     | 🔜 TODO      |
| **TOTAL** | **Full Implementation** | **~4 weeks** | **25% DONE** |

## 🎯 Alternative: Quick MVP

If you want AI opponents **faster** (1 week instead of 4):

### Option: Rule-Based AI First

Build traditional game AI now, then enhance with ML later:

**Advantages:**

- Working AI in 3-5 days
- Can still collect training data
- Can upgrade to ML AI later
- Provides baseline for ML comparison

**Implementation:**

```javascript
class RuleBasedAI {
  decideTurn(gameState) {
    // 1. Find weakest enemy
    // 2. Calculate trajectory
    // 3. Add difficulty-based error
    // 4. Execute shot
  }
}
```

**Then later:** Train ML AI to beat rule-based AI

## 🚀 Recommended Next Steps

### Immediate (This Week):

1. **Record Training Data**

   - Play 30-50 games with recording on
   - Save all JSON files to `ai/data/gameplay-recordings/`

2. **Choose Path:**
   - **Path A:** Continue with ML (follow Phase 2 above)
   - **Path B:** Quick rule-based MVP (1 week to playable AI)

### Decision Point:

**Go with ML if:**

- Want cutting-edge AI as USP
- Have 3-4 weeks available
- Excited about ML challenge

**Go with Rule-Based if:**

- Need playable AI ASAP
- Want to test AI gameplay first
- Can add ML later as upgrade

## 🎯 Tactical Training Objectives

### Strategic Depth Goals

The AI should learn **tactical decision-making** beyond basic gameplay:

#### 1. **Character Type Strategy**

- Learn effectiveness of each character type (Croc/Gecko/Chameleon/Dino)
- Discover optimal character matchups
- Identify "meta" character choices through evolution

#### 2. **Weapon Choice Tactics**

- **Optimal Play**: Choose best weapon for each situation
- **Upgrade Farming**: Use suboptimal weapons to gain XP/upgrades
- Balance short-term effectiveness vs long-term power

#### 3. **Weapon Upgrade Decisions**

- Prioritize which weapons to upgrade first
- Learn when upgrade investment pays off
- Discover optimal upgrade paths

#### 4. **Emergent Strategy Discovery**

Through 200-500 generations of evolution, the AI will discover:

- Best character + weapon combinations
- Optimal upgrade strategies
- Trade-offs between immediate damage and long-term power
- Meta strategies not obvious to human players

### Enhanced Fitness Function

```javascript
fitness =
  (damageDealt × 2) +           // Reward effectiveness
  (kills × 25) +                // Reward eliminations
  (survivalTime) +              // Reward longevity
  (weaponVariety × 10) +        // NEW: Encourage using all weapons
  (upgradeProgress × 15) +      // NEW: Reward weapon upgrades
  (characterEffectiveness × 20) // NEW: Reward good character picks
  + (win ? 100 : 0);            // Reward victory
```

### Extended Neural Network Inputs

**Enhanced Architecture (32 inputs):**

- Self state: health, position (2)
- Enemy states: health, distance, angle, threat ×4 (16)
- Weapon ammo: bazooka, grenade, shotgun (3)
- **Character type: one-hot encoded ×4** (4) **NEW**
- **Weapon upgrade levels: bazooka, grenade, shotgun** (3) **NEW**
- **XP progress to next upgrade** (1) **NEW**
- Context: turn number, time remaining (3)

This allows AI to learn: _"Gecko + upgraded shotgun = powerful combo"_

### Post-Training Analysis

After training completes, analyze results to discover:

- Win rate by character type
- Most successful weapon combinations
- Optimal upgrade paths
- Character effectiveness rankings
- Emergent tactical patterns

## 📝 Notes

- Recording system is production-ready
- Can record during development or testing
- More training data = better AI
- ML training is one-time cost
- Trained models are tiny (~5KB)
- AI runs offline, no API calls needed
- **AI will teach us about optimal game strategy!**

## 🤔 Questions?

- Need help with simulator physics?
- Want guidance on neuroevolution?
- Unsure which path to choose?
- Need architecture clarification?

Let me know and I can provide detailed implementation for any component!
