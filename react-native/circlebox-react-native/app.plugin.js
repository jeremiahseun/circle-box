const { createRunOncePlugin } = require('expo/config-plugins');
const pkg = require('./package.json');

const withCircleBoxReactNative = (config) => {
  // CircleBox autolinks via React Native. Keep plugin lightweight for Expo prebuild compatibility.
  return config;
};

module.exports = createRunOncePlugin(withCircleBoxReactNative, pkg.name, pkg.version);
