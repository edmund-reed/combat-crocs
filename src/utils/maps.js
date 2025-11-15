// Map Manager for Combat Crocs - handles multiple game maps/levels
// Provides clean abstraction for map definitions and terrain generation

class MapManager {
  constructor() {
    this.maps = {};
    this.currentMap = null;
    this.registerMaps();
  }

  // Register all available maps
  registerMaps() {
    this.maps.classic = this.createClassicMap();
    this.maps.mountain = this.createMountainMap();
  }

  // Create the classic arena map (original terrain)
  createClassicMap() {
    return {
      id: "classic",
      name: "Classic Arena",
      description:
        "The original battlefield with floating platforms and smooth terrain",
      terrain: {
        platforms: [
          { x: 400, y: "GAME_HEIGHT - 125", width: 200, height: 50 },
          { x: 700, y: "GAME_HEIGHT - 175", width: 150, height: 50 },
          { x: 950, y: "GAME_HEIGHT - 225", width: 100, height: 50 },
        ],
        groundVariation: true, // Uses procedural ground height variation
      },
      backgroundColor: "#87CEEB",
      difficulty: 1,
    };
  }

  // Create mountain warfare map with different terrain
  createMountainMap() {
    return {
      id: "mountain",
      name: "Mountain Warfare",
      description:
        "Rugged mountain terrain with strategic high ground positions",
      terrain: {
        platforms: [
          { x: 300, y: "GAME_HEIGHT - 150", width: 100, height: 60 },
          { x: 600, y: "GAME_HEIGHT - 200", width: 80, height: 50 },
          { x: 900, y: "GAME_HEIGHT - 250", width: 150, height: 70 },
          { x: 500, y: "GAME_HEIGHT - 300", width: 120, height: 55 },
          { x: 850, y: "GAME_HEIGHT - 375", width: 80, height: 45 },
        ],
        groundVariation: false, // Flat ground for mountain base
      },
      backgroundColor: "#4682B4",
      difficulty: 2,
    };
  }

  // Get all available map IDs
  getMapIds() {
    return Object.keys(this.maps);
  }

  // Get specific map by ID
  getMap(mapId) {
    return this.maps[mapId] || this.maps.classic; // Fallback to classic
  }

  // Get current selected map
  getCurrentMap() {
    return this.currentMap || this.maps.classic;
  }

  // Set current map (storage for game session)
  setCurrentMap(mapId) {
    this.currentMap = this.getMap(mapId);
    return this.currentMap;
  }

  // Get map display info for UI
  getMapDisplayInfo(mapId) {
    const map = this.getMap(mapId);
    return {
      id: map.id,
      name: map.name,
      description: map.description,
      backgroundColor: map.backgroundColor,
      difficulty: map.difficulty,
      platformCount: map.terrain.platforms.length,
    };
  }
}

// Singleton instance
window.MapManager = new MapManager();
