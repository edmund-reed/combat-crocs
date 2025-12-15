export default {
  id: "hotelOfHorror",
  name: "Hotel of Horror",
  description: "Spooky platforms suspended in a haunted atmosphere",
  backgroundColor: "#4B0082",
  backgroundKey: "generic-map",
  difficulty: 1,
  platforms: [
    { x: 250, bottom: 300, width: 150, height: 40 },
    { x: 950, bottom: 280, width: 150, height: 40 },
  ],
  groundTexture: "terrain",
  decorations: [
    {
      sprite: "hotel-horror",
      x: 600,
      bottom: 100,
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
};
