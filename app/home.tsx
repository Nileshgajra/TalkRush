import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import { addCoins, getCoins, spendCoin } from './utils/coins';

const PROFILE_KEY = '@talkrush_profile';

const BANNER_AD_UNIT_ID =
  'ca-app-pub-3940256099942544/9214589741';

const REWARDED_AD_UNIT_ID =
  'ca-app-pub-3940256099942544/5224354917';

type Profile = {
  name: string;
  age: string;
  gender: string;
};

export default function HomeScreen() {
  const router = useRouter();

  const [coins, setCoins] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingAd, setLoadingAd] = useState(false);

  // Gender Match controls
  const [genderExpanded, setGenderExpanded] = useState(false);
  const [selectedGender, setSelectedGender] = useState('');

  const loadData = async () => {
    try {
      const savedProfile =
        await AsyncStorage.getItem(PROFILE_KEY);

      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }

      const balance = await getCoins();
      setCoins(balance);
    } catch (error) {
      console.log('Home load error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const startRandomChat = () => {
    if (!profile) {
      router.replace('/profile');
      return;
    }

    router.push({
      pathname: '/searching',
      params: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        genderFilter: 'Random',
        skipCount: '0',
      },
    });
  };

  // Expand / collapse Gender Match
  const toggleGenderMatch = () => {
    if (!profile) {
      router.replace('/profile');
      return;
    }

    setGenderExpanded((previous) => !previous);
  };

  // Start Gender Match
  const continueGenderMatch = async () => {
    if (!profile) {
      router.replace('/profile');
      return;
    }

    if (!selectedGender) {
      Alert.alert(
        'Choose Gender',
        'Please select Male or Female.'
      );
      return;
    }

    if (coins < 1) {
      Alert.alert(
        'Not Enough Coins',
        'You need 1 coin for Gender Match. Watch an ad to earn a coin.'
      );
      return;
    }

    const success = await spendCoin();

    if (!success) {
      Alert.alert(
        'Not Enough Coins',
        'You need 1 coin for Gender Match.'
      );
      return;
    }

    const newBalance = await getCoins();
    setCoins(newBalance);

    router.push({
      pathname: '/searching',
      params: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        genderFilter: selectedGender,
        skipCount: '0',
      },
    });
  };

  const openProfile = () => {
    router.push('/profile');
  };

  const openFriends = () => {
    router.push('/friend' as any);
  };

  const watchAdForCoin = () => {
    if (loadingAd) return;

    setLoadingAd(true);

    let adShown = false;
    let rewardGranted = false;

    const rewarded = RewardedAd.createForAdRequest(
      REWARDED_AD_UNIT_ID,
      {
        requestNonPersonalizedAdsOnly: true,
      }
    );

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        if (adShown) {
          return;
        }

        adShown = true;
        rewarded.show();
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        if (rewardGranted) {
          return;
        }

        rewardGranted = true;

        try {
          const newBalance = await addCoins(1);
          setCoins(newBalance);

          Alert.alert(
            'Coin Earned ❤️',
            'You received 1 coin.'
          );
        } catch (error) {
          console.log('Coin reward error:', error);
        }
      }
    );

    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setLoadingAd(false);

        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
      }
    );

    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.log('Rewarded ad error:', error);

        setLoadingAd(false);

        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();

        Alert.alert(
          'Ad unavailable',
          'Please try again in a moment.'
        );
      }
    );

    rewarded.load();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.main}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.logo}>
                QELUNO <Text style={styles.logoHeart}>♥</Text>
              </Text>

              <Text style={styles.welcome}>
                {profile?.name
                  ? `Welcome, ${profile.name}`
                  : 'Welcome to QELUNO'}
              </Text>
            </View>

            <View style={styles.coinBox}>
              <Text style={styles.coinIcon}>🪙</Text>

              <Text style={styles.coinText}>
                {coins}
              </Text>
            </View>
          </View>

          {/* TITLE */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              Who do you want to talk to?
            </Text>

            <Text style={styles.subtitle}>
              Meet someone new. Chat anonymously.
            </Text>
          </View>

          {/* RANDOM CHAT */}
          <TouchableOpacity
            style={styles.card}
            onPress={startRandomChat}
            activeOpacity={0.88}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>💬</Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>
                Random Chat
              </Text>

              <Text style={styles.cardSubtitle}>
                Talk to someone new instantly
              </Text>
            </View>

            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>
                FREE
              </Text>
            </View>
          </TouchableOpacity>

          {/* GENDER MATCH */}
          <View
            style={[
              styles.card,
              genderExpanded && styles.genderExpandedCard,
            ]}
          >
            <TouchableOpacity
              style={styles.genderHeader}
              onPress={toggleGenderMatch}
              activeOpacity={0.88}
            >
              <View style={styles.iconBox}>
                <Text style={styles.icon}>💕</Text>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  Gender Match
                </Text>

                <Text style={styles.cardSubtitle}>
                  Choose Male or Female
                </Text>
              </View>

              <View style={styles.coinBadge}>
                <Text style={styles.coinBadgeText}>
                  🪙 1
                </Text>
              </View>
            </TouchableOpacity>

            {/* EXPANDED GENDER OPTIONS */}
            {genderExpanded && (
              <View style={styles.genderOptions}>

                <Text style={styles.chooseText}>
                  Who do you want to talk to?
                </Text>

                <View style={styles.genderRow}>

                  {/* MALE */}
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      selectedGender === 'Male' &&
                        styles.genderButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedGender('Male')
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.genderEmoji}>
                      👨
                    </Text>

                    <Text
                      style={[
                        styles.genderButtonText,
                        selectedGender === 'Male' &&
                          styles.genderButtonTextSelected,
                      ]}
                    >
                      Male
                    </Text>
                  </TouchableOpacity>

                  {/* FEMALE */}
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      selectedGender === 'Female' &&
                        styles.genderButtonSelected,
                    ]}
                    onPress={() =>
                      setSelectedGender('Female')
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.genderEmoji}>
                      👩
                    </Text>

                    <Text
                      style={[
                        styles.genderButtonText,
                        selectedGender === 'Female' &&
                          styles.genderButtonTextSelected,
                      ]}
                    >
                      Female
                    </Text>
                  </TouchableOpacity>

                </View>

                {/* CONTINUE */}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !selectedGender &&
                      styles.continueButtonDisabled,
                  ]}
                  onPress={continueGenderMatch}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueText}>
                    Continue ❤️
                  </Text>
                </TouchableOpacity>

                <Text style={styles.costText}>
                  🪙 1 coin required
                </Text>

              </View>
            )}
          </View>

          {/* WATCH AD */}
          <TouchableOpacity
            style={styles.rewardCard}
            onPress={watchAdForCoin}
            activeOpacity={0.88}
            disabled={loadingAd}
          >
            <View style={styles.rewardIconBox}>
              <Text style={styles.rewardIcon}>
                🎁
              </Text>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.rewardTitle}>
                {loadingAd
                  ? 'Loading Ad...'
                  : 'Watch Ad & Earn Coin'}
              </Text>

              <Text style={styles.rewardSubtitle}>
                Watch a short ad and get 1 coin
              </Text>
            </View>

            <View style={styles.earnBadge}>
              <Text style={styles.earnText}>
                +1 🪙
              </Text>
            </View>
          </TouchableOpacity>

          {/* BANNER */}
          <View style={styles.adContainer}>
            <BannerAd
              unitId={BANNER_AD_UNIT_ID}
              size={BannerAdSize.BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>

        </ScrollView>

        {/* BOTTOM NAVIGATION */}
        <View style={styles.bottomSafeArea}>
          <View style={styles.bottomNav}>

            {/* HOME */}
            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.8}
            >
              <Text style={styles.navIconActive}>
                ⌂
              </Text>

              <Text style={styles.navTextActive}>
                Home
              </Text>
            </TouchableOpacity>

            {/* FRIENDS */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={openFriends}
              activeOpacity={0.8}
            >
              <Text style={styles.navIcon}>
                ♡
              </Text>

              <Text style={styles.navText}>
                Friends
              </Text>
            </TouchableOpacity>

            {/* SETTINGS */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() =>
                router.push('/settings' as any)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.navIcon}>
                ⚙
              </Text>

              <Text style={styles.navText}>
                Profile
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
    backgroundColor: '#16070D',
  },

  main: {
    flex: 1,
    backgroundColor: '#16070D',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 26 : 18,
    paddingBottom: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerLeft: {
    flex: 1,
  },

  logo: {
    color: '#FFF9FB',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  logoHeart: {
    color: '#FF6B91',
  },

  welcome: {
    color: '#C6AAB5',
    fontSize: 13.5,
    marginTop: 5,
  },

  coinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D0E1C',
    borderWidth: 1,
    borderColor: '#683048',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 19,
    marginLeft: 10,
  },

  coinIcon: {
    fontSize: 17,
  },

  coinText: {
    color: '#FFF9FB',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 5,
  },

  titleSection: {
    marginTop: 30,
    marginBottom: 15,
  },

  title: {
    color: '#FFF9FB',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 31,
  },

  subtitle: {
    color: '#C6AAB5',
    fontSize: 14,
    marginTop: 6,
  },

  card: {
    backgroundColor: '#260D18',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#542033',
    marginBottom: 12,
    minHeight: 78,
    shadowColor: '#080204',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },

  genderExpandedCard: {
    paddingBottom: 16,
    borderColor: '#8A3655',
  },

  genderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#401226',
    borderWidth: 1,
    borderColor: '#6C2944',
    justifyContent: 'center',
    alignItems: 'center',
  },

  icon: {
    fontSize: 22,
  },

  cardContent: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  cardTitle: {
    color: '#FFF9FB',
    fontSize: 17,
    fontWeight: '800',
  },

  cardSubtitle: {
    color: '#C6AAB5',
    fontSize: 12.5,
    marginTop: 4,
  },

  freeBadge: {
    backgroundColor: '#213B2A',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
  },

  freeText: {
    color: '#6EE7A0',
    fontSize: 10,
    fontWeight: '800',
  },

  coinBadge: {
    backgroundColor: '#482920',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 11,
  },

  coinBadgeText: {
    color: '#FFD166',
    fontSize: 11,
    fontWeight: '800',
  },

  /* GENDER OPTIONS */

  genderOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#5B263A',
  },

  chooseText: {
    color: '#FFF4F7',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },

  genderButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: '#18070E',
    borderWidth: 1,
    borderColor: '#613047',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  genderButtonSelected: {
    backgroundColor: '#50152C',
    borderColor: '#FF668B',
  },

  genderEmoji: {
    fontSize: 20,
    marginRight: 7,
  },

  genderButtonText: {
    color: '#D8BBC6',
    fontSize: 14,
    fontWeight: '800',
  },

  genderButtonTextSelected: {
    color: '#FFFFFF',
  },

  continueButton: {
    marginTop: 14,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#F34C7A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  continueButtonDisabled: {
    opacity: 0.55,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  costText: {
    color: '#C6AAB5',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },

  /* REWARD CARD */

  rewardCard: {
    backgroundColor: '#32101F',
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7B2C4A',
    marginBottom: 12,
    minHeight: 78,
    shadowColor: '#080204',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },

  rewardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#55172E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rewardIcon: {
    fontSize: 21,
  },

  rewardTitle: {
    color: '#FFF9FB',
    fontSize: 16,
    fontWeight: '800',
  },

  rewardSubtitle: {
    color: '#D1AFBC',
    fontSize: 12.5,
    marginTop: 4,
  },

  earnBadge: {
    backgroundColor: '#F34C7A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
  },

  earnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    minHeight: 50,
  },

  /* BOTTOM NAV */

  bottomSafeArea: {
    backgroundColor: '#1B0911',
    paddingBottom: Platform.OS === 'android' ? 8 : 4,
  },

  bottomNav: {
    height: 68,
    backgroundColor: '#1B0911',
    borderTopWidth: 1,
    borderTopColor: '#542033',
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
    color: '#9F7181',
    fontSize: 23,
  },

  navIconActive: {
    color: '#FF668B',
    fontSize: 23,
  },

  navText: {
    color: '#9F7181',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  navTextActive: {
    color: '#FF668B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
});
