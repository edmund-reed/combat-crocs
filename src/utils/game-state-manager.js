// Game State Management Utilities for Combat Crocs
// Handles game settings, configuration, and state persistence

class GameStateManager {
  // Store player selections for team composition before starting battle
  static storeTeamSettings(teamACount, teamBCount) {
    window.CombatCrocs.gameState.game.teamACount = teamACount;
    window.CombatCrocs.gameState.game.teamBCount = teamBCount;
    console.log(`Team settings stored: Team A: ${teamACount} crocs, Team B: ${teamBCount} crocs`);
  }

  // Get current team settings
  static getTeamSettings() {
    return {
      teamACount: window.CombatCrocs.gameState.game.teamACount || 1,
      teamBCount: window.CombatCrocs.gameState.game.teamBCount || 1,
    };
  }
}

window.GameStateManager = GameStateManager;
