import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import socket from '../socket';

const PROFILE_KEY = '@talkrush_profile';

type Profile = {
  userId: string;
  name: string;
  age: string;
  gender: string;
};

export default function SearchingScreen() {

  const router = useRouter();

  const {
    userId,
    name,
    age,
    gender,
    genderFilter,
    skipCount,
  } = useLocalSearchParams();

  const [dots, setDots] =
    useState('');

  const [seconds, setSeconds] =
    useState(0);

  const [starting, setStarting] =
    useState(true);

  const matchedRef = useRef(false);


  // =========================
  // TIMER
  // =========================

  useEffect(() => {

    const timer =
      setInterval(() => {

        setSeconds(
          (prev) => prev + 1
        );

      }, 1000);

    return () =>
      clearInterval(timer);

  }, []);


  // =========================
  // ANIMATED DOTS
  // =========================

  useEffect(() => {

    const dotInterval =
      setInterval(() => {

        setDots((prev) => {

          if (prev.length >= 3) {
            return '';
          }

          return prev + '.';

        });

      }, 500);

    return () =>
      clearInterval(dotInterval);

  }, []);


  // =========================
  // START SEARCH
  // =========================

  useEffect(() => {

    let mounted = true;

    const startSearching =
      async () => {

        try {

          let finalUserId =
            typeof userId === 'string'
              ? userId
              : '';

          let finalName =
            typeof name === 'string'
              ? name
              : '';

          let finalAge =
            typeof age === 'string'
              ? age
              : '';

          let finalGender =
            typeof gender === 'string'
              ? gender
              : '';


          // =========================
          // FALLBACK TO SAVED PROFILE
          // =========================

          if (
            !finalUserId ||
            !finalName ||
            !finalAge ||
            !finalGender
          ) {

            const saved =
              await AsyncStorage.getItem(
                PROFILE_KEY
              );

            if (saved) {

              const profile: Profile =
                JSON.parse(saved);

              finalUserId =
                finalUserId ||
                profile.userId ||
                '';

              finalName =
                finalName ||
                profile.name ||
                '';

              finalAge =
                finalAge ||
                profile.age ||
                '';

              finalGender =
                finalGender ||
                profile.gender ||
                '';

            }

          }


          if (!mounted) {
            return;
          }


          setStarting(false);


          console.log(
            'Searching Started:',
            finalUserId
          );


          // =========================
          // CLEAR OLD LISTENERS
          // =========================

          socket.off('matched');
          socket.off('searching');
          socket.off('disconnected');


          // =========================
          // SEARCHING
          // =========================

          socket.on(
            'searching',
            () => {

              console.log(
                'Waiting for Stranger'
              );

            }
          );


          // =========================
          // MATCHED
          // =========================

          socket.on(
            'matched',
            (partnerData) => {

              matchedRef.current = true;

              console.log(
                'Matched Successfully:',
                partnerData
              );


              router.replace({

                pathname:
                  '/chat',

                params: {

                  skipCount:
                    typeof skipCount ===
                    'string'
                      ? skipCount
                      : '0',

                  myUserId:
                    finalUserId,

                  myName:
                    finalName,

                  myAge:
                    finalAge,

                  myGender:
                    finalGender,

                  genderFilter:
                    typeof genderFilter ===
                    'string'
                      ? genderFilter
                      : 'Random',

                  strangerUserId:
                    partnerData?.userId ||
                    '',

                  strangerName:
                    partnerData?.name ||
                    'QELUNO User',

                  strangerAge:
                    String(
                      partnerData?.age ||
                      ''
                    ),

                  strangerGender:
                    partnerData?.gender ||
                    '',

                },

              });

            }
          );


          // =========================
          // FIND STRANGER
          // =========================

          socket.emit(
            'find-stranger',
            {

              userId:
                finalUserId,

              name:
                finalName,

              age:
                finalAge,

              gender:
                finalGender,

              genderFilter:
                typeof genderFilter ===
                'string'
                  ? genderFilter
                  : 'Random',

            }
          );

        } catch (error) {

          console.log(
            'Searching error:',
            error
          );

          if (mounted) {

            setStarting(
              false
            );

          }

        }

      };


    startSearching();


    return () => {

      mounted = false;

      // Leaving this screen before a match (for example with the Android
      // back gesture) must also remove the socket from the server queue.
      if (!matchedRef.current) {
        socket.emit('disconnect-partner');
      }

      socket.off('matched');
      socket.off('searching');
      socket.off('disconnected');

    };

  }, []);


  // =========================
  // CANCEL
  // =========================

  const cancelSearch = () => {

    matchedRef.current = true;

    socket.emit(
      'disconnect-partner'
    );


    socket.off('matched');
    socket.off('searching');
    socket.off('disconnected');


    router.replace(
      '/home'
    );

  };


  // =========================
  // UI
  // =========================

  return (

    <SafeAreaView style={styles.safeArea}>
      <View
        style={
          styles.container
        }
      >

      <Text style={styles.eyebrow}>
        QELUNO
      </Text>

      <View style={styles.searchSurface}>

      <View
        style={
          styles.outerCircle
        }
      >

        <View
          style={
            styles.circle
          }
        >

          <ActivityIndicator
            size="large"
            color="#FF6B91"
          />

        </View>

      </View>


      <Text
        style={
          styles.title
        }
      >
        Finding Stranger{dots}
      </Text>


      <Text
        style={
          styles.subTitle
        }
      >
        Matching you anonymously
      </Text>


      <Text
        style={
          styles.hint
        }
      >
        {starting
          ? 'Starting search...'
          : 'Please wait while we find someone'}
      </Text>


      <Text
        style={
          styles.timer
        }
      >
        Searching for {seconds}s
      </Text>

      </View>


      <TouchableOpacity
        style={
          styles.cancelButton
        }

        onPress={
          cancelSearch
        }

        activeOpacity={
          0.85
        }
      >

        <Text
          style={
            styles.cancelText
          }
        >
          Cancel Search
        </Text>

      </TouchableOpacity>

      </View>
    </SafeAreaView>

  );

}


