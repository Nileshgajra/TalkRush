import AsyncStorage from '@react-native-async-storage/async-storage';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
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


// =========================
// ADS
// =========================

const rewarded =
  RewardedAd.createForAdRequest(
    'ca-app-pub-6592726204956042/9182662547'
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


  // =========================
  // STRANGER
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
      String(params.myUserId || '')
    );


  // =========================
  // MESSAGE
  // =========================

  const [message, setMessage] =
    useState('');


  const [messages, setMessages] =
    useState<any[]>([]);


  // =========================
  // STATUS
  // =========================

  const [status, setStatus] =
    useState('Online');


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


  // =========================
  // FRIEND STATUS
  // =========================

  const [friendStatus, setFriendStatus] =
    useState<
      'none' |
      'sending' |
      'sent' |
      'friends'
    >('none');


  // =========================
  // LOAD PROFILE
  // =========================

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
            profile.userId &&
            !myUserId
          ) {

            setMyUserId(
              profile.userId
            );

          }


          // Register again to make sure
          // backend knows this socket user
          if (profile.userId) {

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


  // =========================
  // REWARDED AD
  // =========================

  useEffect(() => {

    rewarded.load();


    const unsubscribeLoaded =
      rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {

          console.log(
            'Rewarded Ad Loaded'
          );

        }
      );


    const unsubscribeReward =
      rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {

          setSkipCount(0);

          setShowAdModal(false);

          isLeavingRef.current =
            false;


          rewarded.load();

        }
      );


    const unsubscribeClosed =
      rewarded.addAdEventListener(
        AdEventType.CLOSED,
        () => {

          setShowAdModal(false);

          isLeavingRef.current =
            false;

          rewarded.load();

        }
      );


    return () => {

      unsubscribeLoaded();

      unsubscribeReward();

      unsubscribeClosed();

    };

  }, []);


  // ==================================================
  // SOCKET EVENTS
  // ==================================================

  useEffect(() => {

    socket.off('matched');
    socket.off('message');
    socket.off('typing');
    socket.off('seen');
    socket.off('disconnected');

    socket.off(
      'friend-request-result'
    );

    socket.off(
      'friend-request-accepted'
    );

    socket.off(
      'new-friend-request'
    );


    // =========================
    // MATCHED
    // =========================

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


        setStatus('Online');

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


    // =========================
    // MESSAGE
    // =========================

    socket.on(
      'message',
      (text) => {

        setTyping(false);

        socket.emit('seen');


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


    // =========================
    // TYPING
    // =========================

    socket.on(
      'typing',
      () => {

        setTyping(true);


        setTimeout(
          () => {

            setTyping(false);

          },
          1200
        );

      }
    );


    // =========================
    // SEEN
    // =========================

    socket.on(
      'seen',
      () => {

        setSeen(true);

      }
    );


    // =========================
    // DISCONNECTED
    // =========================

    socket.on(
      'disconnected',
      () => {

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


        setStatus(
          'Searching'
        );


        setTyping(false);

        setSeen(false);

        setMessages([]);


        setStranger({

          userId: '',

          name:
            'Searching...',

          age: '',

          gender: '',

        });


        setFriendStatus(
          'none'
        );


        disconnectTimer.current =
          setTimeout(
            () => {

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
                      skipCount
                    ),

                },

              });

            },
            1500
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

          // Request sent
          if (
            result.message ===
            'Friend request sent.'
          ) {

            setFriendStatus(
              'sent'
            );


            Alert.alert(
              'Friend Request ❤️',
              'Friend request sent successfully.'
            );

          }


          // Accepted
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


          // Rejected
          else if (
            result.message ===
            'Friend request rejected.'
          ) {

            Alert.alert(
              'Request Rejected',
              'Friend request rejected.'
            );

          }

        } else {

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

        console.log(
          'New Friend Request:',
          request
        );


        Alert.alert(
          'New Friend Request ❤️',
          `${stranger.name || 'Someone'} wants to be your friend.`,
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


    return () => {

      socket.off('matched');

      socket.off('message');

      socket.off('typing');

      socket.off('seen');

      socket.off('disconnected');

      socket.off(
        'friend-request-result'
      );

      socket.off(
        'friend-request-accepted'
      );

      socket.off(
        'new-friend-request'
      );

    };

  }, [myUserId, stranger.name, skipCount]);


  // ==================================================
  // SEND FRIEND REQUEST
  // ==================================================

  const sendFriendRequest =
    () => {

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
          'Your profile is still loading. Please try again.'
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


      setFriendStatus(
        'sending'
      );


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
  // SEND MESSAGE
  // ==================================================

  const sendMessage =
    () => {

      if (
        !message.trim()
      ) {

        return;

      }


      setSeen(false);


      socket.emit(
        'message',
        message
      );


      setMessages(
        (prev) => [
          ...prev,

          {
            id:
              Date.now().toString(),

            text:
              message,

            sender:
              'me',
          },
        ]
      );


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
  // NEXT USER
  // ==================================================

  const nextUser =
    () => {

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


      setSkipCount(
        (prev) =>
          prev + 1
      );


      clearTimeout(
        disconnectTimer.current
      );


      socket.off('matched');

      socket.off('message');

      socket.off('typing');

      socket.off('seen');

      socket.off('disconnected');


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
              skipCount + 1
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


      return '#EF4444';

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
              ADD FRIEND
          ========================= */}

          {status ===
            'Online' &&
            stranger.userId && (

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

        </View>


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
              item.id
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

                <Text
                  style={
                    styles.messageText
                  }
                >
                  {item.text}
                </Text>

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
              Stranger typing...
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
            unitId="ca-app-pub-6592726204956042/5797951306"

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
              Next
            </Text>

          </TouchableOpacity>


          <TextInput
            value={
              message
            }

            onChangeText={
              (text) => {

                setMessage(
                  text
                );

                socket.emit(
                  'typing'
                );

              }
            }

            placeholder="Type message..."

            placeholderTextColor="#64748B"

            style={
              styles.input
            }

            multiline
          />


          <TouchableOpacity
            style={
              styles.sendButton
            }

            onPress={
              sendMessage
            }
          >

            <Text
              style={
                styles.sendText
              }
            >
              Send
            </Text>

          </TouchableOpacity>

        </View>

      </View>


      {/* =========================
          REWARDED AD MODAL
      ========================= */}

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
                () => {

                  rewarded.show();

                }
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


    // =========================
    // FRIEND BUTTON
    // =========================

    friendButton: {
      marginTop: 10,
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
    // AD MODAL
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


    modalBox: {
      width: '85%',
      backgroundColor:
        '#081225',
      borderRadius: 30,
      padding: 28,
      alignItems:
        'center',
    },


    modalTitle: {
      color: 'white',
      fontSize: 24,
      fontWeight:
        '800',
      marginBottom: 12,
    },


    modalText: {
      color: '#CBD5E1',
      fontSize: 15,
      textAlign:
        'center',
      marginBottom: 28,
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