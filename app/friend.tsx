import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import socket from '../socket';

const PROFILE_KEY = '@talkrush_profile';

type Profile = {
  userId: string;
  name: string;
  age: string;
  gender: string;
  photo?: string;
};

type Friend = {
  userId: string;
  name: string;
  age: number | string;
  gender: string;
};

type FriendRequest = {
  requestId: string;
  fromUserId: string;
  toUserId: string;
  name: string;
  age: number | string;
  gender: string;
};

export default function FriendScreen() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [friends, setFriends] =
    useState<Friend[]>([]);

  const [requests, setRequests] =
    useState<FriendRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  // =========================
  // LOAD PROFILE
  // =========================

  const loadProfile = async () => {
    try {
      const saved =
        await AsyncStorage.getItem(
          PROFILE_KEY
        );

      if (saved) {
        const data: Profile =
          JSON.parse(saved);

        setProfile(data);

        return data;
      }
    } catch (error) {
      console.log(
        'Friend profile load error:',
        error
      );
    }

    return null;
  };

  // =========================
  // LOAD FRIEND DATA
  // =========================

  const loadFriendData = (
    currentProfile?: Profile | null
  ) => {
    const activeProfile =
      currentProfile || profile;

    if (
      !activeProfile?.userId
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);

    socket.off('friend-data');

    socket.once(
      'friend-data',
      (data) => {

        setLoading(false);

        if (!data?.success) {
          setFriends([]);
          setRequests([]);
          return;
        }

        setFriends(
          data.friends || []
        );

        setRequests(
          data.requests || []
        );

      }
    );

    socket.emit(
      'get-friend-data',
      {
        userId:
          activeProfile.userId,
      }
    );
  };

  // =========================
  // SCREEN FOCUS
  // =========================

  useFocusEffect(
    useCallback(() => {

      let active = true;

      const load = async () => {

        const currentProfile =
          await loadProfile();

        if (active) {
          loadFriendData(
            currentProfile
          );
        }

      };

      load();

      return () => {
        active = false;
        socket.off('friend-data');
      };

    }, [])
  );

  // =========================
  // ACCEPT REQUEST
  // =========================

  const acceptRequest = (
    requestId: string
  ) => {

    socket.off(
      'friend-request-result'
    );

    socket.once(
      'friend-request-result',
      (result) => {

        if (result?.success) {

          Alert.alert(
            'Friend Added ❤️',
            'You are now friends.'
          );

          loadFriendData();

        } else {

          Alert.alert(
            'Unable to Accept',
            result?.message ||
              'Please try again.'
          );

        }

      }
    );

    socket.emit(
      'accept-friend-request',
      {
        requestId,
      }
    );
  };

  // =========================
  // REJECT REQUEST
  // =========================

  const rejectRequest = (
    requestId: string
  ) => {

    socket.off(
      'friend-request-result'
    );

    socket.once(
      'friend-request-result',
      (result) => {

        if (result?.success) {

          loadFriendData();

        } else {

          Alert.alert(
            'Unable to Reject',
            result?.message ||
              'Please try again.'
          );

        }

      }
    );

    socket.emit(
      'reject-friend-request',
      {
        requestId,
      }
    );
  };

  // =========================
  // CHAT WITH FRIEND
  // =========================

  const startFriendChat = (
    friend: Friend
  ) => {

    if (!profile) {
      router.replace('/profile');
      return;
    }

    router.push({
      pathname: '/chat',

      params: {

        myUserId:
          profile.userId,

        myName:
          profile.name,

        myAge:
          profile.age,

        myGender:
          profile.gender,

        strangerUserId:
          friend.userId,

        strangerName:
          friend.name,

        strangerAge:
          String(friend.age),

        strangerGender:
          friend.gender,

        genderFilter:
          'Random',

        skipCount:
          '0',

        isFriend:
          'true',

      },
    });
  };

  // =========================
  // HOME
  // =========================

  const openHome = () => {
    router.replace('/home');
  };

  // =========================
  // SETTINGS
  // =========================

  const openSettings = () => {
    router.push('/settings' as any);
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.screen}>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
        >

          {/* HEADER */}

          <View style={styles.header}>

            <View style={styles.headerText}>

              <Text style={styles.title}>
                Friends
              </Text>

              <Text style={styles.subtitle}>
                Your friends and requests
              </Text>

            </View>

            <View
              style={styles.heartCircle}
            >
              <Text style={styles.heart}>
                ♥
              </Text>
            </View>

          </View>

          {/* LOADING */}

          {loading && (
            <View
              style={styles.loading}
            >
              <ActivityIndicator
                size="small"
                color="#FF4F81"
              />

              <Text
                style={styles.loadingText}
              >
                Loading...
              </Text>
            </View>
          )}

          {/* FRIEND REQUESTS */}

          {!loading &&
            requests.length > 0 && (
              <View
                style={styles.section}
              >

                <Text
                  style={styles.sectionTitle}
                >
                  Friend Requests
                </Text>

                {requests.map(
                  (request) => (
                    <View
                      key={
                        request.requestId
                      }
                      style={
                        styles.requestCard
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
                          {request.name
                            ?.charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.userInfo
                        }
                      >
                        <Text
                          style={
                            styles.userName
                          }
                        >
                          {request.name}
                        </Text>

                        <Text
                          style={
                            styles.userDetails
                          }
                        >
                          {request.age
                            ? `${request.age} • `
                            : ''}
                          {request.gender}
                        </Text>

                        <View
                          style={
                            styles.requestButtons
                          }
                        >

                          <TouchableOpacity
                            style={
                              styles.acceptButton
                            }
                            onPress={() =>
                              acceptRequest(
                                request.requestId
                              )
                            }
                            activeOpacity={
                              0.85
                            }
                          >
                            <Text
                              style={
                                styles.acceptText
                              }
                            >
                              Accept
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={
                              styles.rejectButton
                            }
                            onPress={() =>
                              rejectRequest(
                                request.requestId
                              )
                            }
                            activeOpacity={
                              0.85
                            }
                          >
                            <Text
                              style={
                                styles.rejectText
                              }
                            >
                              Reject
                            </Text>
                          </TouchableOpacity>

                        </View>

                      </View>

                    </View>
                  )
                )}

              </View>
            )}

          {/* FRIENDS */}

          {!loading &&
            friends.length > 0 && (
              <View
                style={styles.section}
              >

                <Text
                  style={styles.sectionTitle}
                >
                  My Friends
                </Text>

                {friends.map(
                  (friend) => (
                    <View
                      key={
                        friend.userId
                      }
                      style={
                        styles.friendCard
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
                          {friend.name
                            ?.charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.userInfo
                        }
                      >

                        <Text
                          style={
                            styles.userName
                          }
                        >
                          {friend.name}
                        </Text>

                        <Text
                          style={
                            styles.userDetails
                          }
                        >
                          {friend.age
                            ? `${friend.age} • `
                            : ''}
                          {friend.gender}
                        </Text>

                      </View>

                      <TouchableOpacity
                        style={
                          styles.chatButton
                        }
                        onPress={() =>
                          startFriendChat(
                            friend
                          )
                        }
                        activeOpacity={
                          0.85
                        }
                      >
                        <Text
                          style={
                            styles.chatButtonText
                          }
                        >
                          Chat
                        </Text>
                      </TouchableOpacity>

                    </View>
                  )
                )}

              </View>
            )}

          {/* EMPTY STATE */}

          {!loading &&
            friends.length === 0 &&
            requests.length === 0 && (
              <View
                style={
                  styles.emptyContainer
                }
              >

                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Text
                    style={
                      styles.emptyHeart
                    }
                  >
                    ♥
                  </Text>
                </View>

                <Text
                  style={styles.emptyTitle}
                >
                  No friends yet
                </Text>

                <Text
                  style={styles.emptyText}
                >
                  Meet someone in Random Chat
                  {'\n'}
                  and send them a friend request.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={
                    styles.startButton
                  }
                  onPress={() =>
                    router.push(
                      '/home'
                    )
                  }
                >
                  <Text
                    style={
                      styles.startButtonText
                    }
                  >
                    Start Chatting
                  </Text>

                  <Text
                    style={styles.arrow}
                  >
                    →
                  </Text>
                </TouchableOpacity>

              </View>
            )}

        </ScrollView>

        {/* BOTTOM NAV */}

        <View
          style={
            styles.bottomSafeArea
          }
        >
          <View
            style={styles.bottomNav}
          >

            {/* HOME */}

            <TouchableOpacity
              style={styles.navItem}
              onPress={openHome}
              activeOpacity={0.8}
            >
              <Text
                style={styles.navIcon}
              >
                ⌂
              </Text>

              <Text
                style={styles.navText}
              >
                Home
              </Text>
            </TouchableOpacity>

            {/* FRIENDS */}

            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.navIconActive
                }
              >
                ♡
              </Text>

              <Text
                style={
                  styles.navTextActive
                }
              >
                Friends
              </Text>
            </TouchableOpacity>

            {/* SETTINGS */}

            <TouchableOpacity
              style={styles.navItem}
              onPress={openSettings}
              activeOpacity={0.8}
            >
              <Text
                style={styles.navIcon}
              >
                ⚙
              </Text>

              <Text
                style={styles.navText}
              >
                Settings
              </Text>
            </TouchableOpacity>

          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#12070D',
  },

  screen: {
    flex: 1,
    backgroundColor: '#12070D',
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop:
      Platform.OS === 'android'
        ? 18
        : 12,
    paddingBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: '#FFF7FB',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  subtitle: {
    color: '#A995A1',
    fontSize: 13,
    marginTop: 4,
  },

  heartCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  heart: {
    color: '#FF4F81',
    fontSize: 22,
  },

  loading: {
    alignItems: 'center',
    marginTop: 55,
  },

  loadingText: {
    color: '#A995A1',
    fontSize: 13,
    marginTop: 8,
  },

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    color: '#FFF7FB',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },

  requestCard: {
    backgroundColor: '#1B0C14',
    borderWidth: 1,
    borderColor: '#64213D',
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    marginBottom: 10,
  },

  friendCard: {
    backgroundColor: '#1B0C14',
    borderWidth: 1,
    borderColor: '#38202B',
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3A1425',
    borderWidth: 1,
    borderColor: '#FF4F81',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#FF4F81',
    fontSize: 21,
    fontWeight: '800',
  },

  userInfo: {
    flex: 1,
    marginLeft: 12,
  },

  userName: {
    color: '#FFF7FB',
    fontSize: 16,
    fontWeight: '800',
  },

  userDetails: {
    color: '#A995A1',
    fontSize: 12,
    marginTop: 3,
  },

  requestButtons: {
    flexDirection: 'row',
    marginTop: 9,
  },

  acceptButton: {
    backgroundColor: '#FF4F81',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 7,
  },

  acceptText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  rejectButton: {
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },

  rejectText: {
    color: '#A995A1',
    fontSize: 12,
    fontWeight: '700',
  },

  chatButton: {
    backgroundColor: '#FF4F81',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 11,
  },

  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 68,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyHeart: {
    color: '#FF4F81',
    fontSize: 40,
  },

  emptyTitle: {
    color: '#FFF7FB',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 17,
  },

  emptyText: {
    color: '#A995A1',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },

  startButton: {
    marginTop: 20,
    height: 52,
    minWidth: 245,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#FF4F81',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 9,
  },

  bottomSafeArea: {
    backgroundColor: '#180A11',
    paddingBottom:
      Platform.OS === 'android'
        ? 8
        : 4,
  },

  bottomNav: {
    height: 64,
    backgroundColor: '#180A11',
    borderTopWidth: 1,
    borderTopColor: '#38202B',
    flexDirection: 'row',
    justifyContent:
      'space-around',
    alignItems: 'center',
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIcon: {
    fontSize: 23,
    color: '#806D79',
  },

  navIconActive: {
    fontSize: 23,
    color: '#FF4F81',
  },

  navText: {
    marginTop: 3,
    fontSize: 11,
    color: '#806D79',
    fontWeight: '600',
  },

  navTextActive: {
    marginTop: 3,
    fontSize: 11,
    color: '#FF4F81',
    fontWeight: '800',
  },

});