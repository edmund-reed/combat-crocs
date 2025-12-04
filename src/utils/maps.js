// Map Manager for Combat Crocs - handles theme parks and rides (maps/levels)
// Provides clean abstraction for map definitions and terrain generation

class MapManager {
  constructor() {
    this.themeParks = {};
    this.maps = {};
    this.currentMap = null;
    this.selectedThemePark = null;
    this.registerThemeParks();
    this.registerMaps();
  }

  // Register all theme parks
  registerThemeParks() {
    this.themeParks.movieStudios = {
      id: "movieStudios",
      name: "Movie Studios Adventure",
      description: "Action-packed rides inspired by blockbuster movies",
      maps: ["magnificentBulk", "dinocoaster"],
    };

    this.themeParks.magicalLand = {
      id: "magicalLand",
      name: "Magical Land",
      description: "Enchanted attractions full of wonder and mystery",
      maps: ["hotelOfHorror", "heavyMetalCoaster"],
    };
  }

  // Register all available maps (rides)
  registerMaps() {
    this.maps.magnificentBulk = this.createMagnificentBulkMap();
    this.maps.dinocoaster = this.createDinocoasterMap();
    this.maps.hotelOfHorror = this.createHotelOfHorrorMap();
    this.maps.heavyMetalCoaster = this.createHeavyMetalCoasterMap();
  }

  // Movie Studios - The Magnificent Bulk (repurposed classic map)
  createMagnificentBulkMap() {
    return {
      id: "magnificentBulk",
      name: "The Magnificent Bulk",
      description: "Smash through floating platforms in this superhero-themed arena",
      terrain: {
        platforms: [
          { x: 400, y: "GAME_HEIGHT - 125", width: 200, height: 50 },
          { x: 700, y: "GAME_HEIGHT - 175", width: 150, height: 50 },
          { x: 950, y: "GAME_HEIGHT - 225", width: 100, height: 50 },
        ],
        groundVariation: true,
      },
      backgroundColor: "#87CEEB",
      difficulty: 1,
    };
  }

  // Movie Studios - Dinocoaster (repurposed mountain map)
  createDinocoasterMap() {
    return {
      id: "dinocoaster",
      name: "Dinocoaster",
      description: "Navigate treacherous prehistoric terrain with strategic positions",
      terrain: {
        platforms: [
          { x: 300, y: "GAME_HEIGHT - 150", width: 100, height: 60 },
          { x: 600, y: "GAME_HEIGHT - 200", width: 80, height: 50 },
          { x: 900, y: "GAME_HEIGHT - 250", width: 150, height: 70 },
          { x: 500, y: "GAME_HEIGHT - 300", width: 120, height: 55 },
          { x: 850, y: "GAME_HEIGHT - 375", width: 80, height: 45 },
        ],
        groundVariation: false,
      },
      backgroundColor: "#4682B4",
      difficulty: 2,
    };
  }

  // Magical Land - Hotel of Horror
  createHotelOfHorrorMap() {
    return {
      id: "hotelOfHorror",
      name: "Hotel of Horror",
      description: "Spooky platforms suspended in a haunted atmosphere",
      terrain: {
        platforms: [
          { x: 350, y: "GAME_HEIGHT - 140", width: 180, height: 55 },
          { x: 650, y: "GAME_HEIGHT - 190", width: 160, height: 50 },
          { x: 900, y: "GAME_HEIGHT - 160", width: 140, height: 60 },
        ],
        groundVariation: true,
      },
      backgroundColor: "#4B0082",
      difficulty: 1,
    };
  }

  // Magical Land - Heavy-Metal Coaster
  createHeavyMetalCoasterMap() {
    return {
      id: "heavyMetalCoaster",
      name: "Heavy-Metal Coaster",
      description: "Rock out on this intense roller coaster with challenging platforms",
      terrain: {
        platforms: [
          { x: 250, y: "GAME_HEIGHT - 180", width: 120, height: 50 },
          { x: 500, y: "GAME_HEIGHT - 240", width: 100, height: 55 },
          { x: 750, y: "GAME_HEIGHT - 200", width: 130, height: 50 },
          { x: 950, y: "GAME_HEIGHT - 280", width: 110, height: 60 },
        ],
        groundVariation: false,
      },
      backgroundColor: "#8B008B",
      difficulty: 2,
    };
  }

  // Get all theme park IDs
  getThemeParkIds() {
    return Object.keys(this.themeParks);
  }

  // Get theme park by ID
  getThemePark(themeParkId) {
    return this.themeParks[themeParkId];
  }

  // Get all theme parks
  getThemeParks() {
    return this.themeParks;
  }

  // Set selected theme park
  setSelectedThemePark(themeParkId) {
    this.selectedThemePark = themeParkId;
  }

  // Get selected theme park
  getSelectedThemePark() {
    return this.selectedThemePark;
  }

  // Get maps for a specific theme park
  getMapsForThemePark(themeParkId) {
    const themePark = this.themeParks[themeParkId];
    return themePark ? themePark.maps : [];
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
const mapManagerInstance = new MapManager();

export default mapManagerInstance;
