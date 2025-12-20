// Combined Game State & Memory Management for Combat Crocs
// Handles game settings, configuration, state persistence, and resource cleanup

import { initWeaponStats } from "@weapons";

class StateManager {
  // ==================== GAME STATE MANAGEMENT ====================

  // Store weapon progression data for persistence across scenes
  static storeWeaponProgression(players) {
    if (!players || players.length === 0) return;

    const weaponData = {};

    players.forEach(player => {
      if (player.weaponStats) weaponData[player.id] = player.weaponStats;
    });

    window.CombatCrocs.gameState.game.weaponProgression = weaponData;
    console.log("🎯 Weapon progression stored:", weaponData);
  }

  // Restore weapon progression data to players
  static restoreWeaponProgression(players) {
    const weaponData = window.CombatCrocs.gameState.game.weaponProgression;

    if (!weaponData || !players) return;

    players.forEach(player => {
      if (weaponData[player.id]) {
        player.weaponStats = weaponData[player.id];
        console.log(`🎯 Restored weapon stats for Player ${player.id}`);
      }
    });
  }

  // Clear weapon progression (e.g., when starting a new game)
  static clearWeaponProgression() {
    window.CombatCrocs.gameState.game.weaponProgression = {};
    console.log("🎯 Weapon progression cleared");
  }

  // Store teams as array (new format)
  static storeTeams(teams) {
    window.CombatCrocs.gameState.game.teams = teams;
    console.log(`Teams stored:`, teams);
  }

  // Initialize weapon stats for all teams
  static initializeTeamWeaponStats(teams) {
    teams.forEach(team => {
      if (!team.weaponStats) {
        team.weaponStats = initWeaponStats();
        console.log(`✅ Initialized weapon stats for Team ${team.id}`);
      }
    });
  }

  static getTeams() {
    return window.CombatCrocs.gameState.game.teams ?? [];
  }

  // ==================== MEMORY MANAGEMENT ====================

  // Initialize memory management for a Phaser scene
  static initialize(scene) {
    // Initialize cleanup registry - automatic resource management
    scene.resourceRegistry = {
      timeouts: new Set(),
      graphics: new Set(),
      effects: new Set(), // explosions, gravestones, etc.
    };

    // Register cleanup handler (Phaser automatically calls this on scene destroy)
    scene.events.once("destroy", () => this._performCleanupRegistry(scene));

    console.log("🧠 Memory management initialized for scene");
  }

  // Register resources for automatic cleanup
  static registerCleanup(scene, resource, type) {
    if (scene.resourceRegistry[type] && resource) {
      scene.resourceRegistry[type].add(resource);
    }
  }

  // Remove resources from cleanup registry (rarely needed since scene destroy clears all)
  static unregisterCleanup(scene, resource, type) {
    if (scene.resourceRegistry[type] && resource) {
      scene.resourceRegistry[type].delete(resource);
    }
  }

  // Automated cleanup - called automatically by Phaser on scene destruction
  static _performCleanupRegistry(scene) {
    console.log("🔄 Automated cleanup starting...");
    scene.resourceRegistry.timeouts.forEach(timeoutId => timeoutId && clearTimeout(timeoutId));

    // Cancel Phaser turn timer if active
    if (scene.turnManager?.currentTurnTimer) {
      scene.turnManager.currentTurnTimer.destroy();
      scene.turnManager.currentTurnTimer = null;
    }

    scene.resourceRegistry.graphics.forEach(graphics => graphics?.destroy?.());
    scene.resourceRegistry.effects.forEach(effectData => effectData?.gravestone?.destroy());
    console.log("✅ Automated cleanup complete");
  }
}

export default StateManager;
