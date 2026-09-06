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

import { addCoins, getCoins } from './utils/coins';

const PROFILE_KEY = '@talkrush_profile';

const BANNER_AD_UNIT_ID =
  'ca-app-pub-6592726204956042/5797951306';

const REWARDED_AD_UNIT_ID =
  'ca-app-pub-6592726204956042/9182662547';

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

  const openGenderMatch = () => {
    if (!profile) {
      router.replace('/profile');
      return;
    }

    router.push({
      pathname: '/match',
      params: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
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

    const rewarded = RewardedAd.createForAdRequest(
      REWARDED_AD_UNIT_ID,
      {
        requestNonPersonalizedAdsOnly: true,
      }
    );

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewarded.show();
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
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
                TalkRush <Text style={styles.logoHeart}>♥</Text>
              </Text>

              <Text style={styles.welcome}>
                {profile?.name
                  ? `Welcome, ${profile.name}`
                  : 'Welcome to TalkRush'}
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
          <TouchableOpacity
            style={styles.card}
            onPress={openGenderMatch}
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

           <TouchableOpacity
  style={styles.navItem}
  onPress={() => router.push('/settings' as any)}
  activeOpacity={0.8}
>
  <Text style={styles.navIcon}>
    ⚙
  </Text>

  <Text style={styles.navText}>
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

  main: {
    flex: 1,
    backgroundColor: '#12070D',
  },

  scrollContent: {
    paddingHorizontal: 18,

    // Header moved lower
    paddingTop: Platform.OS === 'android' ? 18 : 12,

    // Space before bottom navigation
    paddingBottom: 12,
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
    color: '#FFF7FB',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  logoHeart: {
    color: '#FF4F81',
  },

  welcome: {
    color: '#A995A1',
    fontSize: 13,
    marginTop: 4,
  },

  coinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 10,
  },

  coinIcon: {
    fontSize: 17,
  },

  coinText: {
    color: '#FFF7FB',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 5,
  },

  titleSection: {
    marginTop: 18,
    marginBottom: 11,
  },

  title: {
    color: '#FFF7FB',
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 28,
  },

  subtitle: {
    color: '#A995A1',
    fontSize: 13.5,
    marginTop: 5,
  },

  card: {
    backgroundColor: '#1B0C14',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38202B',
    marginBottom: 9,
    minHeight: 72,
  },

  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  icon: {
    fontSize: 21,
  },

  cardContent: {
    flex: 1,
    marginLeft: 11,
    marginRight: 6,
  },

  cardTitle: {
    color: '#FFF7FB',
    fontSize: 17,
    fontWeight: '800',
  },

  cardSubtitle: {
    color: '#A995A1',
    fontSize: 12,
    marginTop: 3,
  },

  freeBadge: {
    backgroundColor: '#17351F',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  freeText: {
    color: '#6EE7A0',
    fontSize: 10,
    fontWeight: '800',
  },

  coinBadge: {
    backgroundColor: '#3A2912',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  coinBadgeText: {
    color: '#FFD166',
    fontSize: 11,
    fontWeight: '800',
  },

  rewardCard: {
    backgroundColor: '#26101A',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64213D',
    marginBottom: 8,
    minHeight: 72,
  },

  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#3A1425',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rewardIcon: {
    fontSize: 21,
  },

  rewardTitle: {
    color: '#FFF7FB',
    fontSize: 16,
    fontWeight: '800',
  },

  rewardSubtitle: {
    color: '#BFA5B2',
    fontSize: 12,
    marginTop: 3,
  },

  earnBadge: {
    backgroundColor: '#FF4F81',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
  },

  earnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    minHeight: 50,
  },

  /*
   * Safe-area bottom navigation.
   * The extra bottom padding prevents Android gesture/
   * navigation buttons from covering Home/Friends/Profile.
   */
  bottomSafeArea: {
    backgroundColor: '#180A11',
    paddingBottom: Platform.OS === 'android' ? 8 : 4,
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