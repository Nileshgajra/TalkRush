import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
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

              console.log(
                'Matched Successfully:',
                partnerData
              );

              router.replace({
                pathname: '/chat',

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
                    'TalkRush User',

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

        } catch (error) {

          console.log(
            'Searching error:',
            error
          );

          if (mounted) {
            setStarting(false);
          }

        }

      };

    startSearching();

    return () => {

      mounted = false;

      socket.off('matched');
      socket.off('searching');
      socket.off('disconnected');

    };

  }, []);

  // =========================
  // CANCEL
  // =========================

  const cancelSearch = () => {

    socket.emit(
      'disconnect-partner'
    );

    socket.off('matched');
    socket.off('searching');
    socket.off('disconnected');

    router.replace('/home');

  };

  return (

    <View style={styles.container}>

      <View style={styles.outerCircle}>

        <View style={styles.circle}>

          <ActivityIndicator
            size="large"
            color="#FF4F81"
          />

        </View>

      </View>

      <Text style={styles.title}>
        Finding Stranger{dots}
      </Text>

      <Text style={styles.subTitle}>
        Matching you anonymously
      </Text>

      <Text style={styles.hint}>
        {starting
          ? 'Starting search...'
          : 'Please wait while we find someone'}
      </Text>

      <Text style={styles.timer}>
        Searching for {seconds}s
      </Text>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={cancelSearch}
        activeOpacity={0.85}
      >

        <Text style={styles.cancelText}>
          Cancel Search
        </Text>

      </TouchableOpacity>

    </View>

  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#12070D',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },

  outerCircle: {
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor:
      'rgba(255,79,129,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },

  circle: {
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: '#1B0C14',
    borderWidth: 1,
    borderColor: '#4A1D30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    color: '#FF4F81',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
  },

  subTitle: {
    color: '#A995A1',
    fontSize: 16,
    textAlign: 'center',
  },

  hint: {
    color: '#806D79',
    fontSize: 13,
    marginTop: 10,
  },

  timer: {
    color: '#A995A1',
    fontSize: 14,
    marginTop: 18,
  },

  cancelButton: {
    marginTop: 45,
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
  },

  cancelText: {
    color: '#FFF7FB',
    fontSize: 15,
    fontWeight: '700',
  },

});