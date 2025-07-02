// babel.config.js - Configuration for environment variable injection with Metro
module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Enable web support
          web: {
            unstable_transformProfile: 'hermes-stable',
          },
        },
      ],
    ],
    plugins: [
      // Transform environment variables at build time
      [
        'transform-inline-environment-variables',
        {
          // Include only the variables we need
          include: [
            'AZURE_TENANT_ID',
            'AZURE_CLIENT_ID', 
            'AZURE_REQUIRED_GROUP',
            'NODE_ENV'
          ]
        }
      ],
      'react-native-web',
      '@babel/plugin-transform-class-static-block',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-private-methods',
      '@babel/plugin-proposal-private-property-in-object',
      '@babel/plugin-syntax-dynamic-import'
    ]
  };
};