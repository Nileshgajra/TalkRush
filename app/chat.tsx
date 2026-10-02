import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  useVideoPlayer,
  VideoView,
} from 'expo-video';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import socket from '../socket';
import {
  addCoins,
  spendCoin,
} from './utils/coins';


// =========================
// ADS
// =========================

const rewarded =
  RewardedAd.createForAdRequest(
    'ca-app-pub-3940256099942544/5224354917'
  );


// =========================
// PROFILE
// =========================

const PROFILE_KEY =
  '@talkrush_profile';


type Profile = {
  userId?: string;
  name: string;
  age: string;
  gender: string;
  photo?: string;
};

type SelectedMedia = {
  uri: string;
  type: 'image' | 'video';
  contentType: string;
  size: number;
  duration: number;
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;

function ChatVideo({
  uri,
  compact = false,
}: {
  uri: string;
  compact?: boolean;
}) {
  const player = useVideoPlayer(
    uri,
    (videoPlayer) => {
      videoPlayer.loop = false;
    }
  );

  return (
    <VideoView
      player={player}
      style={
        compact
          ? styles.mediaPreviewVideo
          : styles.mediaVideo
      }
      nativeControls
      contentFit="contain"
    />
  );
}


export default function ChatScreen() {

  const params =
    useLocalSearchParams();


  // =========================
  // REFS
  // =========================

  const flatListRef =
    useRef<any>(null);

  const disconnectTimer =
    useRef<any>(null);

  const isLeavingRef =
    useRef(false);

  const uploadRequestRef =
    useRef<XMLHttpRequest | null>(null);

  const mediaUploadCancelledRef =
    useRef(false);

  const rewardedAdShowingRef =
    useRef(false);

  const rewardedAdGrantedRef =
    useRef(false);

  const friendRequestCoinPendingRef =
    useRef(false);


  // =========================
  // FRIEND MODE
  // =========================

  const isFriendChat =
    String(
      params.isFriend || ''
    ) === 'true';


  const friendId =
    String(
      params.strangerUserId || ''
    );


  // Tell the server when this is the chat the user is actively viewing so it
  // can avoid presenting a redundant push notification for that conversation.
  useEffect(() => {

    if (!isFriendChat || !friendId) {
      return;
    }

    const setActiveFriendChat = () => {
      socket.emit(
        'set-active-friend-chat',
        {
          friendId,
        }
      );
    };

    setActiveFriendChat();
    socket.on('connect', setActiveFriendChat);

    return () => {
      socket.emit(
        'set-active-friend-chat',
        {
          friendId: '',
        }
      );
      socket.off('connect', setActiveFriendChat);
    };

  }, [
    friendId,
    isFriendChat,
  ]);


  // =========================
  // STRANGER / FRIEND
  // =========================

  const [stranger, setStranger] =
    useState<any>({
      userId:
        params.strangerUserId ||
        '',

      name:
        params.strangerName ||
        '',

      age:
        params.strangerAge ||
        '',

      gender:
        params.strangerGender ||
        '',
    });


  // =========================
  // MY USER ID
  // =========================

  const [myUserId, setMyUserId] =
    useState(
      String(
        params.myUserId || ''
      )
    );


  // =========================
  // MESSAGE
  // =========================

  const [message, setMessage] =
    useState('');


  const [messages, setMessages] =
    useState<any[]>([]);

  const [selectedMedia, setSelectedMedia] =
    useState<SelectedMedia | null>(null);

  const [isUploadingMedia, setIsUploadingMedia] =
    useState(false);

  const [mediaUploadProgress, setMediaUploadProgress] =
    useState(0);


  // =========================
  // STATUS
  // =========================

  const [status, setStatus] =
    useState(
      isFriendChat
        ? 'Checking...'
        : 'Online'
    );


  const [typing, setTyping] =
    useState(false);


  const [seen, setSeen] =
    useState(false);


  // =========================
  // SKIP
  // =========================

  const [skipCount, setSkipCount] =
    useState<number>(
      Number(
        params.skipCount || 0
      )
    );


  // =========================
  // AD MODAL
  // =========================

  const [showAdModal, setShowAdModal] =
    useState(false);

  const [isRewardedAdLoaded, setIsRewardedAdLoaded] =
    useState(false);


  // =========================
  // FRIEND STATUS
  // =========================

  const [friendStatus, setFriendStatus] =
    useState<
      'none' |
      'sending' |
      'sent' |
      'friends'
    >(
      isFriendChat
        ? 'friends'
        : 'none'
    );


  // =========================
  // ACTION MODAL
  // =========================

  const [showActionModal, setShowActionModal] =
    useState(false);


  // =========================
  // REPORT MODAL
  // =========================

  const [showReportModal, setShowReportModal] =
    useState(false);


  const [selectedReportReason, setSelectedReportReason] =
    useState('');


  // =========================
  // REPORT REASONS
  // =========================

  const reportReasons = [
    'Harassment / Abuse',
    'Spam',
    'Inappropriate content',
    'Fake profile',
    'Other',
  ];


  // ==================================================
  // LOAD PROFILE
  // ==================================================

  useEffect(() => {

    const loadProfile =
      async () => {

        try {

          const savedProfile =
            await AsyncStorage.getItem(
              PROFILE_KEY
            );


          if (!savedProfile) {
            return;
          }


          const profile:
            Profile =
            JSON.parse(
              savedProfile
            );


          if (
            profile.userId
          ) {

            setMyUserId(
              profile.userId
            );


            socket.emit(
              'register-user',
              {
                userId:
                  profile.userId,

                name:
                  profile.name,

                age:
                  profile.age,

                gender:
                  profile.gender,
              }
            );

          }

        } catch (error) {

          console.log(
            'Chat profile error:',
            error
          );

        }

      };


    loadProfile();

  }, []);


  // ==================================================
  // REWARDED AD
  // ==================================================

  useEffect(() => {

    rewarded.load();


    const unsubscribeLoaded =
      rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {

          setIsRewardedAdLoaded(true);

          console.log(
            'Rewarded Ad Loaded'
          );

        }
      );


    const unsubscribeReward =
      rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async () => {

          if (rewardedAdGrantedRef.current) {
            return;
          }

          rewardedAdGrantedRef.current = true;

          try {
            await addCoins(1);

            setSkipCount(0);
            setShowAdModal(false);
            isLeavingRef.current = false;
          } catch (error) {
            console.log(
              'Skip reward coin error:',
              error
            );

            Alert.alert(
              'Coin Reward Error',
              'Your reward could not be saved. Please reopen the app before trying again.'
            );
          }

          setIsRewardedAdLoaded(false);

          rewarded.load();

        }
      );

    const unsubscribeError =
      rewarded.addAdEventListener(
        AdEventType.ERROR,
        (error) => {
          console.log(
            'Rewarded ad error:',
            error
          );

          rewardedAdShowingRef.current = false;
          setIsRewardedAdLoaded(false);
          setShowAdModal(false);
          rewarded.load();

          Alert.alert(
            'Ad unavailable',
            'Please try again in a moment.'
          );
        }
      );


    const unsubscribeClosed =
      rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {

          setIsRewardedAdLoaded(false);

          setShowAdModal(false);

          rewardedAdShowingRef.current = false;

          isLeavingRef.current =
            false;

          rewarded.load();

        }
      );


    return () => {

      unsubscribeLoaded();

      unsubscribeReward();

      unsubscribeClosed();

      unsubscribeError();

    };

  }, []);

  const showRewardedAd = () => {

    if (rewardedAdShowingRef.current) {
      return;
    }

    if (!isRewardedAdLoaded) {
      rewarded.load();
      return;
    }

    rewardedAdShowingRef.current = true;
    rewardedAdGrantedRef.current = false;
    setIsRewardedAdLoaded(false);
    rewarded.show();

  };


  // ==================================================
  // LOAD FRIEND HISTORY
  // ==================================================

  useEffect(() => {

    if (
      !isFriendChat ||
      !friendId
    ) {
      return;
    }


    const loadHistory =
      () => {

        const userId =
          myUserId ||
          String(
            params.myUserId || ''
          );


        if (!userId) {
          return;
        }


        socket.emit(
          'get-chat-history',
          {
            userId,

            friendId,
          }
        );


        socket.emit(
          'get-user-status',
          {
            userId:
              friendId,
          }
        );

      };


    loadHistory();

  }, [
    isFriendChat,
    friendId,
    myUserId,
  ]);


  // ==================================================
  // SOCKET EVENTS
  // ==================================================

  useEffect(() => {

    // Remove old listeners
    socket.off('matched');
    socket.off('message');
    socket.off('typing');
    socket.off('seen');
    socket.off('disconnected');
    socket.off('media-message');
    socket.off('media-message-sent');
    socket.off('media-message-error');

    socket.off(
      'friend-message'
    );

    socket.off(
      'friend-message-sent'
    );

    socket.off(
      'friend-message-error'
    );

    socket.off(
      'chat-history'
    );

    socket.off(
      'friend-message-seen'
    );

    socket.off(
      'friend-typing'
    );

    socket.off(
      'user-status'
    );

    socket.off(
      'presence-updated'
    );

    socket.off(
      'friend-request-result'
    );

    socket.off(
      'friend-request-accepted'
    );

    socket.off(
      'new-friend-request'
    );

    socket.off(
      'friend-removed'
    );

    socket.off(
      'block-result'
    );

    socket.off(
      'report-result'
    );


    // ==================================================
    // MATCHED
    // ==================================================

    socket.on(
      'matched',
      (userData) => {

        console.log(
          'Matched Successfully'
        );


        clearTimeout(
          disconnectTimer.current
        );


        isLeavingRef.current =
          false;


        setStatus(
          'Online'
        );

        setTyping(false);

        setSeen(false);

        setMessages([]);


        setStranger({

          userId:
            userData.userId ||
            '',

          name:
            userData.name ||
            '',

          age:
            userData.age ||
            '',

          gender:
            userData.gender ||
            '',

        });


        setFriendStatus(
          'none'
        );

      }
    );


    // ==================================================
    // STRANGER MESSAGE
    // ==================================================

    socket.on(
      'message',
      (text) => {

        if (isFriendChat) {
          return;
        }


        setTyping(false);

        socket.emit(
          'seen'
        );


        setMessages(
          (prev) => [
            ...prev,

            {
              id:
                Date.now()
                  .toString() +
                Math.random(),

              text,

              sender:
                'other',
            },
          ]
        );


        setTimeout(
          () => {

            flatListRef.current?.scrollToEnd(
              {
                animated: true,
              }
            );

          },
          100
        );

      }
    );

    socket.on(
      'media-message',
      (data) => {
        if (
          isFriendChat ||
          data?.senderId !== friendId
        ) {
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            ...data,
            sender: 'other',
          },
        ]);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({
            animated: true,
          });
        }, 100);
      }
    );

    socket.on(
      'media-message-sent',
      (data) => {
        if (isFriendChat) {
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            ...data,
            sender: 'me',
          },
        ]);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({
            animated: true,
          });
        }, 100);
      }
    );

    socket.on(
      'media-message-error',
      (data) => {
        Alert.alert(
          'Media',
          data?.message || 'Could not send media.'
        );
      }
    );


    // ==================================================
    // FRIEND MESSAGE
    // ==================================================

    socket.on(
      'friend-message',
      (data) => {

        if (
          !isFriendChat ||
          data?.senderId !==
            friendId
        ) {
          return;
        }


        setTyping(false);


        setMessages(
          (prev) => {

            const exists =
              prev.some(
                (item) =>
                  item.id ===
                  data.id
              );


            if (exists) {
              return prev;
            }


            return [
              ...prev,

              {
                id:
                  data.id,

                text:
                  data.text,

                mediaType:
                  data.mediaType,

                mediaUrl:
                  data.mediaUrl,

                mediaPath:
                  data.mediaPath,

                sender:
                  'other',

                senderId:
                  data.senderId,

                receiverId:
                  data.receiverId,

                seen:
                  data.seen,

                createdAt:
                  data.createdAt,
              },
            ];

          }
        );


        socket.emit(
          'friend-message-seen',
          {
            messageId:
              data.id,

            userId:
              myUserId ||
              String(
                params.myUserId ||
                ''
              ),
          }
        );


        setTimeout(
          () => {

            flatListRef.current?.scrollToEnd(
              {
                animated: true,
              }
            );

          },
          100
        );

      }
    );


    // ==================================================
    // FRIEND MESSAGE SENT
    // ==================================================

    socket.on(
      'friend-message-sent',
      (data) => {

        if (
          !isFriendChat
        ) {
          return;
        }


        setMessages(
          (prev) => {

            const exists =
              prev.some(
                (item) =>
                  item.id ===
                  data.id
              );


            if (exists) {
              return prev;
            }


            return [
              ...prev,

              {
                id:
                  data.id,

                text:
                  data.text,

                mediaType:
                  data.mediaType,

                mediaUrl:
                  data.mediaUrl,

                mediaPath:
                  data.mediaPath,

                sender:
                  'me',

                senderId:
                  data.senderId,

                receiverId:
                  data.receiverId,

                seen:
                  data.seen,

                createdAt:
                  data.createdAt,
              },
            ];

          }
        );


        setTimeout(
          () => {

            flatListRef.current?.scrollToEnd(
              {
                animated: true,
              }
            );

          },
          100
        );

      }
    );


    // ==================================================
    // FRIEND MESSAGE ERROR
    // ==================================================

    socket.on(
      'friend-message-error',
      (data) => {

        Alert.alert(
          'Message',
          data?.message ||
            'Could not send message.'
        );

      }
    );


    // ==================================================
    // CHAT HISTORY
    // ==================================================

    socket.on(
      'chat-history',
      (data) => {

        if (
          !isFriendChat ||
          data?.friendId !==
            friendId
        ) {
          return;
        }


        if (
          !data?.success
        ) {
          return;
        }


        const formatted =
          (
            data.messages ||
            []
          ).map(
            (item: any) => ({

              id:
                item.id,

              text:
                item.text,

              mediaType:
                item.mediaType,

              mediaUrl:
                item.mediaUrl,

              mediaPath:
                item.mediaPath,

              sender:
                item.senderId ===
                  (
                    myUserId ||
                    String(
                      params.myUserId ||
                      ''
                    )
                  )
                  ? 'me'
                  : 'other',

              senderId:
                item.senderId,

              receiverId:
                item.receiverId,

              seen:
                item.seen,

              createdAt:
                item.createdAt,

            })
          );


        setMessages(
          formatted
        );


        setTimeout(
          () => {

            flatListRef.current?.scrollToEnd(
              {
                animated: false,
              }
            );

          },
          200
        );

      }
    );


    // ==================================================
    // FRIEND MESSAGE SEEN
    // ==================================================

    socket.on(
      'friend-message-seen',
      (data) => {

        if (!isFriendChat) {
          return;
        }

        const seenMessageIds =
          new Set(
            data?.messageIds ||
            (data?.messageId
              ? [data.messageId]
              : [])
          );

        if (seenMessageIds.size === 0) {
          return;
        }

        setMessages(
          (prev) =>
            prev.map(
              (item) =>
                seenMessageIds.has(
                  item.id
                )
                  ? {
                      ...item,
                      seen: true,
                    }
                  : item
            )
        );

        setSeen(true);

      }
    );


    // ==================================================
    // FRIEND TYPING
    // ==================================================

    socket.on(
      'friend-typing',
      (data) => {

        if (
          data?.senderId !==
          friendId
        ) {
          return;
        }


        setTyping(true);


        setTimeout(
          () => {

            setTyping(false);

          },
          1200
        );

      }
    );


    // ==================================================
    // USER STATUS
    // ==================================================

    socket.on(
      'user-status',
      (data) => {

        if (
          data?.userId !==
          friendId
        ) {
          return;
        }


        setStatus(
          data.online
            ? 'Online'
            : 'Offline'
        );

      }
    );

    socket.on(
      'presence-updated',
      (data) => {

        if (
          !isFriendChat ||
          data?.userId !== friendId
        ) {
          return;
        }

        setStatus(
          data.online
            ? 'Online'
            : 'Offline'
        );

      }
    );


    // ==================================================
    // TYPING - STRANGER
    // ==================================================

    socket.on(
      'typing',
      () => {

        if (isFriendChat) {
          return;
        }


        setTyping(true);


        setTimeout(
          () => {

            setTyping(false);

          },
          1200
        );

      }
    );


    // ==================================================
    // SEEN - STRANGER
    // ==================================================

    socket.on(
      'seen',
      () => {

        if (isFriendChat) {
          return;
        }


        setSeen(true);

      }
    );


    // ==================================================
    // PARTNER DISCONNECTED
    // ==================================================

    socket.on(
      'disconnected',
      () => {

        if (isFriendChat) {
          return;
        }


        if (
          isLeavingRef.current
        ) {

          console.log(
            'Manual next pressed'
          );


          isLeavingRef.current =
            false;

          return;

        }


        console.log(
          'Partner disconnected'
        );


        clearTimeout(
          disconnectTimer.current
        );


        setStatus(
          'Partner left'
        );

        setTyping(false);

        setSeen(false);


        setStranger(
          (prev: any) => ({
            ...prev,

            name:
              'Partner left the chat',
          })
        );


        setFriendStatus(
          'none'
        );

      }
    );


    // ==================================================
    // FRIEND REQUEST RESULT
    // ==================================================

    socket.on(
      'friend-request-result',
      (result) => {

        console.log(
          'Friend request result:',
          result
        );


        if (
          result?.success
        ) {

          if (
            result.message ===
            'Friend request sent.'
          ) {

            friendRequestCoinPendingRef.current =
              false;

            setFriendStatus(
              'sent'
            );


            Alert.alert(
              'Friend Request ❤️',
              'Friend request sent successfully.'
            );

          }

          else if (
            result.message ===
            'Friend request accepted.'
          ) {

            setFriendStatus(
              'friends'
            );


            Alert.alert(
              'Friends ❤️',
              'You are now friends!'
            );

          }

          else if (
            result.message ===
            'Friend request rejected.'
          ) {

            Alert.alert(
              'Request Rejected',
              'Friend request rejected.'
            );

          }

        }

        else {

          if (friendRequestCoinPendingRef.current) {
            friendRequestCoinPendingRef.current =
              false;

            void addCoins(1).catch((error) => {
              console.log(
                'Friend request coin refund error:',
                error
              );
            });
          }

          setFriendStatus(
            'none'
          );


          if (
            result?.message
          ) {

            Alert.alert(
              'Friend Request',
              result.message
            );

          }

        }

      }
    );


    // ==================================================
    // FRIEND REQUEST ACCEPTED
    // ==================================================

    socket.on(
      'friend-request-accepted',
      () => {

        setFriendStatus(
          'friends'
        );


        Alert.alert(
          'You Are Friends ❤️',
          `${stranger.name || 'This user'} accepted your friend request.`
        );

      }
    );


    // ==================================================
    // NEW FRIEND REQUEST
    // ==================================================

    socket.on(
      'new-friend-request',
      (request) => {

        Alert.alert(
          'New Friend Request ❤️',
          'Someone wants to be your friend.',
          [
            {
              text:
                'Reject',

              style:
                'cancel',

              onPress: () => {

                socket.emit(
                  'reject-friend-request',
                  {
                    requestId:
                      request.requestId,
                  }
                );

              },

            },

            {
              text:
                'Accept',

              onPress: () => {

                socket.emit(
                  'accept-friend-request',
                  {
                    requestId:
                      request.requestId,
                  }
                );

              },

            },

          ]
        );

      }
    );


    // ==================================================
    // FRIEND REMOVED
    // ==================================================

    socket.on(
  'friend-removed',
  (data) => {

    if (
      !isFriendChat ||
      data?.friendId !==
        friendId
    ) {
      return;
    }


    setFriendStatus(
      'none'
    );


    Alert.alert(
      'Friend Removed',
      'This person is no longer your friend.'
    );

  }
);


    // ==================================================
    // BLOCK RESULT
    // ==================================================

    socket.on(
      'block-result',
      (data) => {

        if (
          data?.success
        ) {

          setShowActionModal(
            false
          );


          Alert.alert(
            'User Blocked',
            'This user has been blocked.',
            [
              {
                text:
                  'OK',

                onPress: () => {

                  if (
                    isFriendChat
                  ) {

                    router.replace(
  '/friend' as any
);

                  }

                  else {

                    router.replace(
                      '/home'
                    );

                  }

                },

              },

            ]
          );

        }

        else if (
          data?.message
        ) {

          Alert.alert(
            'Block',
            data.message
          );

        }

      }
    );


    // ==================================================
    // REPORT RESULT
    // ==================================================

    socket.on(
      'report-result',
      (data) => {

        if (
          data?.success
        ) {

          setShowReportModal(
            false
          );

          setSelectedReportReason(
            ''
          );


          Alert.alert(
            'Report Submitted',
            'Thank you. Your report has been recorded.'
          );

        }

        else if (
          data?.message
        ) {

          Alert.alert(
            'Report',
            data.message
          );

        }

      }
    );


    return () => {

      socket.off('matched');

      socket.off('message');

      socket.off('typing');

      socket.off('seen');

      socket.off('disconnected');
      socket.off('media-message');
      socket.off('media-message-sent');
      socket.off('media-message-error');

      socket.off(
        'friend-message'
      );

      socket.off(
        'friend-message-sent'
      );

      socket.off(
        'friend-message-error'
      );

      socket.off(
        'chat-history'
      );

      socket.off(
        'friend-message-seen'
      );

      socket.off(
        'friend-typing'
      );

      socket.off(
        'user-status'
      );

      socket.off(
        'presence-updated'
      );

      socket.off(
        'friend-request-result'
      );

      socket.off(
        'friend-request-accepted'
      );

      socket.off(
        'new-friend-request'
      );

      socket.off(
        'friend-removed'
      );

      socket.off(
        'block-result'
      );

      socket.off(
        'report-result'
      );

    };

  }, [
    myUserId,
    stranger.name,
    friendId,
    isFriendChat,
  ]);


  // ==================================================
  // REFRESH FRIEND PRESENCE
  // ==================================================

  useEffect(() => {

    if (
      !isFriendChat ||
      !friendId
    ) {
      return;
    }

    const refreshPartnerStatus = () => {
      socket.emit(
        'get-user-status',
        {
          userId: friendId,
        }
      );
    };

    const appStateSubscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (nextAppState === 'active') {
            refreshPartnerStatus();
          }
        }
      );

    socket.on('connect', refreshPartnerStatus);
    refreshPartnerStatus();

    return () => {
      appStateSubscription.remove();
      socket.off('connect', refreshPartnerStatus);
    };

  }, [
    friendId,
    isFriendChat,
  ]);


  // ==================================================
  // SEND FRIEND REQUEST
  // ==================================================

  const sendFriendRequest =
    async () => {

      const senderId =
        myUserId ||
        String(
          params.myUserId || ''
        );


      const receiverId =
        stranger.userId ||
        String(
          params.strangerUserId ||
          ''
        );


      if (!senderId) {

        Alert.alert(
          'Please Wait',
          'Your profile is still loading.'
        );

        return;

      }


      if (!receiverId) {

        Alert.alert(
          'Unavailable',
          'This user cannot be added right now.'
        );

        return;

      }


      if (
        senderId ===
        receiverId
      ) {

        Alert.alert(
          'Error',
          'You cannot add yourself.'
        );

        return;

      }


      if (
        friendStatus ===
          'sent' ||
        friendStatus ===
          'sending'
      ) {

        return;

      }


      if (
        friendStatus ===
        'friends'
      ) {

        Alert.alert(
          'Already Friends ❤️',
          'You are already friends with this user.'
        );

        return;

      }


      const spentCoin = await spendCoin();

      if (!spentCoin) {
        Alert.alert(
          'Not Enough Coins',
          'You need 1 coin to send a friend request.'
        );
        return;
      }

      friendRequestCoinPendingRef.current = true;

      setFriendStatus('sending');


      socket.emit(
        'send-friend-request',
        {
          fromUserId:
            senderId,

          toUserId:
            receiverId,
        }
      );

    };


  // ==================================================
  // MEDIA PICKER AND UPLOAD
  // ==================================================

  const getMediaType = (
    mimeType: string,
    uri: string
  ) => {
    const normalizedMimeType =
      mimeType.toLowerCase();
    const normalizedUri = uri.toLowerCase();

    const contentType = normalizedMimeType ||
      (normalizedUri.endsWith('.jpg') ||
      normalizedUri.endsWith('.jpeg')
        ? 'image/jpeg'
        : normalizedUri.endsWith('.png')
          ? 'image/png'
          : normalizedUri.endsWith('.webp')
            ? 'image/webp'
            : normalizedUri.endsWith('.mp4')
              ? 'video/mp4'
              : normalizedUri.endsWith('.mov')
                ? 'video/quicktime'
                : normalizedUri.endsWith('.webm')
                  ? 'video/webm'
                  : '');

    if (
      ['image/jpeg', 'image/png', 'image/webp']
        .includes(contentType)
    ) {
      return {
        type: 'image' as const,
        contentType,
      };
    }

    if (
      ['video/mp4', 'video/quicktime', 'video/webm']
        .includes(contentType)
    ) {
      return {
        type: 'video' as const,
        contentType,
      };
    }

    return null;
  };

  const getMediaFileSize = async (
    uri: string,
    knownSize?: number | null
  ) => {
    if (knownSize && knownSize > 0) {
      return knownSize;
    }

    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  };

  const pickMedia = async () => {
    if (isUploadingMedia) {
      return;
    }

    if (
      (isFriendChat && friendStatus !== 'friends') ||
      (!isFriendChat && status === 'Partner left')
    ) {
      Alert.alert(
        'Unavailable',
        'This chat is no longer available for media sharing.'
      );
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Allow media access to share photos and videos.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          quality: 0.9,
          videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const mediaDetails = getMediaType(
        asset.mimeType || '',
        asset.uri
      );

      if (!mediaDetails) {
        Alert.alert(
          'Unsupported File',
          'Choose a JPG, PNG, WEBP, MP4, MOV, or WEBM file.'
        );
        return;
      }

      const size = await getMediaFileSize(
        asset.uri,
        asset.fileSize
      );
      const duration = mediaDetails.type === 'video'
        ? (asset.duration || 0) / 1000
        : 0;

      if (
        mediaDetails.type === 'image' &&
        size > MAX_IMAGE_SIZE_BYTES
      ) {
        Alert.alert(
          'Photo Too Large',
          'Photos must be 10 MB or smaller.'
        );
        return;
      }

      if (
        mediaDetails.type === 'video' &&
        size > MAX_VIDEO_SIZE_BYTES
      ) {
        Alert.alert(
          'Video Too Large',
          'Videos must be 25 MB or smaller.'
        );
        return;
      }

      if (
        mediaDetails.type === 'video' &&
        duration > MAX_VIDEO_DURATION_SECONDS
      ) {
        Alert.alert(
          'Video Too Long',
          'Videos must be 60 seconds or shorter.'
        );
        return;
      }

      setSelectedMedia({
        uri: asset.uri,
        type: mediaDetails.type,
        contentType: mediaDetails.contentType,
        size,
        duration,
      });

    } catch (error) {
      console.log('Media picker error:', error);
      Alert.alert(
        'Media Error',
        'Could not open the media library.'
      );
    }
  };

  const uploadToSignedUrl = async (
    media: SelectedMedia,
    uploadUrl: string
  ) => {
    const fileResponse = await fetch(media.uri);
    const fileBlob = await fileResponse.blob();

    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      uploadRequestRef.current = request;

      request.open('PUT', uploadUrl);
      request.setRequestHeader(
        'Content-Type',
        media.contentType
      );
      request.setRequestHeader('x-upsert', 'false');
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setMediaUploadProgress(
            Math.round(
              (event.loaded / event.total) * 100
            )
          );
        }
      };
      request.onload = () => {
        uploadRequestRef.current = null;

        if (request.status >= 200 && request.status < 300) {
          resolve();
        } else {
          reject(new Error('Media upload failed.'));
        }
      };
      request.onerror = () => {
        uploadRequestRef.current = null;
        reject(new Error('Media upload failed.'));
      };
      request.onabort = () => {
        uploadRequestRef.current = null;
        reject(new Error('Media upload cancelled.'));
      };
      request.send(fileBlob);
    });
  };

  const sendMedia = async () => {
    if (!selectedMedia || isUploadingMedia) {
      return;
    }

    const senderId = myUserId ||
      String(params.myUserId || '');
    const receiverId = stranger.userId ||
      String(params.strangerUserId || '');

    if (!senderId || !receiverId) {
      Alert.alert(
        'Unavailable',
        'This chat is no longer available.'
      );
      return;
    }

    setIsUploadingMedia(true);
    setMediaUploadProgress(0);
    mediaUploadCancelledRef.current = false;

    try {
      const upload = await new Promise<any>(
        (resolve) => {
          socket.emit(
            'request-media-upload',
            {
              chatType:
                isFriendChat ? 'friend' : 'random',
              receiverId,
              media: {
                type: selectedMedia.type,
                contentType: selectedMedia.contentType,
                size: selectedMedia.size,
                duration: selectedMedia.duration,
              },
            },
            resolve
          );
        }
      );

      if (!upload?.success) {
        throw new Error(
          upload?.message ||
          'Could not prepare the media upload.'
        );
      }

      await uploadToSignedUrl(
        selectedMedia,
        upload.uploadUrl
      );

      if (mediaUploadCancelledRef.current) {
        throw new Error('Media upload cancelled.');
      }

      if (isFriendChat) {
        socket.emit(
          'friend-media-message',
          {
            senderId,
            receiverId,
            mediaPath: upload.mediaPath,
          }
        );
      } else {
        socket.emit(
          'media-message',
          {
            receiverId,
            mediaPath: upload.mediaPath,
          }
        );
      }

      setSelectedMedia(null);

    } catch (error: any) {
      if (error?.message !== 'Media upload cancelled.') {
        Alert.alert(
          'Media Upload Failed',
          error?.message ||
            'The media was not sent. Please try again.'
        );
      }
    } finally {
      uploadRequestRef.current = null;
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
    }
  };

  const cancelSelectedMedia = () => {
    mediaUploadCancelledRef.current = true;
    uploadRequestRef.current?.abort();
    setSelectedMedia(null);
  };

  // ==================================================
  // SEND MESSAGE
  // ==================================================

  const sendMessage =
    () => {

      const cleanMessage =
        message.trim();


      if (!cleanMessage) {
        return;
      }


      const senderId =
        myUserId ||
        String(
          params.myUserId || ''
        );


      const receiverId =
        stranger.userId ||
        String(
          params.strangerUserId ||
          ''
        );


      if (!senderId) {

        Alert.alert(
          'Please Wait',
          'Your profile is still loading.'
        );

        return;

      }


      if (!receiverId) {

        Alert.alert(
          'Unavailable',
          'This chat is no longer available.'
        );

        return;

      }


      setSeen(false);


      // =========================
      // FRIEND MESSAGE
      // =========================

      if (isFriendChat) {

        socket.emit(
          'friend-message',
          {
            senderId,

            receiverId,

            text:
              cleanMessage,
          }
        );

      }

      // =========================
      // STRANGER MESSAGE
      // =========================

      else {

        socket.emit(
          'message',
          cleanMessage
        );


        setMessages(
          (prev) => [
            ...prev,

            {
              id:
                Date.now().toString(),

              text:
                cleanMessage,

              sender:
                'me',
            },
          ]
        );

      }


      setMessage('');


      setTimeout(
        () => {

          flatListRef.current?.scrollToEnd(
            {
              animated: true,
            }
          );

        },
        100
      );

    };


  // ==================================================
  // TYPING
  // ==================================================

  const handleTyping =
    (text: string) => {

      setMessage(
        text
      );


      const senderId =
        myUserId ||
        String(
          params.myUserId || ''
        );


      const receiverId =
        stranger.userId ||
        String(
          params.strangerUserId ||
          ''
        );


      if (!senderId || !receiverId) {
        return;
      }


      if (isFriendChat) {

        socket.emit(
          'friend-typing',
          {
            senderId,

            receiverId,
          }
        );

      }

      else {

        socket.emit(
          'typing'
        );

      }

    };


  // ==================================================
  // REMOVE FRIEND
  // ==================================================

  const removeFriend =
    () => {

      const userId =
        myUserId ||
        String(
          params.myUserId || ''
        );


      const friendIdToRemove =
        stranger.userId ||
        String(
          params.strangerUserId ||
          ''
        );


      if (
        !userId ||
        !friendIdToRemove
      ) {
        return;
      }


      Alert.alert(
        'Remove Friend',
        `Remove ${stranger.name || 'this user'} from your friends? Your chat history will NOT be deleted.`,
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Remove',

            style:
              'destructive',

            onPress: () => {

              socket.emit(
                'remove-friend',
                {
                  userId,

                  friendId:
                    friendIdToRemove,
                }
              );

              setFriendStatus(
                'none'
              );

            },

          },

        ]
      );

    };


  // ==================================================
  // BLOCK USER
  // ==================================================

  const blockUser =
    () => {

      const userId =
        myUserId ||
        String(
          params.myUserId || ''
        );


      const blockedUserId =
        stranger.userId ||
        String(
          params.strangerUserId ||
          ''
        );


      if (
        !userId ||
        !blockedUserId
      ) {
        return;
      }


      Alert.alert(
        'Block User',
        `Block ${stranger.name || 'this user'}? They will not be able to match with you or send you friend requests.`,
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Block',

            style:
              'destructive',

            onPress: () => {

              socket.emit(
                'block-user',
                {
                  userId,

                  blockedUserId,
                }
              );

            },

          },

        ]
      );

    };


  // ==================================================
  // REPORT USER
  // ==================================================

  const openReport =
    () => {

      setShowActionModal(
        false
      );

      setShowReportModal(
        true
      );

    };


  const submitReport =
    () => {

      const reporterId =
        myUserId ||
        String(
          params.myUserId || ''
        );


      const reportedUserId =
        stranger.userId ||
        String(
          params.strangerUserId ||
          ''
        );


      if (
        !reporterId ||
        !reportedUserId
      ) {

        return;

      }


      if (
        !selectedReportReason
      ) {

        Alert.alert(
          'Select Reason',
          'Please select a reason for the report.'
        );

        return;

      }


      socket.emit(
        'report-user',
        {
          reporterId,

          reportedUserId,

          reason:
            selectedReportReason,
        }
      );

    };


  // ==================================================
  // NEXT / LEAVE
  // ==================================================

  const nextUser =
    () => {

      // =========================
      // FRIEND CHAT
      // =========================

      if (isFriendChat) {

        router.replace(
  '/friend' as any
);

        return;

      }


      console.log(
        'Skip Count:',
        skipCount
      );


      if (
        isLeavingRef.current
      ) {

        return;

      }


      if (
        skipCount >= 4
      ) {

        isLeavingRef.current =
          false;

        setShowAdModal(
          true
        );

        return;

      }


      isLeavingRef.current =
        true;


      const nextSkipCount =
        skipCount + 1;


      setSkipCount(
        nextSkipCount
      );


      clearTimeout(
        disconnectTimer.current
      );


      // IMPORTANT:
      // We do NOT remove the
      // partner's listener here.
      //
      // Backend sends "disconnected"
      // to the partner only.
      //
      // Current user immediately
      // goes to searching.

      setMessages([]);

      setSeen(false);

      setTyping(false);


      setStatus(
        'Searching'
      );


      setFriendStatus(
        'none'
      );


      setStranger({

        userId: '',

        name:
          'Searching...',

        age: '',

        gender: '',

      });


      socket.emit(
        'disconnect-partner'
      );


      router.replace({

        pathname:
          '/searching',

        params: {

          userId:
            myUserId,

          name:
            params.myName,

          age:
            params.myAge,

          gender:
            params.myGender,

          genderFilter:
            params.genderFilter,

          skipCount:
            String(
              nextSkipCount
            ),

        },

      });

    };


  // ==================================================
  // STATUS COLOR
  // ==================================================

  const getStatusColor =
    () => {

      if (
        status ===
        'Online'
      ) {

        return '#22C55E';

      }


      if (
        status ===
        'Searching'
      ) {

        return '#00E0FF';

      }


      if (
        status ===
        'Offline'
      ) {

        return '#64748B';

      }


      if (
        status ===
        'Partner left'
      ) {

        return '#EF4444';

      }


      return '#F59E0B';

    };


  // ==================================================
  // FRIEND BUTTON TEXT
  // ==================================================

  const getFriendButtonText =
    () => {

      if (
        friendStatus ===
        'sending'
      ) {

        return 'Sending...';

      }


      if (
        friendStatus ===
        'sent'
      ) {

        return 'Request Sent ✓';

      }


      if (
        friendStatus ===
        'friends'
      ) {

        return 'Friends ❤️';

      }


      return 'Add Friend ❤️';

    };


  // ==================================================
  // UI
  // ==================================================

  return (

    <KeyboardAvoidingView
      style={
        styles.keyboard
      }

      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }

      keyboardVerticalOffset={
        0
      }
    >

      <View
        style={
          styles.container
        }
      >

        {/* =========================
            HEADER
        ========================= */}

        <View
          style={
            styles.header
          }
        >

          <View
            style={
              styles.avatar
            }
          >

            <Text
              style={
                styles.avatarText
              }
            >
              {stranger.name
                ?.toString()
                .charAt(0)}
            </Text>

          </View>


          <Text
            style={
              styles.name
            }
          >
            {stranger.name}

            {stranger.age
              ? `, ${stranger.age}`
              : ''}
          </Text>


          <Text
            style={
              styles.gender
            }
          >
            {stranger.gender}
          </Text>


          <View
            style={
              styles.statusContainer
            }
          >

            <View
              style={[
                styles.statusDot,

                {
                  backgroundColor:
                    getStatusColor(),
                },

              ]}
            />


            <Text
              style={
                styles.statusText
              }
            >
              {status}
            </Text>

          </View>


          {/* =========================
              FRIEND / ACTIONS
          ========================= */}

          {stranger.userId && (

            <View
              style={
                styles.actionRow
              }
            >

              {!isFriendChat && (
                <TouchableOpacity
                  style={[
                    styles.friendButton,

                    friendStatus ===
                      'friends' &&
                      styles.friendButtonDone,

                    friendStatus ===
                      'sent' &&
                      styles.friendButtonSent,
                  ]}

                  onPress={
                    sendFriendRequest
                  }

                  disabled={
                    friendStatus ===
                      'sending' ||
                    friendStatus ===
                      'sent' ||
                    friendStatus ===
                      'friends'
                  }

                  activeOpacity={
                    0.85
                  }
                >

                  <Text
                    style={
                      styles.friendButtonText
                    }
                  >
                    {getFriendButtonText()}
                  </Text>

                </TouchableOpacity>
              )}


              <TouchableOpacity
                style={
                  styles.moreButton
                }

                onPress={() =>
                  setShowActionModal(
                    true
                  )
                }
              >

                <Text
                  style={
                    styles.moreButtonText
                  }
                >
                  ⋮
                </Text>

              </TouchableOpacity>

            </View>

          )}

        </View>


        {/* =========================
            PARTNER LEFT
        ========================= */}

        {!isFriendChat &&
          status ===
            'Partner left' && (

          <View
            style={
              styles.leftBanner
            }
          >

            <Text
              style={
                styles.leftTitle
              }
            >
              Partner left the chat
            </Text>


            <Text
              style={
                styles.leftText
              }
            >
              Press Next when you're ready to meet someone new.
            </Text>

          </View>

        )}


        {/* =========================
            MESSAGES
        ========================= */}

        <FlatList
          ref={
            flatListRef
          }

          data={
            messages
          }

          keyExtractor={
            (item) =>
              String(
                item.id
              )
          }

          showsVerticalScrollIndicator={
            false
          }

          keyboardShouldPersistTaps="always"

          contentContainerStyle={
            styles.chatContainer
          }

          renderItem={
            ({ item }) => (

              <View
                style={[
                  styles.messageBubble,

                  item.sender ===
                    'me'
                    ? styles.myMessage
                    : styles.otherMessage,
                ]}
              >
                {item.mediaType === 'image' && (
                  item.mediaUrl ? (
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.mediaUnavailable}>
                      Photo unavailable
                    </Text>
                  )
                )}

                {item.mediaType === 'video' && (
                  item.mediaUrl ? (
                    <ChatVideo uri={item.mediaUrl} />
                  ) : (
                    <Text style={styles.mediaUnavailable}>
                      Video unavailable
                    </Text>
                  )
                )}

                {!!item.text && (
                  <Text
                    style={
                      styles.messageText
                    }
                  >
                    {item.text}
                  </Text>
                )}

              </View>

            )
          }

        />


        {/* =========================
            TYPING
        ========================= */}

        {typing && (

          <View
            style={
              styles.typingContainer
            }
          >

            <ActivityIndicator
              size="small"
              color="#00E0FF"
            />

            <Text
              style={
                styles.typingText
              }
            >
              {isFriendChat
                ? `${stranger.name || 'Friend'} is typing...`
                : 'Stranger typing...'}
            </Text>

          </View>

        )}


        {/* =========================
            SEEN
        ========================= */}

        {seen && (

          <Text
            style={
              styles.seenText
            }
          >
            Seen
          </Text>

        )}


        {/* =========================
            BANNER
        ========================= */}

        <View
          style={
            styles.bannerContainer
          }
        >

          <BannerAd
            unitId="ca-app-pub-3940256099942544/9214589741"

            size={
              BannerAdSize.BANNER
            }

            onAdLoaded={
              () =>
                console.log(
                  'Banner Loaded'
                )
            }

            onAdFailedToLoad={
              (error) =>
                console.log(
                  'Banner Failed',
                  error
                )
            }
          />

        </View>


        {/* =========================
            INPUT
        ========================= */}

        {selectedMedia && (
          <View style={styles.mediaPreviewContainer}>
            {selectedMedia.type === 'image' ? (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.mediaPreviewImage}
                resizeMode="cover"
              />
            ) : (
              <ChatVideo
                uri={selectedMedia.uri}
                compact
              />
            )}

            <View style={styles.mediaPreviewActions}>
              <Text style={styles.mediaPreviewText}>
                {isUploadingMedia
                  ? `Uploading ${mediaUploadProgress}%`
                  : selectedMedia.type === 'image'
                    ? 'Photo ready to send'
                    : 'Video ready to send'}
              </Text>

              <TouchableOpacity
                onPress={cancelSelectedMedia}
                style={styles.mediaCancelButton}
              >
                <Text style={styles.mediaCancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View
          style={
            styles.inputContainer
          }
        >

          <TouchableOpacity
            style={
              styles.nextButton
            }

            onPress={
              nextUser
            }
          >

            <Text
              style={
                styles.nextText
              }
            >
              {isFriendChat
                ? 'Back'
                : 'Next'}
            </Text>

          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={pickMedia}
            disabled={isUploadingMedia}
          >
            <Text style={styles.mediaButtonText}>
              +
            </Text>
          </TouchableOpacity>


          <TextInput
            value={
              message
            }

            onChangeText={
              handleTyping
            }

            placeholder={
              isFriendChat
                ? 'Message friend...'
                : 'Type message...'
            }

            placeholderTextColor="#64748B"

            style={
              styles.input
            }

            multiline

            editable={
              isFriendChat
                ? friendStatus ===
                    'friends'
                : status !==
                    'Partner left'
            }
          />


          <TouchableOpacity
            style={
              styles.sendButton
            }

            onPress={
              selectedMedia
                ? sendMedia
                : sendMessage
            }

            disabled={
              isFriendChat &&
              friendStatus !==
                'friends' ||
              isUploadingMedia
            }
          >

            <Text
              style={
                styles.sendText
              }
            >
              {selectedMedia
                ? isUploadingMedia
                  ? '...'
                  : 'Send Media'
                : 'Send'}
            </Text>

          </TouchableOpacity>

        </View>

      </View>


      {/* ==================================================
          ACTION MODAL
          ================================================== */}

      <Modal
        visible={
          showActionModal
        }

        transparent

        animationType="fade"

        onRequestClose={() =>
          setShowActionModal(
            false
          )
        }
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.actionModal
            }
          >

            <Text
              style={
                styles.actionTitle
              }
            >
              {stranger.name ||
                'User'}
            </Text>


            {isFriendChat && (

              <TouchableOpacity
                style={
                  styles.actionItem
                }

                onPress={
                  removeFriend
                }
              >

                <Text
                  style={
                    styles.actionItemText
                  }
                >
                  Remove Friend
                </Text>

              </TouchableOpacity>

            )}


            <TouchableOpacity
              style={
                styles.actionItem
              }

              onPress={
                blockUser
              }
            >

              <Text
                style={
                  styles.actionItemTextDanger
                }
              >
                Block User
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.actionItem
              }

              onPress={
                openReport
              }
            >

              <Text
                style={
                  styles.actionItemTextDanger
                }
              >
                Report User
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.cancelAction
              }

              onPress={() =>
                setShowActionModal(
                  false
                )
              }
            >

              <Text
                style={
                  styles.cancelActionText
                }
              >
                Cancel
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>


      {/* ==================================================
          REPORT MODAL
          ================================================== */}

      <Modal
        visible={
          showReportModal
        }

        transparent

        animationType="fade"

        onRequestClose={() =>
          setShowReportModal(
            false
          )
        }
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.reportModal
            }
          >

            <Text
              style={
                styles.modalTitle
              }
            >
              Report User
            </Text>


            <Text
              style={
                styles.modalText
              }
            >
              Why are you reporting this user?
            </Text>


            {reportReasons.map(
              (reason) => (

                <TouchableOpacity
                  key={
                    reason
                  }

                  style={[
                    styles.reasonButton,

                    selectedReportReason ===
                      reason &&
                      styles.reasonButtonSelected,
                  ]}

                  onPress={() =>
                    setSelectedReportReason(
                      reason
                    )
                  }
                >

                  <Text
                    style={
                      styles.reasonText
                    }
                  >
                    {reason}
                  </Text>

                </TouchableOpacity>

              )
            )}


            <TouchableOpacity
              style={
                styles.submitReportButton
              }

              onPress={
                submitReport
              }
            >

              <Text
                style={
                  styles.submitReportText
                }
              >
                Submit Report
              </Text>

            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.cancelAction
              }

              onPress={() => {

                setShowReportModal(
                  false
                );

                setSelectedReportReason(
                  ''
                );

              }}
            >

              <Text
                style={
                  styles.cancelActionText
                }
              >
                Cancel
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>


      {/* ==================================================
          REWARDED AD MODAL
          ================================================== */}

      <Modal
        visible={
          showAdModal
        }

        transparent

        animationType="fade"
      >

        <View
          style={
            styles.modalOverlay
          }
        >

          <View
            style={
              styles.modalBox
            }
          >

            <Text
              style={
                styles.modalTitle
              }
            >
              Free Limit Reached
            </Text>


            <Text
              style={
                styles.modalText
            }
            >
              Watch ad to unlock more skips
            </Text>


            <TouchableOpacity
              style={
                styles.watchButton
              }

              onPress={
                showRewardedAd
              }
            >

              <Text
                style={
                  styles.watchButtonText
                }
              >
                Watch Ad
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </KeyboardAvoidingView>

  );

}


