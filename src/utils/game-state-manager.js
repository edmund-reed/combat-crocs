// Game State Management Utilities for Combat Crocs
// Handles game settings, configuration, and state persistence

class GameStateManager {
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
}

window.GameStateManager = GameStateManager;
