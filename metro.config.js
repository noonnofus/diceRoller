const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.resolver.assetExts.push("db", "mp3", "ttf", "obj", "png", "jpg");
  config.resolver.sourceExts = [
    ...config.resolver.sourceExts,
    "js",
    "jsx",
    "ts",
    "tsx",
    "obj",
  ];

  return config;
})();