// ==================================================
// STYLES
// ==================================================

const styles =
  StyleSheet.create({

    safeArea: {

      flex: 1,

      backgroundColor:
        '#16070D',

    },

    container: {

      flex: 1,

      backgroundColor:
        '#16070D',

      justifyContent:
        'center',

      alignItems:
        'center',

      paddingHorizontal:
        20,

      paddingBottom:
        36,

    },

    eyebrow: {

      color:
        '#FF6B91',

      fontSize:
        11,

      fontWeight:
        '800',

      letterSpacing:
        2.4,

      marginBottom:
        20,

    },

    searchSurface: {

      width:
        '100%',

      backgroundColor:
        '#260D18',

      borderWidth:
        1,

      borderColor:
        '#542033',

      borderRadius:
        30,

      paddingHorizontal:
        20,

      paddingTop:
        28,

      paddingBottom:
        26,

      alignItems:
        'center',

      shadowColor:
        '#080204',

      shadowOffset: {
        width: 0,
        height: 10,
      },

      shadowOpacity:
        0.3,

      shadowRadius:
        20,

      elevation:
        5,

    },


    outerCircle: {

      width: 150,

      height: 150,

      borderRadius: 999,

      backgroundColor:
        'rgba(243,76,122,0.14)',

      borderWidth:
        1,

      borderColor:
        'rgba(255,107,145,0.28)',

      justifyContent:
        'center',

      alignItems:
        'center',

      marginBottom:
        28,

    },


    circle: {

      width: 110,

      height: 110,

      borderRadius: 999,

      backgroundColor:
        '#18070E',

      borderWidth: 1,

      borderColor:
        '#71314B',

      justifyContent:
        'center',

      alignItems:
        'center',

    },


    title: {

      color:
        '#FFF9FB',

      fontSize:
        28,

      fontWeight:
        '800',

      marginBottom:
        9,

      letterSpacing:
        -0.4,

    },


    subTitle: {

      color:
        '#E0C6CF',

      fontSize:
        15,

      textAlign:
        'center',

    },


    hint: {

      color:
        '#B993A2',

      fontSize:
        13.5,

      marginTop:
        10,

    },


    timer: {

      color:
        '#FF91AC',

      fontSize:
        13,

      marginTop:
        20,

      fontWeight:
        '700',

    },


    cancelButton: {

      marginTop:
        22,

      backgroundColor:
        '#401226',

      borderWidth:
        1,

      borderColor:
        '#8A3655',

      paddingVertical:
        17,

      paddingHorizontal:
        34,

      borderRadius:
        18,

      shadowColor:
        '#080204',

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.2,

      shadowRadius:
        10,

      elevation:
        3,

    },


    cancelText: {

      color:
        '#FFF9FB',

      fontSize:
        15,

      fontWeight:
        '700',

    },

  });
