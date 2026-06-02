// match.tsx

import React, { useEffect, useState } from 'react';

import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const rewarded = RewardedAd.createForAdRequest(
  TestIds.REWARDED
);
export default function MatchScreen() {

  const params = useLocalSearchParams();

  const [showGenderSelect, setShowGenderSelect] =
    useState(false);

  const [selectedGender, setSelectedGender] =
    useState('');
    const [adLoaded, setAdLoaded] =
  useState(false);

useEffect(() => {

  rewarded.load();

  const loadedListener =
    rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setAdLoaded(true);
      }
    );

  const rewardListener =
    rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {

        router.push({
          pathname: '/searching',
          params: {
            name: params.name,
            age: params.age,
            gender: params.gender,
            genderFilter: selectedGender,
          },
        });

        setAdLoaded(false);
        rewarded.load();

      }
    );

  return () => {
    loadedListener();
    rewardListener();
  };

}, []);

  // RANDOM CHAT
  const startRandomChat = () => {

    router.push({
      pathname: '/searching',

      params: {
        name: params.name,
        age: params.age,
        gender: params.gender,
        genderFilter: 'Random',
      },
    });

  };

  // OPEN GENDER SELECTION
  const openGenderMatch = () => {

    setShowGenderSelect(true);

  };

  // CONTINUE GENDER MATCH
  const continueGenderMatch = () => {

  if (!selectedGender) return;

  if (!adLoaded) {
    alert('Ad loading, try again');
    return;
  }

  setAdLoaded(false);
  rewarded.show();

};

  return (

    <SafeAreaView style={styles.container}>

      {/* TITLE */}
      <Text style={styles.title}>
        Choose Match Type
      </Text>

      {/* RANDOM CHAT */}
      <TouchableOpacity
        style={styles.randomCard}
        activeOpacity={0.8}
        onPress={startRandomChat}
      >

        <Text style={styles.cardTitle}>
          Random Chat
        </Text>

        <Text style={styles.cardText}>
          Free unlimited anonymous matching
        </Text>

      </TouchableOpacity>

      {/* GENDER MATCH */}
      <TouchableOpacity
        style={styles.genderCard}
        activeOpacity={0.8}
        onPress={openGenderMatch}
      >

        <Text style={styles.cardTitle}>
          Gender Match
        </Text>

        <Text style={styles.cardText}>
          Watch ad to match preferred gender
        </Text>

      </TouchableOpacity>

      {/* GENDER SELECT BOX */}
      {showGenderSelect && (

        <View style={styles.selectBox}>

          <Text style={styles.selectTitle}>
            Select Gender
          </Text>

          <View style={styles.genderRow}>

            {/* MALE */}
            <TouchableOpacity
              style={[
                styles.genderButton,

                selectedGender === 'Male' &&
                  styles.activeGender,
              ]}
              onPress={() =>
                setSelectedGender('Male')
              }
            >

              <Text style={styles.genderText}>
                Male
              </Text>

            </TouchableOpacity>

            {/* FEMALE */}
            <TouchableOpacity
              style={[
                styles.genderButton,

                selectedGender ===
                  'Female' &&
                  styles.activeGender,
              ]}
              onPress={() =>
                setSelectedGender(
                  'Female'
                )
              }
            >

              <Text style={styles.genderText}>
                Female
              </Text>

            </TouchableOpacity>

          </View>

          {/* CONTINUE */}
          <TouchableOpacity
            style={[
              styles.continueButton,

              !selectedGender && {
                opacity: 0.5,
              },
            ]}
            disabled={!selectedGender}
            onPress={
              continueGenderMatch
            }
          >

            <Text
              style={styles.continueText}
            >
              Watch Ad & Continue
            </Text>

          </TouchableOpacity>

        </View>

      )}

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  title: {
    color: 'white',
    fontSize: 38,
    fontWeight: '800',
    marginBottom: 50,
    textAlign: 'center',
  },

  randomCard: {
    backgroundColor: '#00E0FF',
    borderRadius: 30,
    padding: 28,
    marginBottom: 24,
  },

  genderCard: {
    backgroundColor: '#081225',
    borderRadius: 30,
    padding: 28,
    borderWidth: 2,
    borderColor: '#00E0FF',
  },

  cardTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },

  cardText: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
  },

  selectBox: {
    marginTop: 40,
    backgroundColor: '#081225',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#0F172A',
  },

  selectTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 22,
    textAlign: 'center',
  },

  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  genderButton: {
    width: '48%',
    backgroundColor: '#0F172A',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },

  activeGender: {
    backgroundColor: '#00E0FF',
  },

  genderText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },

  continueButton: {
    backgroundColor: '#00E0FF',
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: 'center',
  },

  continueText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },

});