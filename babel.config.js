module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-web',
      '@babel/plugin-transform-class-static-block',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-private-methods',
      '@babel/plugin-proposal-private-property-in-object',
      '@babel/plugin-syntax-dynamic-import'
    ]
  };
};