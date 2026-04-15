const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Redirect `expo-router` imports to a local stub. The SDK's
    // useAppStateHandler hook hard-imports expo-router at module load,
    // which would otherwise force this bare RN demo to pull in the
    // entire Expo ecosystem just to satisfy Metro's dependency graph.
    // See expo-router-stub.js for context.
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'expo-router') {
        return {
          type: 'sourceFile',
          filePath: path.resolve(__dirname, 'expo-router-stub.js'),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
