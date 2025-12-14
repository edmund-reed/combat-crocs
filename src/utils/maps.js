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

  // Map definitions - data-driven configuration
  static MAP_CONFIGS = {
    magnificentBulk: {
      id: "magnificentBulk",
      name: "The Magnificent Bulk",
      description: "Smash through floating platforms in this superhero-themed arena",
      backgroundColor: "#87CEEB",
      difficulty: 1,
      platforms: [
        { x: 400, y: "GAME_HEIGHT - 125", width: 200, height: 50 },
        { x: 700, y: "GAME_HEIGHT - 175", width: 150, height: 50 },
        { x: 950, y: "GAME_HEIGHT - 225", width: 100, height: 50 },
      ],
      groundVariation: true,
    },
    dinocoaster: {
      id: "dinocoaster",
      name: "Dinocoaster",
      description: "Navigate treacherous prehistoric terrain with strategic positions",
      backgroundColor: "#4682B4",
      difficulty: 2,
      platforms: [
        { x: 300, y: "GAME_HEIGHT - 150", width: 100, height: 60 },
        { x: 600, y: "GAME_HEIGHT - 200", width: 80, height: 50 },
        { x: 900, y: "GAME_HEIGHT - 250", width: 150, height: 70 },
        { x: 500, y: "GAME_HEIGHT - 300", width: 120, height: 55 },
        { x: 850, y: "GAME_HEIGHT - 375", width: 80, height: 45 },
      ],
      groundVariation: false,
    },
    hotelOfHorror: {
      id: "hotelOfHorror",
      name: "Hotel of Horror",
      description: "Spooky platforms suspended in a haunted atmosphere",
      backgroundColor: "#4B0082",
      difficulty: 1,
      platforms: [
        { x: 250, y: "GAME_HEIGHT - 300", width: 150, height: 40 },
        { x: 950, y: "GAME_HEIGHT - 280", width: 150, height: 40 },
      ],
      decorations: [
        {
          sprite: "hotel-horror",
          x: 600,
          y: "GAME_HEIGHT - 100",
          originX: 0.5,
          originY: 1,
          scale: 0.5,
          children: [
            {
              sprite: "elevator-horror",
              x: -200,
              y: -800, // top position
              displayWidth: 200,
              hasPhysics: true,
              animate: {
                axis: "y",
                toOffset: -180, // bottom position
                durationMs: 4000,
                yoyo: true,
                repeat: -1,
              },
            },
            {
              sprite: "elevator-horror",
              x: 100,
              y: -180, // bottom position
              displayWidth: 200,
              hasPhysics: true,
              animate: {
                axis: "y",
                toOffset: -800, // top position
                durationMs: 4000,
                yoyo: true,
                repeat: -1,
              },
            },
          ],
        },
      ],
      groundVariation: true,
    },
    heavyMetalCoaster: {
      id: "heavyMetalCoaster",
      name: "Heavy-Metal Coaster",
      description: "Rock out on this intense roller coaster with challenging platforms",
      backgroundColor: "#8B008B",
      difficulty: 2,
      platforms: [],
      decorations: [
        {
          sprite: "metal-coaster",
          x: 600,
          y: "GAME_HEIGHT - 100",
          originX: 0.5,
          originY: 1,
          relativeWidth: 0.5,
          physicsJson: "metal-coaster-physics", // PhysicsEditor JSON for precise collision
        },
        {
          sprite: "donut-coaster",
          x: 150,
          y: "GAME_HEIGHT - 270",
          originX: 0.5,
          originY: 0.5,
          relativeWidth: 0.15,
          physicsJson: "donut-coaster-physics",
          shapeKey: "donut", // Key in JSON file
          rotating: true,
          rotationSpeed: 0.2,
        },
        {
          sprite: "palm-tree-coaster",
          x: 1070,
          y: "GAME_HEIGHT - 100",
          originX: 0.5,
          originY: 1,
          relativeWidth: 0.17,
          physicsJson: "palm-tree-coaster-physics",
          shapeKey: "palm-tree", // Key in JSON file
        },
      ],
      groundVariation: false,
    },
  };

  // Register all available maps (rides) from config
  registerMaps() {
    Object.keys(MapManager.MAP_CONFIGS).forEach(mapId => {
      this.maps[mapId] = this.createMapFromConfig(MapManager.MAP_CONFIGS[mapId]);
    });
  }

  // Factory method to create map from configuration
  createMapFromConfig(config) {
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      terrain: {
        platforms: config.platforms,
        groundVariation: config.groundVariation,
        decorations: config.decorations || [],
      },
      backgroundColor: config.backgroundColor,
      difficulty: config.difficulty,
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
