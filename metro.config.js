// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const defaultConfig = getDefaultConfig(__dirname);

// Evita mutações inseguras no objeto de configuração
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

module.exports = config;
