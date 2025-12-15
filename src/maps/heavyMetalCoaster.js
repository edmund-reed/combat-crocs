export default {
  id: "heavyMetalCoaster",
  name: "Heavy-Metal Coaster",
  description: "Rock out on this intense roller coaster with challenging platforms",
  backgroundColor: "#8B008B",
  backgroundKey: "heavy-metal-coaster-bg",
  difficulty: 2,
  platforms: [],
  groundTexture: "terrain-2",
  decorations: [
    {
      sprite: "metal-coaster",
      x: 600,
      bottom: 100,
      originX: 0.5,
      originY: 1,
      relativeWidth: 0.5,
      physicsJson: "metal-coaster-physics", // PhysicsEditor JSON for precise collision
    },
    {
      sprite: "donut-coaster",
      x: 150,
      bottom: 270,
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
      bottom: 100,
      originX: 0.5,
      originY: 1,
      relativeWidth: 0.17,
      physicsJson: "palm-tree-coaster-physics",
      shapeKey: "palm-tree", // Key in JSON file
    },
  ],
  groundVariation: false,
};
