const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .wasm to asset extensions so Metro can bundle it
config.resolver.assetExts.push('wasm');

module.exports = config;