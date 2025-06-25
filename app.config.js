// app.config.js - Switch to webpack for consistent environment variable handling
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
      bundler: "webpack"  // ← Change from "metro" to "webpack"
    },
    platforms: [
      "ios",
      "android",
      "web"
    ],
    plugins: [
      "expo-document-picker",
      "expo-file-system"
    ],  // ← Add missing comma here
    // ← Remove the "extra" section completely since we're using webpack
  }
};