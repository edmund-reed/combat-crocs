// Gameplay Recording System for AI Training
// Records game states, player actions, and outcomes for machine learning

import { Config, Logger } from "@config";

class GameplayRecorder {
  constructor() {
    this.isRecording = false;
    this.recording = [];
    this.currentTurn = null;
    this.gameMetadata = {
      startTime: null,
      endTime: null,
      mapId: null,
      players: [],
    };
  }

  startRecording(scene) {
    this.isRecording = true;
    this.recording = [];
    this.gameMetadata.startTime = Date.now();
    this.gameMetadata.mapId = scene.registry.get("selectedMap") || "unknown";
    this.gameMetadata.players = scene.players.map(p => ({
      id: p.id,
      team: p.team,
      characterType: p.characterType,
    }));

    Logger.info("🔴 Started recording gameplay for AI training");
  }

  stopRecording() {
    this.isRecording = false;
    this.gameMetadata.endTime = Date.now();
    Logger.info(`✅ Stopped recording. Captured ${this.recording.length} turns`);
  }

  recordTurnStart(scene) {
    if (!this.isRecording) return;

    const currentPlayerIndex = scene.turnManager.getCurrentPlayerIndex();
    const currentPlayer = scene.players[currentPlayerIndex];

    this.currentTurn = {
      turnNumber: scene.turnManager.turnCount,
      timestamp: Date.now(),
      state: this.captureGameState(scene, currentPlayer),
      action: null,
      result: null,
    };
  }

  recordAction(scene, action) {
    if (!this.isRecording || !this.currentTurn) return;

    this.currentTurn.action = {
      weaponUsed: action.weapon,
      aimAngle: action.aimAngle,
      targetX: action.targetX,
      targetY: action.targetY,
      movementUsed: action.movementUsed || { left: 0, right: 0 },
      timestamp: Date.now(),
    };
  }

  recordResult(scene, result) {
    if (!this.isRecording || !this.currentTurn) return;

    this.currentTurn.result = {
      damageDealt: result.damageDealt || 0,
      enemiesHit: result.enemiesHit || [],
      enemiesKilled: result.enemiesKilled || 0,
      hitSuccess: result.hitSuccess || false,
      selfDamage: result.selfDamage || 0,
    };

    // Save the completed turn
    this.recording.push({ ...this.currentTurn });
    this.currentTurn = null;
  }

  captureGameState(scene, currentPlayer) {
    const enemies = scene.players.filter(p => p.team !== currentPlayer.team && p.health > 0);
    const teammates = scene.players.filter(
      p => p.team === currentPlayer.team && p.id !== currentPlayer.id && p.health > 0,
    );

    return {
      // Current player state
      self: {
        health: currentPlayer.health,
        maxHealth: currentPlayer.maxHealth,
        x: currentPlayer.x,
        y: currentPlayer.y,
        velocityX: currentPlayer.body?.velocity?.x || 0,
        velocityY: currentPlayer.body?.velocity?.y || 0,
        aimAngle: currentPlayer.aimAngle || 0,
        team: currentPlayer.team,
      },

      // Enemy states (up to 4 enemies for neural network)
      enemies: enemies.slice(0, 4).map(enemy => ({
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        x: enemy.x,
        y: enemy.y,
        distance: Phaser.Math.Distance.Between(currentPlayer.x, currentPlayer.y, enemy.x, enemy.y),
        angle: Phaser.Math.Angle.Between(currentPlayer.x, currentPlayer.y, enemy.x, enemy.y),
        relativeHeight: enemy.y - currentPlayer.y,
        threat: enemy.lastDamageDealt || 0,
      })),

      // Teammate states
      teammates: teammates.map(teammate => ({
        health: teammate.health,
        distance: Phaser.Math.Distance.Between(currentPlayer.x, currentPlayer.y, teammate.x, teammate.y),
        inLastStand: teammate.inLastStand || false,
      })),

      // Weapon states
      weapons: {
        current: scene.turnManager.getCurrentWeapon(),
        ammo: { ...scene.turnManager.weaponAmmo },
      },

      // Game context
      context: {
        turnNumber: scene.turnManager.turnCount,
        timeRemaining: scene.turnManager.currentTurnTimer
          ? (scene.turnManager.currentTurnTimer.delay - scene.turnManager.currentTurnTimer.elapsed) / 1000
          : Config.TURN_TIME_LIMIT / 1000,
        hasAttacked: scene.hasAttackedThisTurn,
        canRevive: scene.canReviveThisTurn,
      },
    };
  }

