import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';

import {
  Alert,
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

import { spendCoin } from './utils/coins';

export default function MatchScreen() {
  const params = useLocalSearchParams();

  const [showGenderSelect, setShowGenderSelect] =
    useState(false);

  const [selectedGender, setSelectedGender] =
    useState('');

  const selectedGenderRef =
    useRef('');

  const [coinBalance, setCoinBalance] =
    useState(0);

  // LOAD COIN BALANCE
  const loadCoins = async () => {
    try {
      const savedCoins =
        await AsyncStorage.getItem('talkrush_coins');

      if (savedCoins === null) {
        setCoinBalance(0);
        return;
      }

      setCoinBalance(Number(savedCoins));
    } catch (error) {
      console.log(
        'Error loading coins:',
        error
      );
    }
  };

  useEffect(() => {
    loadCoins();
  }, []);

  // RANDOM CHAT
  // FREE - NO COIN
  // SKIP COUNT SYSTEM IS NOT CHANGED
  const startRandomChat = () => {
    router.push({
      pathname: '/searching',

      params: {
        name: params.name,
        age: params.age,
        gender: params.gender,

        genderFilter: 'Random',

        // Keep existing skip count
        skipCount:
          params.skipCount || '0',
      },
    });
  };

  // OPEN GENDER MATCH
  const openGenderMatch = () => {
    setShowGenderSelect(true);

    loadCoins();

    console.log(
      'Gender Match opened'
    );
  };

  // SELECT GENDER
  const selectGender = (
    gender: string
  ) => {
    setSelectedGender(gender);

    selectedGenderRef.current =
      gender;
  };

  // GENDER MATCH
  // COST = 1 COIN
  const continueGenderMatch =
    async () => {

      if (!selectedGender) {
        return;
      }

      console.log(
        'Selected Gender:',
        selectedGenderRef.current
      );

      // CHECK + SPEND 1 COIN
      const coinSpent =
        await spendCoin();

      if (!coinSpent) {

        Alert.alert(
          'Not Enough Coins',
          'You need 1 coin to use Gender Match.',
          [
            {
              text: 'OK',
              onPress: () => {
                loadCoins();
              },
            },
          ]
        );

        return;
      }

      console.log(
        '1 coin spent for Gender Match'
      );

      // SAVE SELECTED GENDER
      const genderFilter =
        selectedGenderRef.current;

      // CLEAR SELECTION
      setShowGenderSelect(false);

      setSelectedGender('');

      selectedGenderRef.current =
        '';

      // UPDATE BALANCE
      await loadCoins();

      // START GENDER SEARCH
      router.push({
        pathname: '/searching',

        params: {
          name: params.name,
          age: params.age,
          gender: params.gender,

          genderFilter,

          // KEEP SKIP COUNT
          skipCount:
            params.skipCount || '0',
        },
      });
    };

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* HEADER */}
      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerHeart}>
          <Text
            style={styles.headerHeartText}
          >
            ♥
          </Text>
        </View>

        {/* COIN BALANCE */}
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>
            🪙 {coinBalance}
          </Text>
        </View>

      </View>

      {/* TITLE */}
      <View style={styles.titleSection}>

        <Text style={styles.title}>
          Find someone to talk to
        </Text>

        <Text style={styles.subtitle}>
          Choose how you want to connect 💕
        </Text>

      </View>

      {/* RANDOM CHAT */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.randomCard}
        onPress={startRandomChat}
      >

        <View style={styles.randomIcon}>
          <Text
            style={styles.randomIconText}
          >
            💬
          </Text>
        </View>

        <View style={styles.cardContent}>

          <Text style={styles.randomTitle}>
            Random Chat
          </Text>

          <Text style={styles.randomText}>
            Meet someone new instantly
          </Text>

          <View style={styles.freeBadge}>
            <Text
              style={styles.freeBadgeText}
            >
              FREE
            </Text>
          </View>

        </View>

        <Text style={styles.whiteArrow}>
          ›
        </Text>

      </TouchableOpacity>

      {/* GENDER MATCH */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.genderCard,
          showGenderSelect &&
            styles.genderCardActive,
        ]}
        onPress={openGenderMatch}
      >

        <View style={styles.genderIcon}>
          <Text
            style={styles.genderIconText}
          >
            ❤️
          </Text>
        </View>

        <View style={styles.cardContent}>

          <Text style={styles.cardTitle}>
            Gender Match
          </Text>

          <Text style={styles.cardText}>
            Find someone by gender
          </Text>

          <View style={styles.coinBadgeSmall}>
            <Text
              style={styles.coinBadgeSmallText}
            >
              🪙 1 COIN
            </Text>
          </View>

        </View>

        <Text style={styles.darkArrow}>
          ›
        </Text>

      </TouchableOpacity>

      {/* GENDER SELECTION */}
      {showGenderSelect && (

        <View style={styles.selectBox}>

          <View style={styles.selectHeader}>

            <View>

              <Text style={styles.selectTitle}>
                Who would you like to meet?
              </Text>

              <Text
                style={styles.selectSubtitle}
              >
                Choose one option
              </Text>

            </View>

            <Text style={styles.selectHeart}>
              ♥
            </Text>

          </View>

          {/* GENDER BUTTONS */}
          <View style={styles.genderRow}>

            {/* MALE */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.genderChoice,

                selectedGender === 'Male' &&
                  styles.selectedGenderChoice,
              ]}
              onPress={() =>
                selectGender('Male')
              }
            >

              <Text
                style={styles.choiceEmoji}
              >
                👨
              </Text>

              <Text
                style={[
                  styles.choiceText,

                  selectedGender === 'Male' &&
                    styles.selectedChoiceText,
                ]}
              >
                Male
              </Text>

              {selectedGender === 'Male' && (

                <View
                  style={styles.checkCircle}
                >

                  <Text
                    style={styles.checkText}
                  >
                    ✓
                  </Text>

                </View>

              )}

            </TouchableOpacity>

            {/* FEMALE */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.genderChoice,

                selectedGender === 'Female' &&
                  styles.selectedGenderChoice,
              ]}
              onPress={() =>
                selectGender('Female')
              }
            >

              <Text
                style={styles.choiceEmoji}
              >
                👩
              </Text>

              <Text
                style={[
                  styles.choiceText,

                  selectedGender === 'Female' &&
                    styles.selectedChoiceText,
                ]}
              >
                Female
              </Text>

              {selectedGender === 'Female' && (

                <View
                  style={styles.checkCircle}
                >

                  <Text
                    style={styles.checkText}
                  >
                    ✓
                  </Text>

                </View>

              )}

            </TouchableOpacity>

          </View>

          {/* COIN INFORMATION */}
          <View style={styles.coinInfo}>

            <Text style={styles.coinInfoIcon}>
              🪙
            </Text>

            <View
              style={styles.coinInfoContent}
            >

              <Text
                style={styles.coinInfoTitle}
              >
                Gender Match costs 1 coin
              </Text>

              <Text
                style={styles.coinInfoText}
              >
                Your current balance: {coinBalance} coins
              </Text>

            </View>

          </View>

          {/* CONTINUE */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!selectedGender}
            style={[
              styles.continueButton,

              !selectedGender &&
                styles.disabledButton,
            ]}
            onPress={continueGenderMatch}
          >

            <Text style={styles.continueIcon}>
              🪙
            </Text>

            <Text style={styles.continueText}>
              Use 1 Coin & Continue
            </Text>

          </TouchableOpacity>

        </View>

      )}

      {/* BOTTOM MESSAGE */}
      {!showGenderSelect && (

        <View style={styles.bottomHint}>

          <Text style={styles.bottomHeart}>
            ♥
          </Text>

          <Text style={styles.bottomText}>
            Every conversation starts with hello.
          </Text>

        </View>

      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#120814',
    paddingHorizontal: 20,
  },

  header: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F111B',
    borderWidth: 1,
    borderColor: '#38202F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backText: {
    color: '#F8DCE7',
    fontSize: 34,
    fontWeight: '300',
    lineHeight: 36,
  },

  headerHeart: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#28121F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerHeartText: {
    color: '#FF4F81',
    fontSize: 25,
  },

  coinBadge: {
    minWidth: 65,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    backgroundColor: '#28121F',
    borderWidth: 1,
    borderColor: '#4A293B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  coinText: {
    color: '#FFD76A',
    fontSize: 13,
    fontWeight: '800',
  },

  titleSection: {
    marginTop: 25,
    marginBottom: 28,
  },

  title: {
    color: '#FFF7FB',
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  subtitle: {
    color: '#BFAFBA',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 9,
  },

  randomCard: {
    minHeight: 125,
    backgroundColor: '#FF4F81',
    borderRadius: 25,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#FF4F81',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },

  randomIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  randomIconText: {
    fontSize: 25,
  },

  cardContent: {
    flex: 1,
    marginLeft: 15,
  },

  randomTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  randomText: {
    color: '#FFE6EE',
    fontSize: 13,
    marginTop: 5,
  },

  freeBadge: {
    alignSelf: 'flex-start',
    marginTop: 9,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },

  freeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  whiteArrow: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '300',
  },

  genderCard: {
    minHeight: 125,
    backgroundColor: '#1B0F19',
    borderRadius: 25,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A2331',
  },

  genderCardActive: {
    borderColor: '#FF4F81',
  },

  genderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A1420',
    justifyContent: 'center',
    alignItems: 'center',
  },

  genderIconText: {
    fontSize: 24,
  },

  cardTitle: {
    color: '#FFF7FB',
    fontSize: 20,
    fontWeight: '900',
  },

  cardText: {
    color: '#BFAFBA',
    fontSize: 13,
    marginTop: 5,
  },

  coinBadgeSmall: {
    alignSelf: 'flex-start',
    marginTop: 9,
    backgroundColor: '#2A1420',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },

  coinBadgeSmallText: {
    color: '#FFD76A',
    fontSize: 9,
    fontWeight: '900',
  },

  darkArrow: {
    color: '#806D79',
    fontSize: 34,
    fontWeight: '300',
  },

  selectBox: {
    marginTop: 18,
    backgroundColor: '#1B0F19',
    borderRadius: 26,
    padding: 19,
    borderWidth: 1,
    borderColor: '#3A2331',
  },

  selectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  selectTitle: {
    color: '#FFF7FB',
    fontSize: 17,
    fontWeight: '800',
  },

  selectSubtitle: {
    color: '#8E7784',
    fontSize: 12,
    marginTop: 4,
  },

  selectHeart: {
    color: '#FF4F81',
    fontSize: 28,
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },

  genderChoice: {
    flex: 1,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#261520',
    borderWidth: 1,
    borderColor: '#3B2533',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedGenderChoice: {
    backgroundColor: '#FF4F81',
    borderColor: '#FF4F81',
  },

  choiceEmoji: {
    fontSize: 23,
    marginBottom: 3,
  },

  choiceText: {
    color: '#DCCBD4',
    fontSize: 14,
    fontWeight: '800',
  },

  selectedChoiceText: {
    color: '#FFFFFF',
  },

  checkCircle: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkText: {
    color: '#FF4F81',
    fontSize: 12,
    fontWeight: '900',
  },

  coinInfo: {
    backgroundColor: '#24141F',
    borderRadius: 17,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  coinInfoIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  coinInfoContent: {
    flex: 1,
  },

  coinInfoTitle: {
    color: '#F5DCE8',
    fontSize: 12,
    fontWeight: '800',
  },

  coinInfoText: {
    color: '#8E7784',
    fontSize: 10,
    marginTop: 3,
  },

  continueButton: {
    height: 55,
    borderRadius: 18,
    backgroundColor: '#FF4F81',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  disabledButton: {
    opacity: 0.4,
  },

  continueIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  bottomHint: {
    marginTop: 'auto',
    marginBottom: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },

  bottomHeart: {
    color: '#FF4F81',
    fontSize: 17,
    marginRight: 7,
  },

  bottomText: {
    color: '#806D79',
    fontSize: 12,
  },

});