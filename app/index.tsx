import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);

        if (!savedProfile) {
          setHasProfile(false);
          return;
        }

        setHasProfile(hasValidProfile(JSON.parse(savedProfile)));
      } catch {
        setHasProfile(false);
      }
    };

    loadProfile();
  }, []);

  if (hasProfile === null) {
    return null;
  }

  return <Redirect href={hasProfile ? '/home' : '/profile'} />;
}
