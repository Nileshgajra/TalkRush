module.exports = ({ config }) => ({
  ...config,

  android: {
    ...config.android,
googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",  },

  plugins: [
    ...(config.plugins || []),
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/analytics",
    "@react-native-firebase/messaging",
    "expo-notifications",
    "expo-video",
  ],
});
