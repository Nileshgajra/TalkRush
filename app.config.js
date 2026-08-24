module.exports = ({ config }) => ({
  ...config,

  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
  },

  plugins: [
    ...(config.plugins || []),
    "@react-native-firebase/app",
    "@react-native-firebase/analytics",
  ],
});