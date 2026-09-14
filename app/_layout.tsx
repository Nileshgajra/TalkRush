import { getAnalytics, logEvent } from "@react-native-firebase/analytics";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';

import socket from '../socket';

const PROFILE_KEY = '@talkrush_profile';
const NOTIFICATION_PERMISSION_REQUESTED_KEY =
  '@qeluno_notification_permission_requested';

const firebaseMessaging =
  getMessaging();

type Profile = {
  userId?: string;
  name?: string;
  age?: string;
  gender?: string;
};

const openFriendChatFromNotification = async (
  remoteMessage: any
) => {
  if (
    remoteMessage?.data?.type !==
    'friend-message'
  ) {
    return;
  }

  const savedProfile =
    await AsyncStorage.getItem(PROFILE_KEY);

  if (!savedProfile) {
    return;
  }

  const profile: Profile =
    JSON.parse(savedProfile);

  if (
    !profile.userId ||
    !profile.name ||
    !profile.age ||
    !profile.gender ||
    !remoteMessage.data.senderId
  ) {
    return;
  }

  router.push({
    pathname: '/chat',
    params: {
      myUserId: profile.userId,
      myName: profile.name,
      myAge: profile.age,
      myGender: profile.gender,
      strangerUserId:
        remoteMessage.data.senderId,
      strangerName:
        remoteMessage.data.senderName ||
        'QELUNO User',
      strangerAge:
        remoteMessage.data.senderAge || '',
      strangerGender:
        remoteMessage.data.senderGender || '',
      genderFilter: 'Random',
      skipCount: '0',
      isFriend: 'true',
    },
  });
};

export default function RootLayout() {

  useEffect(() => {
    mobileAds().initialize();

    const analytics = getAnalytics();

    logEvent(analytics, "talkrush_app_started");
  }, []);

  useEffect(() => {
    let currentPushToken = '';

    const registerPushToken = async (
      pushToken: string
    ) => {
      const savedProfile =
        await AsyncStorage.getItem(PROFILE_KEY);

      if (!savedProfile) {
        return;
      }

      const profile: Profile =
        JSON.parse(savedProfile);

      if (
        !profile.userId ||
        !profile.name ||
        !profile.age ||
        !profile.gender
      ) {
        return;
      }

      socket.emit(
        'register-user',
        {
          userId: profile.userId,
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
        }
      );

      socket.emit(
        'register-push-token',
        {
          userId: profile.userId,
          pushToken,
        }
      );
    };

    const setUpPushNotifications = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      const alreadyRequested =
        await AsyncStorage.getItem(
          NOTIFICATION_PERMISSION_REQUESTED_KEY
        );

      if (!alreadyRequested) {
        await AsyncStorage.setItem(
          NOTIFICATION_PERMISSION_REQUESTED_KEY,
          'true'
        );

        if (Number(Platform.Version) >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS
              .POST_NOTIFICATIONS
          );
        }
      }

      currentPushToken =
        await getToken(firebaseMessaging);

      await registerPushToken(
        currentPushToken
      );
    };

    const onSocketConnect = () => {
      socket.emit(
        'set-app-activity',
        {
          active: AppState.currentState === 'active',
        }
      );

      if (currentPushToken) {
        void registerPushToken(
          currentPushToken
        );
      }
    };

    const appStateSubscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          socket.emit(
            'set-app-activity',
            {
              active:
                nextAppState === 'active',
            }
          );
        }
      );

    const unsubscribeTokenRefresh =
      onTokenRefresh(
        firebaseMessaging,
        (pushToken) => {
          currentPushToken = pushToken;
          void registerPushToken(pushToken);
        }
      );

    const unsubscribeNotificationOpened =
      onNotificationOpenedApp(
        firebaseMessaging,
        (remoteMessage) => {
          void openFriendChatFromNotification(
            remoteMessage
          );
        }
      );

    void getInitialNotification(
      firebaseMessaging
    )
      .then((remoteMessage) => {
        if (remoteMessage) {
          void openFriendChatFromNotification(
            remoteMessage
          );
        }
      });

    socket.on('connect', onSocketConnect);
    onSocketConnect();
    void setUpPushNotifications();

    return () => {
      appStateSubscription.remove();
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpened();
      socket.off('connect', onSocketConnect);
    };
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
      <Stack.Screen name="friend" />
      <Stack.Screen name="searching" />
      <Stack.Screen name="match" />
      <Stack.Screen name="modal" />
    </Stack>
  );
}
