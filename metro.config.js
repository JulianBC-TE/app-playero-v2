// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const defaultConfig = getDefaultConfig(__dirname);
// ✅ Push to defaultConfig BEFORE building config
defaultConfig.resolver.sourceExts.push("sql");

const config = withNativeWind(
  {
    ...defaultConfig,
    transformer: {
      ...defaultConfig.transformer,
    },
    resolver: {
      ...defaultConfig.resolver,
    },
  },
  {
    input: "./global.css",
  }
);

// ✅ Only one export
module.exports = config;