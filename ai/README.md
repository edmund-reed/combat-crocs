# Combat Crocs AI Training System

This directory contains the machine learning training infrastructure for Combat Crocs AI opponents.

## 🧬 Architecture

The AI uses **Neuroevolution** (genetic algorithms + neural networks) with a hybrid training approach:

1. **Imitation Learning**: AI learns from recorded human gameplay
2. **Evolutionary Training**: AI improves through self-play and evolution

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

### 2. Record Gameplay Data

- Run the game with recording mode
- Press `K` to start/stop recording
- Play 30-50 games to create training dataset
- Recordings saved to `data/gameplay-recordings/`

### 3. Train AI Models

```bash
npm run train
```

Training will:

- Phase 1: Learn from recorded games (imitation)
- Phase 2: Evolve through self-play (200+ generations)
- Export models to `models/` directory

### 4. Monitor Training (Optional)

```bash
npm run train-ui
```

Open http://localhost:3001 for live training dashboard

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
