const path = require("path");
const webpack = require("webpack");

module.exports = {
  mode: "development",
  entry: "./src/game.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname),
    },
    compress: true,
    port: 3001,
    hot: true,
  },
  resolve: {
    alias: {
      "@config": path.resolve(__dirname, "src/config.js"),
      "@player": path.resolve(__dirname, "src/player"),
      "@scenes": path.resolve(__dirname, "src/scenes"),
      "@terrain": path.resolve(__dirname, "src/terrain"),
      "@ui": path.resolve(__dirname, "src/ui"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@weapons": path.resolve(__dirname, "src/weapons"),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    }),
  ],
};
