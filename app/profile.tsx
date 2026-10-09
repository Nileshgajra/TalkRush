import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import socket from '../socket';

const PROFILE_KEY = '@talkrush_profile';

type Profile = {
  userId: string;
  name: string;
  age: string;
  gender: string;
  photo?: string;
};

export default function ProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [photo, setPhoto] = useState('');
  const [userId, setUserId] = useState('');

  const [saving, setSaving] = useState(false);

  // =========================
  // LOAD EXISTING PROFILE
  // =========================

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const saved =
          await AsyncStorage.getItem(
            PROFILE_KEY
          );

        if (saved) {
          const profile: Profile =
            JSON.parse(saved);

          setUserId(
            profile.userId || ''
          );

          setName(
            profile.name || ''
          );

          setAge(
            profile.age || ''
          );

          setGender(
            profile.gender || ''
          );

          setPhoto(
            profile.photo || ''
          );
        }
      } catch (error) {
        console.log(
          'Profile load error:',
          error
        );
      }
    };

    loadProfile();
  }, []);

  // =========================
  // PICK PHOTO
  // =========================

  const pickPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo access to choose a profile photo.'
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          }
        );

      if (
        !result.canceled &&
        result.assets &&
        result.assets.length > 0
      ) {
        setPhoto(
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.log(
        'Photo picker error:',
        error
      );
    }
  };

  // =========================
  // SAVE PROFILE
  // =========================

  const saveProfile = async () => {
    const cleanName =
      name.trim();

    const cleanAge =
      age.trim();

    // NAME
    if (
      cleanName.length < 2
    ) {
      Alert.alert(
        'Invalid Name',
        'Please enter your name.'
      );

      return;
    }

    // AGE
    const ageNumber =
      Number(cleanAge);

    if (
      !cleanAge ||
      !Number.isInteger(ageNumber) ||
      ageNumber < 18 ||
      ageNumber > 60
    ) {
      Alert.alert(
        'Invalid Age',
        'Age must be between 18 and 60.'
      );

      return;
    }

    // GENDER
    if (
      gender !== 'Male' &&
      gender !== 'Female'
    ) {
      Alert.alert(
        'Select Gender',
        'Please select Male or Female.'
      );

      return;
    }

    setSaving(true);

    try {
      const finalUserId = getAuth().currentUser?.uid;
      if (!finalUserId) {
        throw new Error('Firebase anonymous authentication is not ready.');
      }

      const profile: Profile = {
        userId:
          finalUserId,

        name:
          cleanName,

        age:
          cleanAge,

        gender:
          gender,

        photo:
          photo || '',
      };

      // SAVE LOCALLY
      await AsyncStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(profile)
      );

      // Update local state
      setUserId(
        finalUserId
      );

      // REGISTER WITH BACKEND
      if (
        socket.connected
      ) {
        socket.emit(
          'register-user',
          {
            userId:
              finalUserId,

            name:
              cleanName,

            age:
              cleanAge,

            gender:
              gender,
          }
        );
      } else {
        console.log(
          'Socket not connected. Profile saved locally.'
        );
      }

      // GO HOME
      router.replace('/home');

    } catch (error) {
      console.log(
        'Profile save error:',
        error
      );

      Alert.alert(
        'Error',
        'Could not save your profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            QELUNO
          </Text>

          <Text style={styles.title}>
            Create your profile
          </Text>

          <Text style={styles.subtitle}>
            A few details, then let the sparks fly.
          </Text>
        </View>

        {/* PHOTO */}

        <TouchableOpacity
          style={styles.photoContainer}
          onPress={pickPhoto}
          activeOpacity={0.85}
        >
          {photo ? (
            <Image
              source={{
                uri: photo,
              }}
              style={styles.photo}
            />
          ) : (
            <View
              style={styles.photoPlaceholder}
            >
              <Text
                style={styles.photoIcon}
              >
                👤
              </Text>

              <Text
                style={styles.photoText}
              >
                Add Photo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* NAME */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Your name
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#A98696"
            style={styles.input}
            maxLength={30}
          />
        </View>

        {/* AGE */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Your age
          </Text>

          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="18–60"
            placeholderTextColor="#A98696"
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* GENDER */}

        <View style={styles.field}>
          <Text style={styles.label}>
            I am
          </Text>

          <View
            style={styles.genderRow}
          >

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'Male' &&
                  styles.genderButtonActive,
              ]}
              onPress={() =>
                setGender('Male')
              }
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Male' &&
                    styles.genderTextActive,
                ]}
              >
                Male
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderButton,
                gender === 'Female' &&
                  styles.genderButtonActive,
              ]}
              onPress={() =>
                setGender('Female')
              }
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === 'Female' &&
                    styles.genderTextActive,
                ]}
              >
                Female
              </Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* CONTINUE */}

        <TouchableOpacity
          style={[
            styles.continueButton,
            saving &&
              styles.continueButtonDisabled,
          ]}
          onPress={saveProfile}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text
            style={styles.continueText}
          >
            {saving
              ? 'Saving...'
              : 'Continue'}
          </Text>

          {!saving && (
            <Text
              style={styles.arrow}
            >
              →
            </Text>
          )}
        </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#16070D',
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
  },

  container: {
    flex: 1,
    backgroundColor: '#260D18',
    borderWidth: 1,
    borderColor: '#542033',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    shadowColor: '#080204',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },

  header: {
    marginBottom: 22,
    paddingHorizontal: 2,
  },

  eyebrow: {
    color: '#FF6B91',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 9,
  },

  title: {
    color: '#FFF9FB',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  subtitle: {
    color: '#C6AAB5',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },

  photoContainer: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF5C85',
  },

  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#401226',
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoIcon: {
    fontSize: 30,
    color: '#FF91AB',
  },

  photoText: {
    color: '#FFE6ED',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    color: '#FFF4F7',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  input: {
    height: 54,
    backgroundColor: '#18070E',
    borderWidth: 1,
    borderColor: '#613047',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#FFF9FB',
    fontSize: 15,
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },

  genderButton: {
    flex: 1,
    height: 58,
    backgroundColor: '#18070E',
    borderWidth: 1,
    borderColor: '#613047',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  genderButtonActive: {
    backgroundColor: '#50152C',
    borderColor: '#FF668B',
  },

  genderText: {
    color: '#C7A2AF',
    fontSize: 14,
    fontWeight: '700',
  },

  genderTextActive: {
    color: '#FFFFFF',
  },

  continueButton: {
    height: 56,
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#F34C7A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F34C7A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 7,
  },

  continueButtonDisabled: {
    opacity: 0.6,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  arrow: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 9,
  },
});
