const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  server: {
    enhanceMiddleware: (middleware, metroServer) => (req, res, next) => {
      // Metro's Bundler catches initialization errors. Await the graph itself
      // so early requests wait, and initialization failures retain their cause.
      metroServer
        .getBundler()
        .getBundler()
        .getDependencyGraph()
        .then(async graph => {
          await graph.ready();
          middleware(req, res, next);
        })
        .catch(next);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
