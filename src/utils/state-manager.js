// Combined Game State & Memory Management for Combat Crocs
// Handles game settings, configuration, state persistence, and resource cleanup

class StateManager {
  // ==================== GAME STATE MANAGEMENT ====================

  // Store weapon progression data for persistence across scenes
  static storeWeaponProgression(players) {
    if (!players || players.length === 0) return;

    const weaponData = {};
    players.forEach(player => {
      if (player.weaponStats) {
        weaponData[player.id] = player.weaponStats;
      }
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

  // Store player selections for team composition before starting battle
  static storeTeamSettings(teamACount, teamBCount) {
    window.CombatCrocs.gameState.game.teamACount = teamACount;
    window.CombatCrocs.gameState.game.teamBCount = teamBCount;

    // Also store in new teams array format for migration
    this.migrateToTeamsArray(teamACount, teamBCount);

    console.log(`Team settings stored: Team A: ${teamACount} crocs, Team B: ${teamBCount} crocs`);
  }

  // Get current team settings (backward compatibility)
  static getTeamSettings() {
    return {
      teamACount: window.CombatCrocs.gameState.game.teamACount || 1,
      teamBCount: window.CombatCrocs.gameState.game.teamBCount || 1,
    };
  }

  // Store teams as array (new format)
  static storeTeams(teams) {
    window.CombatCrocs.gameState.game.teams = teams;
    console.log(`Teams stored:`, teams);
  }

  // Initialize weapon stats for all teams
  static initializeTeamWeaponStats(teams) {
    const { initWeaponStats } = require("@weapons");
    teams.forEach(team => {
      if (!team.weaponStats) {
        team.weaponStats = initWeaponStats();
        console.log(`✅ Initialized weapon stats for Team ${team.id}`);
      }
    });
  }

  // Get teams array, fallback to legacy format if needed
  static getTeams() {
    if (window.CombatCrocs.gameState.game.teams) {
      return window.CombatCrocs.gameState.game.teams;
    }

    // Fallback to legacy teamA/teamB format
    const legacy = this.getTeamSettings();
    return this.migrateToTeamsArray(legacy.teamACount, legacy.teamBCount);
  }

  // Convert legacy teamA/teamB to teams array for compatibility
  static migrateToTeamsArray(teamACount, teamBCount) {
    const teams = [
      { id: 1, name: "Team 1", crocCount: teamACount, color: "orange" },
      { id: 2, name: "Team 2", crocCount: teamBCount, color: "green" },
    ];

    // Store for future use
    this.storeTeams(teams);
    return teams;
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

    // Clear browser timeouts (grenades, effects)
    scene.resourceRegistry.timeouts.forEach(timeoutId => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    // Cancel Phaser turn timer if active
    if (scene.turnManager?.currentTurnTimer) {
      scene.turnManager.currentTurnTimer.destroy();
      scene.turnManager.currentTurnTimer = null;
    }

    // Destroy Phaser graphics objects
    scene.resourceRegistry.graphics.forEach(graphics => {
      if (graphics && graphics.destroy) graphics.destroy();
    });

    // Destroy special effects (gravestones, explosions, etc.)
    scene.resourceRegistry.effects.forEach(effectData => {
      if (effectData) {
        if (effectData.gravestone) effectData.gravestone.destroy();
        if (effectData.ripText) effectData.ripText.destroy();
      }
    });

    console.log("✅ Automated cleanup complete");
  }
}

export default StateManager;
