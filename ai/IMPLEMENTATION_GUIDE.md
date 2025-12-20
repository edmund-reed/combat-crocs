# Combat Crocs AI - Implementation Guide

## ✅ COMPLETED: Phase 1 - Data Collection Infrastructure

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

### Phase 2: Training System (Est. 2-3 weeks)

#### A. Install Dependencies

```bash
cd ai
npm install
```

This will install:

- `neataptic` - Neuroevolution library
- `express` - Training UI server
- `ws` - WebSocket for live updates

#### B. Build Headless Simulator (`ai/training/simulator.js`)

**Purpose:** Run game logic without Phaser rendering (100-1000x faster)

**Key Components:**

```javascript
class HeadlessSimulator {
  // Simplified game state
  - Players (health, position, team)
  - Physics (basic projectile trajectories)
  - Damage calculations
  - Win conditions

  // Fast simulation
  simulateGame(network1, network2) {
    // Run entire game in <1 second
    // Return: winner, damage stats, survival time
  }
}
```

**Complexity:** ~500 lines
**Time:** 1 week
**Note:** Can simplify physics - just need reasonable approximations

#### C. Implement Neuroevolution (`ai/training/trainer.js`)

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

## 📝 Notes

- Recording system is production-ready
- Can record during development or testing
- More training data = better AI
- ML training is one-time cost
- Trained models are tiny (~5KB)
- AI runs offline, no API calls needed

## 🤔 Questions?

- Need help with simulator physics?
- Want guidance on neuroevolution?
- Unsure which path to choose?
- Need architecture clarification?

Let me know and I can provide detailed implementation for any component!
