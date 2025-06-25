// app.config.js - Converted from your app.json with environment variables
import 'dotenv/config';

export default {
  name: "MedRecApp",
  displayName: "MedRec App",
  expo: {
    name: "MedRec",
    slug: "medrec",
    version: "1.0.0",
    scheme: "com.medrec.app",
    orientation: "portrait",
    icon: "./src/assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./src/assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.medrec.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./src/assets/icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.medrec.app"
    },
    web: {
      favicon: "./src/assets/favicon.png",
      bundler: "metro"
    },
    platforms: [
      "ios",
      "android",
      "web"
    ],
    plugins: [
      "expo-document-picker",
      "expo-file-system"
    ],
    extra: {
      // Environment variables for development
      azureTenantId: process.env.AZURE_TENANT_ID,
      azureClientId: process.env.AZURE_CLIENT_ID,
      azureRequiredGroup: process.env.AZURE_REQUIRED_GROUP,
    }
  }
};