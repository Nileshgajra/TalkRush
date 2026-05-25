import React, {
  useEffect,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
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
  } = useLocalSearchParams();

  useEffect(() => {

    console.log(
      'Searching Started'
    );

    // REMOVE OLD EVENTS
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

  return (

    <View style={styles.container}>

      <View style={styles.circle}>

        <ActivityIndicator
          size="large"
          color="#00E0FF"
        />

      </View>

      <Text style={styles.title}>
        Finding Stranger...
      </Text>

      <Text style={styles.subTitle}>
        Matching you anonymously
      </Text>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },

  circle: {
    width: 110,
    height: 110,
    borderRadius: 100,
    backgroundColor: '#081225',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },

  title: {
    color: '#00E0FF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },

  subTitle: {
    color: '#94A3B8',
    fontSize: 15,
  },

});