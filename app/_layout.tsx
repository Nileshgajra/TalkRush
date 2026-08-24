import { getAnalytics, logEvent } from "@react-native-firebase/analytics";
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import mobileAds from 'react-native-google-mobile-ads';

export default function RootLayout() {

  useEffect(() => {
  mobileAds().initialize();

  const analytics = getAnalytics();

  logEvent(analytics, "talkrush_app_started");
}, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="searching" />
      <Stack.Screen name="match" />
      <Stack.Screen name="modal" />
    </Stack>
  );
}