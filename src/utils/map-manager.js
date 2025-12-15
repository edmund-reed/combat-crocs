// Map Manager for Combat Crocs - handles theme parks and rides (maps/levels)
// Provides clean abstraction for map definitions and terrain generation

import { MAP_CONFIGS, THEME_PARKS } from "@maps";

class MapManager {
  constructor() {
    this.themeParks = THEME_PARKS;
    this.maps = {};
    this.currentMap = null;
    this.selectedThemePark = null;
    this.registerMaps();
  }

  // Register all available maps (rides) from config
  registerMaps() {
    Object.keys(MAP_CONFIGS).forEach(mapId => {
      this.maps[mapId] = this.createMapFromConfig(MAP_CONFIGS[mapId]);
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
        groundTexture: config.groundTexture || "terrain",
      },
      backgroundColor: config.backgroundColor,
      backgroundKey: config.backgroundKey,
      difficulty: config.difficulty,
    };
  }

  setSelectedThemePark(themeParkId) {
    this.selectedThemePark = themeParkId;
  }

  getSelectedThemePark() {
    return this.selectedThemePark;
  }

  getMap(mapId) {
    return this.maps[mapId] || this.maps.classic; // Fallback to classic
  }

  getCurrentMap() {
    return this.currentMap || this.maps.classic;
  }

  // Set current map (storage for game session)
  setCurrentMap(mapId) {
    this.currentMap = this.getMap(mapId);
    return this.currentMap;
  }
}

// Singleton instance
const mapManagerInstance = new MapManager();

export default mapManagerInstance;
