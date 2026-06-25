const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ukloni problematični paket koji uzrokuje Hermes build grešku
config.resolver.blockList = [
  /node_modules\/@opentelemetry\/.*/,
];

module.exports = config;