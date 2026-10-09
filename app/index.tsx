import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ensureAnonymousUser } from './utils/auth';

const PROFILE_KEY = '@talkrush_profile';

type Profile = {
  userId?: string;
  name?: string;
  age?: string;
  gender?: string;
};

const hasValidProfile = (profile: Profile) => {
  const age = Number(profile.age);

  return (
    Boolean(profile.userId) &&
    Boolean(profile.name?.trim()) &&
    Number.isInteger(age) &&
    age >= 18 &&
    age <= 60 &&
    (profile.gender === 'Male' || profile.gender === 'Female')
  );
};

export default function Index() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const pulse = useRef(
    new Animated.Value(1)
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);

        const user = await ensureAnonymousUser();

        if (!savedProfile) {
          setHasProfile(false);
          return;
        }

        const profile: Profile = JSON.parse(savedProfile);
        if (profile.userId !== user.uid) {
          profile.userId = user.uid;
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        }
        setHasProfile(hasValidProfile(profile));
      } catch {
        setHasProfile(false);
      }
    };

    loadProfile();
  }, []);

  if (hasProfile === null) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.markOuter,
              {
                transform: [{ scale: pulse }],
              },
            ]}
          >
            <View style={styles.markInner}>
              <View style={styles.messageBubble}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          </Animated.View>

          <Text style={styles.brand}>QELUNO</Text>
          <Text style={styles.loadingText}>
            Getting things ready
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <Redirect href={hasProfile ? '/home' : '/profile'} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16070D',
  },

  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 36,
    backgroundColor: '#16070D',
  },

  markOuter: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#401226',
    borderWidth: 1,
    borderColor: '#FF789A',
    shadowColor: '#F34C7A',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 7,
  },

  markInner: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#210A14',
    borderWidth: 1,
    borderColor: '#71314B',
  },

  messageBubble: {
    width: 52,
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F34C7A',
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    backgroundColor: '#FFF9FB',
  },

  brand: {
    marginTop: 24,
    color: '#FFF9FB',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
  },

  loadingText: {
    marginTop: 8,
    color: '#C6AAB5',
    fontSize: 13,
  },
});