  exportRecording() {
    if (this.recording.length === 0) {
      Logger.warn("No recording data to export");
      return;
    }

    const exportData = {
      metadata: this.gameMetadata,
      version: "1.0.0",
      totalTurns: this.recording.length,
      turns: this.recording,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `gameplay-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Logger.info(`📦 Exported ${this.recording.length} turns to gameplay-${Date.now()}.json`);
  }

  // Helper to encode state into neural network input format
  static encodeStateForTraining(state) {
    const inputs = [];

    // Self state (3 values)
    inputs.push(
      state.self.health / state.self.maxHealth,
      state.self.x / Config.GAME_WIDTH,
      state.self.y / Config.GAME_HEIGHT,
    );

    // Enemy states (16 values: 4 enemies × 4 features)
    for (let i = 0; i < 4; i++) {
      if (i < state.enemies.length) {
        const enemy = state.enemies[i];
        inputs.push(
          enemy.health / enemy.maxHealth,
          Math.min(enemy.distance / 1000, 1),
          (enemy.angle + Math.PI) / (Math.PI * 2), // Normalize to 0-1
          Math.min(enemy.threat / 100, 1),
        );
      } else {
        // Padding for missing enemies
        inputs.push(0, 0, 0, 0);
      }
    }

    // Weapon ammo (3 values)
    inputs.push(
      state.weapons.ammo.BAZOOKA || 0,
      state.weapons.ammo.GRENADE || 0,
      state.weapons.ammo.SHOTGUN || 0,
    );

    // Context (2 values)
    inputs.push(
      Math.min(state.context.turnNumber / 100, 1),
      state.context.timeRemaining / (Config.TURN_TIME_LIMIT / 1000),
    );

    return inputs; // Total: 24 inputs
  }

  // Helper to encode action into neural network output format
  static encodeActionForTraining(action, state) {
    const outputs = [];

    // Target selection (2 values)
    // Find which enemy was targeted based on aim angle and distance
    const targetIndex = GameplayRecorder.findTargetIndex(action, state);
    outputs.push(targetIndex === 0 ? 1 : 0, targetIndex === 1 ? 1 : 0);

    // Weapon choice (1 value: 0-0.33=bazooka, 0.34-0.66=grenade, 0.67-1=shotgun)
    const weaponValue = action.weaponUsed === "BAZOOKA" ? 0.16 : action.weaponUsed === "GRENADE" ? 0.5 : 0.83;
    outputs.push(weaponValue);

    // Aim angle (1 value: normalized to 0-1)
    outputs.push((action.aimAngle + Math.PI) / (Math.PI * 2));

    // Power (1 value: placeholder, always 1 for now)
    outputs.push(1.0);

    // Movement (1 value: -1=left, 0=stay, 1=right, normalized to 0-1)
    const movementValue = action.movementUsed.left > 0 ? 0 : action.movementUsed.right > 0 ? 1 : 0.5;
    outputs.push(movementValue);

    return outputs; // Total: 6 outputs
  }

  static findTargetIndex(action, state) {
    if (!state.enemies || state.enemies.length === 0) return 0;

    // Find enemy closest to aim angle
    let closestIndex = 0;
    let closestAngleDiff = Math.PI * 2;

    state.enemies.forEach((enemy, index) => {
      const angleDiff = Math.abs(enemy.angle - action.aimAngle);
      if (angleDiff < closestAngleDiff) {
        closestAngleDiff = angleDiff;
        closestIndex = index;
      }
    });

    return closestIndex;
  }
}

export default GameplayRecorder;
