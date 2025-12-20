import { MAP_CONFIGS, THEME_PARKS } from "@maps";

class MapManager {
  constructor() {
    this.themeParks = THEME_PARKS;
    this.maps = Object.fromEntries(
      Object.entries(MAP_CONFIGS).map(([id, cfg]) => [
        id,
        {
          ...cfg,
          terrain: {
            platforms: cfg.platforms,
            groundVariation: cfg.groundVariation,
            decorations: cfg.decorations || [],
            groundTexture: cfg.groundTexture || "terrain",
          },
        },
      ]),
    );
    this.currentMap = null;
    this.selectedThemePark = null;
  }

  setSelectedThemePark = themeParkId => (this.selectedThemePark = themeParkId);
  getSelectedThemePark = () => this.selectedThemePark;
  getMap = mapId => this.maps[mapId] || this.maps.classic;
  getCurrentMap = () => this.currentMap || this.maps.classic;
  setCurrentMap = mapId => (this.currentMap = this.getMap(mapId));
}

export default new MapManager();
