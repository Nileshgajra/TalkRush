import { getAnalytics, logEvent } from "@react-native-firebase/analytics";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
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

let lastOpenedNotificationId = '';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  const notificationId =
    remoteMessage.messageId ||
    `${remoteMessage.data.senderId || ''}:${remoteMessage.sentTime || ''}`;

  if (
    notificationId &&
    notificationId === lastOpenedNotificationId
  ) {
    return;
  }

  lastOpenedNotificationId = notificationId;

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

const showForegroundFriendMessageNotification = async (
  remoteMessage: any
) => {
  if (
    remoteMessage?.data?.type !==
    'friend-message'
  ) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title:
        remoteMessage.notification?.title ||
        `New message from ${
          remoteMessage.data.senderName || 'QELUNO User'
        }`,
      body:
        remoteMessage.notification?.body || '',
      data: remoteMessage.data,
      sound: 'default',
    },
    trigger: {
      channelId: 'friend-messages',
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
    let registeredPushToken = '';
    let registeredPushSocketId = '';
    let pushSetupInProgress = false;

    const getCurrentProfile = async () => {
      const savedProfile =
        await AsyncStorage.getItem(PROFILE_KEY);

      if (!savedProfile) {
        return null;
      }

      const profile: Profile =
        JSON.parse(savedProfile);

      if (
        !profile.userId ||
        !profile.name ||
        !profile.age ||
        !profile.gender
      ) {
        return null;
      }

      return profile;
    };

    const registerCurrentUser = async () => {
      const profile =
        await getCurrentProfile();

      if (!profile || !socket.connected) {
        return profile;
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

      return profile;
    };

    const registerPushToken = async (
      pushToken: string,
      savedProfile?: Profile | null
    ) => {
      const profile =
        savedProfile ||
        await getCurrentProfile();

      if (
        !profile?.userId ||
        !pushToken ||
        !socket.connected
      ) {
        return;
      }

      if (
        registeredPushToken === pushToken &&
        registeredPushSocketId === socket.id
      ) {
        return;
      }

      socket.emit(
        'register-push-token',
        {
          userId: profile.userId,
          pushToken,
        }
      );

      registeredPushToken = pushToken;
      registeredPushSocketId = socket.id || '';
    };

    const setUpPushNotifications = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      const profile =
        await getCurrentProfile();

      if (!profile || pushSetupInProgress) {
        return;
      }

      pushSetupInProgress = true;

      try {
        let notificationsAllowed = true;

        await Notifications.setNotificationChannelAsync(
          'friend-messages',
          {
            name: 'Friend messages',
            description:
              'Notifications for new friend messages',
            importance:
              Notifications.AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
          }
        );

        if (Number(Platform.Version) >= 33) {
          const permission =
            PermissionsAndroid.PERMISSIONS
              .POST_NOTIFICATIONS;

          notificationsAllowed =
            await PermissionsAndroid.check(permission);

          if (!notificationsAllowed) {
            const alreadyRequested =
              await AsyncStorage.getItem(
                NOTIFICATION_PERMISSION_REQUESTED_KEY
              );

            if (!alreadyRequested) {
              const result =
                await PermissionsAndroid.request(permission);

              await AsyncStorage.setItem(
                NOTIFICATION_PERMISSION_REQUESTED_KEY,
                'true'
              );

              notificationsAllowed =
                result ===
                PermissionsAndroid.RESULTS.GRANTED;
            }
          }
        }

        if (!notificationsAllowed) {
          return;
        }

        if (currentPushToken) {
          await registerPushToken(
            currentPushToken,
            profile
          );

          return;
        }

        const pushToken =
          await getToken(firebaseMessaging);

        if (!pushToken) {
          return;
        }

        currentPushToken = pushToken;

        await registerPushToken(
          pushToken,
          profile
        );

      } catch (error) {
        console.log(
          'Push notification setup error:',
          error
        );

      } finally {
        pushSetupInProgress = false;
      }
    };

    const onSocketConnect = () => {
      void registerCurrentUser()
        .then((profile) => {
          if (!profile) {
            return;
          }

          socket.emit(
            'set-app-activity',
            {
              active: AppState.currentState === 'active',
            }
          );

          if (currentPushToken) {
            void registerPushToken(
              currentPushToken,
              profile
            );
          }
        })
        .catch((error) => {
          console.log(
            'Socket registration error:',
            error
          );
        });
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
          registeredPushToken = '';
          void registerPushToken(pushToken);
        }
      );

    const onUserRegistered = () => {
      void setUpPushNotifications();
    };

    const unsubscribeNotificationOpened =
      onNotificationOpenedApp(
        firebaseMessaging,
        (remoteMessage) => {
          void openFriendChatFromNotification(
            remoteMessage
          );
        }
      );

    const unsubscribeForegroundMessage = onMessage(
      firebaseMessaging,
      (remoteMessage) => {
        void showForegroundFriendMessageNotification(
          remoteMessage
        ).catch((error) => {
          console.log(
            'Foreground notification error:',
            error
          );
        });
      }
    );

    const notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          void openFriendChatFromNotification({
            data:
              response.notification.request.content.data,
          });
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

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          return openFriendChatFromNotification({
            data:
              response.notification.request.content.data,
          });
        }
      });

    socket.on('connect', onSocketConnect);
    socket.on('user-registered', onUserRegistered);

    if (socket.connected) {
      onSocketConnect();
    }

    return () => {
      appStateSubscription.remove();
      unsubscribeTokenRefresh();
      unsubscribeNotificationOpened();
      unsubscribeForegroundMessage();
      notificationResponseSubscription.remove();
      socket.off('connect', onSocketConnect);
      socket.off('user-registered', onUserRegistered);
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