// ==================================================
// STYLES
// ==================================================

const styles =
  StyleSheet.create({

    keyboard: {
      flex: 1,
    },


    container: {
      flex: 1,
      backgroundColor:
        '#020617',
    },


    header: {
      paddingTop: 14,
      paddingBottom: 12,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor:
        '#0F172A',
      backgroundColor:
        '#030712',
    },


    avatar: {
      width: 52,
      height: 52,
      borderRadius: 100,
      backgroundColor:
        '#16C6E5',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 8,
    },


    avatarText: {
      color: 'white',
      fontSize: 28,
      fontWeight:
        'bold',
    },


    name: {
      color: 'white',
      fontSize: 18,
      fontWeight:
        '700',
    },


    gender: {
      color: '#94A3B8',
      fontSize: 14,
      marginTop: 2,
    },


    statusContainer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 7,
    },


    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 20,
      marginRight: 8,
    },


    statusText: {
      color: '#CBD5E1',
      fontSize: 14,
      fontWeight:
        '600',
    },


    actionRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 10,
    },


    // =========================
    // FRIEND BUTTON
    // =========================

    friendButton: {
      backgroundColor:
        '#16C6E5',
      paddingHorizontal: 22,
      paddingVertical: 9,
      borderRadius: 18,
    },


    friendButtonSent: {
      backgroundColor:
        '#334155',
    },


    friendButtonDone: {
      backgroundColor:
        '#22C55E',
    },


    friendButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight:
        '800',
    },


    moreButton: {
      marginLeft: 8,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        '#111827',
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    moreButtonText: {
      color: '#FFFFFF',
      fontSize: 25,
      lineHeight: 28,
      fontWeight:
        '800',
    },


    // =========================
    // PARTNER LEFT
    // =========================

    leftBanner: {
      marginHorizontal: 16,
      marginTop: 14,
      padding: 16,
      borderRadius: 18,
      backgroundColor:
        '#111827',
      borderWidth: 1,
      borderColor:
        '#7F1D1D',
    },


    leftTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight:
        '800',
    },


    leftText: {
      color: '#94A3B8',
      fontSize: 13,
      marginTop: 5,
    },


    // =========================
    // CHAT
    // =========================

    chatContainer: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 120,
    },


    messageBubble: {
      maxWidth: '78%',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 24,
      marginBottom: 12,
    },


    myMessage: {
      backgroundColor:
        '#16C6E5',
      alignSelf:
        'flex-end',
      borderBottomRightRadius:
        6,
    },


    otherMessage: {
      backgroundColor:
        '#111827',
      alignSelf:
        'flex-start',
      borderBottomLeftRadius:
        6,
    },


    messageText: {
      color: 'white',
      fontSize: 16,
      lineHeight: 22,
    },

    mediaImage: {
      width: 220,
      height: 220,
      borderRadius: 14,
    },

    mediaVideo: {
      width: 220,
      height: 180,
      borderRadius: 14,
      backgroundColor: '#020617',
    },

    mediaUnavailable: {
      color: '#CBD5E1',
      fontSize: 14,
    },


    typingContainer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginLeft: 18,
      marginBottom: 5,
    },


    typingText: {
      color: '#94A3B8',
      marginLeft: 8,
      fontSize: 13,
    },


    seenText: {
      color: '#64748B',
      textAlign:
        'right',
      marginRight: 18,
      marginBottom: 4,
      fontSize: 12,
    },


    bannerContainer: {
      alignItems:
        'center',
      backgroundColor:
        '#020617',
      paddingVertical: 4,
    },

    mediaPreviewContainer: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 8,
      borderRadius: 14,
      backgroundColor: '#111827',
      borderWidth: 1,
      borderColor: '#1E3A5F',
      flexDirection: 'row',
      alignItems: 'center',
    },

    mediaPreviewImage: {
      width: 72,
      height: 72,
      borderRadius: 10,
    },

    mediaPreviewVideo: {
      width: 110,
      height: 72,
      borderRadius: 10,
      backgroundColor: '#020617',
    },

    mediaPreviewActions: {
      flex: 1,
      marginLeft: 10,
    },

    mediaPreviewText: {
      color: '#E2E8F0',
      fontSize: 13,
      marginBottom: 8,
    },

    mediaCancelButton: {
      alignSelf: 'flex-start',
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: 8,
      backgroundColor: '#7F1D1D',
    },

    mediaCancelText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },

    mediaButton: {
      width: 36,
      height: 42,
      marginLeft: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1E3A5F',
    },

    mediaButtonText: {
      color: '#00E0FF',
      fontSize: 24,
      fontWeight: '500',
      lineHeight: 27,
    },


    inputContainer: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 18,
      borderTopWidth: 1,
      borderTopColor:
        '#0F172A',
      backgroundColor:
        '#020617',
    },


    nextButton: {
      backgroundColor:
        '#111827',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 18,
      marginRight: 8,
    },


    nextText: {
      color: 'white',
      fontSize: 14,
      fontWeight:
        '700',
    },


    input: {
      flex: 1,
      backgroundColor:
        '#111827',
      color: 'white',
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 15,
      maxHeight: 100,
      marginRight: 8,
      textAlignVertical:
        'top',
    },


    sendButton: {
      backgroundColor:
        '#16C6E5',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 18,
    },


    sendText: {
      color: '#000',
      fontWeight:
        '700',
      fontSize: 15,
    },


    // =========================
    // MODALS
    // =========================

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.7)',
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    actionModal: {
      width: '85%',
      backgroundColor:
        '#081225',
      borderRadius: 26,
      padding: 24,
    },


    actionTitle: {
      color: '#FFFFFF',
      fontSize: 21,
      fontWeight:
        '800',
      textAlign:
        'center',
      marginBottom: 16,
    },


    actionItem: {
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor:
        '#1E293B',
    },


    actionItemText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight:
        '600',
      textAlign:
        'center',
    },


    actionItemTextDanger: {
      color: '#FF6B81',
      fontSize: 16,
      fontWeight:
        '700',
      textAlign:
        'center',
    },


    cancelAction: {
      marginTop: 14,
      paddingVertical: 13,
      backgroundColor:
        '#1E293B',
      borderRadius: 16,
    },


    cancelActionText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight:
        '700',
      textAlign:
        'center',
    },


    reportModal: {
      width: '88%',
      backgroundColor:
        '#081225',
      borderRadius: 26,
      padding: 24,
    },


    modalTitle: {
      color: 'white',
      fontSize: 23,
      fontWeight:
        '800',
      textAlign:
        'center',
      marginBottom: 10,
    },


    modalText: {
      color: '#CBD5E1',
      fontSize: 14,
      textAlign:
        'center',
      marginBottom: 18,
    },


    reasonButton: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor:
        '#111827',
      marginBottom: 8,
      borderWidth: 1,
      borderColor:
        '#1E293B',
    },


    reasonButtonSelected: {
      borderColor:
        '#16C6E5',
      backgroundColor:
        '#172033',
    },


    reasonText: {
      color: '#FFFFFF',
      fontSize: 14,
      textAlign:
        'center',
      fontWeight:
        '600',
    },


    submitReportButton: {
      backgroundColor:
        '#16C6E5',
      paddingVertical: 14,
      borderRadius: 17,
      marginTop: 10,
    },


    submitReportText: {
      color: '#000000',
      fontSize: 15,
      fontWeight:
        '800',
      textAlign:
        'center',
    },


    modalBox: {
      width: '85%',
      backgroundColor:
        '#081225',
      borderRadius: 30,
      padding: 28,
      alignItems:
        'center',
    },


    watchButton: {
      backgroundColor:
        '#00E0FF',
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 20,
    },


    watchButtonText: {
      color: '#000',
      fontWeight:
        '800',
      fontSize: 16,
    },

  });
