import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, {
  useEffect,
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
import { SafeAreaView as BottomSafeAreaView } from 'react-native-safe-area-context';

import socket from '../socket';


// =========================
// PROFILE
// =========================

const PROFILE_KEY =
  '@talkrush_profile';


export default function SettingsScreen() {

  const router =
    useRouter();


  // =========================
  // USER
  // =========================

  const [userId, setUserId] =
    useState('');


  // =========================
  // BLOCKED USERS
  // =========================

  const [blockedUsers, setBlockedUsers] =
    useState<any[]>([]);

  const [showBlocked, setShowBlocked] =
    useState(false);

  const [loadingBlocked, setLoadingBlocked] =
    useState(false);


  // =========================
  // REPORTS
  // =========================

  const [reports, setReports] =
    useState<any[]>([]);

  const [showReports, setShowReports] =
    useState(false);

  const [loadingReports, setLoadingReports] =
    useState(false);


  // ==================================================
  // LOAD PROFILE
  // ==================================================

  useEffect(() => {

    const loadProfile =
      async () => {

        try {

          const saved =
            await AsyncStorage.getItem(
              PROFILE_KEY
            );


          if (!saved) {
            return;
          }


          const profile =
            JSON.parse(saved);


          if (
            profile?.userId
          ) {

            setUserId(
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
            'Settings profile error:',
            error
          );

        }

      };


    loadProfile();

  }, []);


  // ==================================================
  // SOCKET EVENTS
  // ==================================================

  useEffect(() => {

    socket.off(
      'blocked-users'
    );

    socket.off(
      'reported-users'
    );

    socket.off(
      'unblock-result'
    );


    // =========================
    // BLOCKED USERS
    // =========================

    socket.on(
      'blocked-users',
      (data) => {

        setLoadingBlocked(
          false
        );


        if (
          data?.success
        ) {

          setBlockedUsers(
            data.blockedUsers ||
            []
          );

        }

      }
    );


    // =========================
    // REPORTS
    // =========================

    socket.on(
      'reported-users',
      (data) => {

        setLoadingReports(
          false
        );


        if (
          data?.success
        ) {

          setReports(
            data.reports ||
            []
          );

        }

      }
    );


    // =========================
    // UNBLOCK RESULT
    // =========================

    socket.on(
      'unblock-result',
      (data) => {

        if (
          data?.success
        ) {

          Alert.alert(
            'User Unblocked',
            'The user has been unblocked.'
          );


          setBlockedUsers(
            (prev) =>
              prev.filter(
                (user) =>
                  user.userId !==
                  data.blockedUserId
              )
          );

        }

        else if (
          data?.message
        ) {

          Alert.alert(
            'Unblock',
            data.message
          );

        }

      }
    );


    return () => {

      socket.off(
        'blocked-users'
      );

      socket.off(
        'reported-users'
      );

      socket.off(
        'unblock-result'
      );

    };

  }, []);


  // ==================================================
  // LOAD BLOCKED USERS
  // ==================================================

  const loadBlockedUsers =
    () => {

      if (!userId) {
        return;
      }


      setLoadingBlocked(
        true
      );


      socket.emit(
        'get-blocked-users',
        {
          userId,
        }
      );

    };


  // ==================================================
  // LOAD REPORTS
  // ==================================================

  const loadReports =
    () => {

      if (!userId) {
        return;
      }


      setLoadingReports(
        true
      );


      socket.emit(
        'get-reported-users',
        {
          userId,
        }
      );

    };


  // ==================================================
  // TOGGLE BLOCKED
  // ==================================================

  const toggleBlocked =
    () => {

      const next =
        !showBlocked;


      setShowBlocked(
        next
      );


      if (next) {

        loadBlockedUsers();

      }

    };


  // ==================================================
  // TOGGLE REPORTS
  // ==================================================

  const toggleReports =
    () => {

      const next =
        !showReports;


      setShowReports(
        next
      );


      if (next) {

        loadReports();

      }

    };


  // ==================================================
  // UNBLOCK USER
  // ==================================================

  const unblockUser =
    (blockedUserId: string) => {

      if (
        !userId ||
        !blockedUserId
      ) {
        return;
      }


      Alert.alert(
        'Unblock User',
        'Do you want to unblock this user?',
        [
          {
            text:
              'Cancel',

            style:
              'cancel',
          },

          {
            text:
              'Unblock',

            onPress: () => {

              socket.emit(
                'unblock-user',
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
  // FORMAT DATE
  // ==================================================

  const formatDate =
    (date: any) => {

      if (!date) {
        return '';
      }


      try {

        return new Date(
          date
        ).toLocaleDateString();

      } catch {

        return '';

      }

    };


  // ==================================================
  // UI
  // ==================================================

  return (

    <SafeAreaView
      style={
        styles.container
      }
    >

      <ScrollView
        style={
          styles.scrollView
        }

        contentContainerStyle={
          styles.content
        }

        showsVerticalScrollIndicator={
          false
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

          <TouchableOpacity
            style={
              styles.backButton
            }

            onPress={() =>
              router.back()
            }
          >

            <Text
              style={
                styles.backText
              }
            >
              ‹
            </Text>

          </TouchableOpacity>


          <View>

            <Text
              style={
                styles.title
              }
            >
              Settings
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Manage your QELUNO account
            </Text>

          </View>

        </View>


        {/* =========================
            MAIN SETTINGS
        ========================= */}

        <View
          style={
            styles.card
          }
        >

          {/* EDIT PROFILE */}

          <TouchableOpacity
            style={
              styles.row
            }

            onPress={() =>
              router.push(
                '/profile'
              )
            }
          >

            <View
              style={
                styles.iconBox
              }
            >

              <Text
                style={
                  styles.icon
                }
              >
                👤
              </Text>

            </View>


            <View
              style={
                styles.rowContent
              }
            >

              <Text
                style={
                  styles.rowTitle
                }
              >
                Edit Profile
              </Text>

              <Text
                style={
                  styles.rowSubtitle
                }
              >
                Change your name, age or gender
              </Text>

            </View>


            <Text
              style={
                styles.arrow
              }
            >
              ›
            </Text>

          </TouchableOpacity>


          {/* BLOCKED USERS */}

          <TouchableOpacity
            style={
              styles.row
            }

            onPress={
              toggleBlocked
            }
          >

            <View
              style={
                styles.iconBox
              }
            >

              <Text
                style={
                  styles.icon
                }
              >
                🚫
              </Text>

            </View>


            <View
              style={
                styles.rowContent
              }
            >

              <Text
                style={
                  styles.rowTitle
                }
              >
                Blocked Users
              </Text>

              <Text
                style={
                  styles.rowSubtitle
                }
              >
                View and unblock users you blocked
              </Text>

            </View>


            <Text
              style={
                styles.arrow
              }
            >
              {showBlocked
                ? '⌃'
                : '›'}
            </Text>

          </TouchableOpacity>


          {/* BLOCKED USER LIST */}

          {showBlocked && (

            <View
              style={
                styles.expandedBox
              }
            >

              {loadingBlocked ? (

                <ActivityIndicator
                  size="small"
                  color="#FF4F81"
                />

              ) : blockedUsers.length === 0 ? (

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  You have not blocked anyone.
                </Text>

              ) : (

                blockedUsers.map(
                  (user) => (

                    <View
                      key={
                        user.userId
                      }

                      style={
                        styles.userItem
                      }
                    >

                      <View
                        style={
                          styles.smallAvatar
                        }
                      >

                        <Text
                          style={
                            styles.smallAvatarText
                          }
                        >
                          {String(
                            user.name ||
                            'U'
                          ).charAt(0)}
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
                          {user.name ||
                            'User'}
                        </Text>

                        <Text
                          style={
                            styles.userIdText
                          }
                        >
                          Blocked
                        </Text>

                      </View>


                      <TouchableOpacity
                        style={
                          styles.unblockButton
                        }

                        onPress={() =>
                          unblockUser(
                            user.userId
                          )
                        }
                      >

                        <Text
                          style={
                            styles.unblockText
                          }
                        >
                          Unblock
                        </Text>

                      </TouchableOpacity>

                    </View>

                  )
                )

              )}

            </View>

          )}


          {/* REPORTS */}

          <TouchableOpacity
            style={
              styles.row
            }

            onPress={
              toggleReports
            }
          >

            <View
              style={
                styles.iconBox
              }
            >

              <Text
                style={
                  styles.icon
                }
              >
                ⚠️
              </Text>

            </View>


            <View
              style={
                styles.rowContent
              }
            >

              <Text
                style={
                  styles.rowTitle
                }
              >
                My Reports
              </Text>

              <Text
                style={
                  styles.rowSubtitle
                }
              >
                View reports you have submitted
              </Text>

            </View>


            <Text
              style={
                styles.arrow
              }
            >
              {showReports
                ? '⌃'
                : '›'}
            </Text>

          </TouchableOpacity>


          {/* REPORT LIST */}

          {showReports && (

            <View
              style={
                styles.expandedBox
              }
            >

              {loadingReports ? (

                <ActivityIndicator
                  size="small"
                  color="#FF4F81"
                />

              ) : reports.length === 0 ? (

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  You have not submitted any reports.
                </Text>

              ) : (

                reports.map(
                  (report) => (

                    <View
                      key={
                        report.reportId ||
                        report._id
                      }

                      style={
                        styles.reportItem
                      }
                    >

                      <View
                        style={
                          styles.reportHeader
                        }
                      >

                        <Text
                          style={
                            styles.reportTitle
                          }
                        >
                          Report
                        </Text>


                        <Text
                          style={
                            styles.reportStatus
                          }
                        >
                          {report.status ||
                            'Submitted'}
                        </Text>

                      </View>


                      <Text
                        style={
                          styles.reportReason
                        }
                      >
                        Reason: {report.reason}
                      </Text>


                      <Text
                        style={
                          styles.reportDate
                        }
                      >
                        {formatDate(
                          report.createdAt
                        )}
                      </Text>

                    </View>

                  )
                )

              )}

            </View>

          )}

        </View>


        {/* =========================
            APP INFO
        ========================= */}

        <View
          style={
            styles.info
          }
        >

          <Text
            style={
              styles.heart
            }
          >
            ♥
          </Text>

          <Text
            style={
              styles.infoText
            }
          >
            QELUNO
          </Text>

          <Text
            style={
              styles.version
            }
          >
            Version 1.0
          </Text>

        </View>

      </ScrollView>

      <BottomSafeAreaView
        style={
          styles.bottomSafeArea
        }

        edges={['bottom']}
      >
        <View
          style={
            styles.bottomNav
          }
        >
          <TouchableOpacity
            style={
              styles.navItem
            }

            onPress={() =>
              router.replace('/home')
            }

            activeOpacity={0.8}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ⌂
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.navItem
            }

            onPress={() =>
              router.replace('/friend' as any)
            }

            activeOpacity={0.8}
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ♡
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Friends
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.navItem
            }

            onPress={() =>
              router.replace('/settings' as any)
            }

            activeOpacity={0.8}
          >
            <Text
              style={
                styles.navIconActive
              }
            >
              ⚙
            </Text>

            <Text
              style={
                styles.navTextActive
              }
            >
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSafeAreaView>

    </SafeAreaView>

  );

}


// ==================================================
// STYLES
// ==================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        '#12070D',
    },


    scrollView: {
      flex: 1,
    },


    content: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 40,
    },


    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 28,
    },


    backButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        '#21101A',
      borderWidth: 1,
      borderColor:
        '#4A1D30',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 14,
    },


    backText: {
      color: '#FFF7FB',
      fontSize: 34,
      lineHeight: 36,
      marginTop: -3,
    },


    title: {
      color: '#FFF7FB',
      fontSize: 27,
      fontWeight: '800',
    },


    subtitle: {
      color: '#A995A1',
      fontSize: 13,
      marginTop: 3,
    },


    card: {
      backgroundColor:
        '#1B0C14',
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        '#38202B',
      overflow: 'hidden',
    },


    row: {
      minHeight: 82,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        '#30202A',
    },


    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        '#29101B',
      borderWidth: 1,
      borderColor:
        '#4A1D30',
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    icon: {
      fontSize: 20,
    },


    rowContent: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
    },


    rowTitle: {
      color: '#FFF7FB',
      fontSize: 16,
      fontWeight: '800',
    },


    rowSubtitle: {
      color: '#A995A1',
      fontSize: 11.5,
      marginTop: 4,
    },


    arrow: {
      color: '#806B77',
      fontSize: 27,
    },


    expandedBox: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor:
        '#150A10',
      borderBottomWidth: 1,
      borderBottomColor:
        '#30202A',
    },


    emptyText: {
      color: '#A995A1',
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 14,
    },


    userItem: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        '#30202A',
    },


    smallAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#FF4F81',
      justifyContent:
        'center',
      alignItems:
        'center',
    },


    smallAvatarText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
    },


    userInfo: {
      flex: 1,
      marginLeft: 11,
    },


    userName: {
      color: '#FFF7FB',
      fontSize: 15,
      fontWeight: '700',
    },


    userIdText: {
      color: '#806B77',
      fontSize: 11,
      marginTop: 3,
    },


    unblockButton: {
      backgroundColor:
        '#29101B',
      borderWidth: 1,
      borderColor:
        '#FF4F81',
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 14,
    },


    unblockText: {
      color: '#FF6B91',
      fontSize: 12,
      fontWeight: '800',
    },


    reportItem: {
      backgroundColor:
        '#1B0C14',
      borderRadius: 14,
      padding: 13,
      marginBottom: 9,
      borderWidth: 1,
      borderColor:
        '#38202B',
    },


    reportHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },


    reportTitle: {
      color: '#FFF7FB',
      fontSize: 14,
      fontWeight: '800',
    },


    reportStatus: {
      color: '#FF6B91',
      fontSize: 11,
      fontWeight: '700',
    },


    reportReason: {
      color: '#CDBBC5',
      fontSize: 13,
      marginTop: 7,
    },


    reportDate: {
      color: '#806B77',
      fontSize: 10,
      marginTop: 7,
    },


    info: {
      alignItems:
        'center',
      marginTop: 40,
    },


    heart: {
      color: '#FF4F81',
      fontSize: 28,
    },


    infoText: {
      color: '#FFF7FB',
      fontSize: 15,
      fontWeight: '700',
      marginTop: 5,
    },


    version: {
      color: '#806B77',
      fontSize: 11,
      marginTop: 4,
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
      justifyContent: 'space-around',
      alignItems: 'center',
    },


    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },


    navIcon: {
      color: '#806B77',
      fontSize: 23,
    },


    navIconActive: {
      color: '#FF4F81',
      fontSize: 23,
    },


    navText: {
      color: '#806B77',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 3,
    },


    navTextActive: {
      color: '#FF4F81',
      fontSize: 11,
      fontWeight: '800',
      marginTop: 3,
    },

  });
