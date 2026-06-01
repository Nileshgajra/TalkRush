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

export default function SearchingScreen() {

  const router = useRouter();

  const {
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

  // TIMER
  useEffect(() => {

    const timer =
      setInterval(() => {

        setSeconds((prev) =>
          prev + 1
        );

      }, 1000);

    return () =>
      clearInterval(timer);

  }, []);

  // DOT ANIMATION
  useEffect(() => {

    const dotInterval =
      setInterval(() => {

        setDots((prev) => {

          if (prev.length >= 3)
            return '';

          return prev + '.';

        });

      }, 500);

    return () =>
      clearInterval(dotInterval);

  }, []);

  // SOCKET SEARCH
  useEffect(() => {

    console.log(
      'Searching Started'
    );

    socket.off('matched');
    socket.off('searching');
    socket.off('disconnected');

    // START SEARCH
    socket.emit(
      'find-stranger',
      {
        name,
        age,
        gender,
        genderFilter:
          genderFilter || 'Random',
      }
    );

    // WAITING
    socket.on(
      'searching',
      () => {

        console.log(
          'Waiting for Stranger'
        );

      }
    );

    // MATCHED
    socket.on(
      'matched',
      (partnerData) => {

        console.log(
          'Matched Successfully'
        );

        router.replace({

          pathname: '/chat',

          params: {

            skipCount,

            myName: name,
            myAge: age,
            myGender: gender,

            genderFilter:
              genderFilter ||
              'Random',

            strangerName:
              partnerData.name,

            strangerAge:
              partnerData.age,

            strangerGender:
              partnerData.gender,

          },

        });

      }
    );

    return () => {

      socket.off('matched');

      socket.off('searching');

      socket.off('disconnected');

    };

  }, []);

  // CANCEL SEARCH
  const cancelSearch = () => {

    router.back();

  };

  return (

    <View style={styles.container}>

      {/* OUTER GLOW */}
      <View style={styles.outerCircle}>

        {/* INNER CIRCLE */}
        <View style={styles.circle}>

          <ActivityIndicator
            size="large"
            color="#00E0FF"
          />

        </View>

      </View>

      {/* TITLE */}
      <Text style={styles.title}>
        Finding Stranger{dots}
      </Text>

      {/* SUBTITLE */}
      <Text style={styles.subTitle}>
        Matching you anonymously
      </Text>

      {/* HINT */}
      <Text style={styles.hint}>
        Please wait while we find someone
      </Text>

      {/* TIMER */}
      <Text style={styles.timer}>
        Searching for {seconds}s
      </Text>

      {/* CANCEL BUTTON */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={cancelSearch}
      >

        <Text
          style={styles.cancelText}
        >
          Cancel Search
        </Text>

      </TouchableOpacity>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#020617',
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
      'rgba(0,224,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },

  circle: {
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: '#081225',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    color: '#00E0FF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
  },

  subTitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
  },

  hint: {
    color: '#475569',
    fontSize: 13,
    marginTop: 10,
  },

  timer: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 18,
  },

  cancelButton: {
    marginTop: 45,
    backgroundColor: '#172033',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
  },

  cancelText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

});