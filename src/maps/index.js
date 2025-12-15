import magnificentBulk from "./magnificentBulk";
import dinocoaster from "./dinocoaster";
import hotelOfHorror from "./hotelOfHorror";
import heavyMetalCoaster from "./heavyMetalCoaster";

export const MAP_CONFIGS = {
  magnificentBulk,
  dinocoaster,
  hotelOfHorror,
  heavyMetalCoaster,
};

export const THEME_PARKS = {
  movieStudios: {
    id: "movieStudios",
    name: "Movie Studios Adventure",
    description: "Action-packed rides inspired by blockbuster movies",
    maps: ["magnificentBulk", "dinocoaster"],
  },
  magicalLand: {
    id: "magicalLand",
    name: "Magical Land",
    description: "Enchanted attractions full of wonder and mystery",
    maps: ["hotelOfHorror", "heavyMetalCoaster"],
  },
};
