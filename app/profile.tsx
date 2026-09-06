import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
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
  // CREATE USER ID
  // =========================

  const createUserId = () => {
    return (
      Date.now().toString() +
      '-' +
      Math.random()
        .toString(36)
        .substring(2, 12)
    );
  };

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
      // Keep old ID when editing.
      // Create new ID only for a new profile.
      const finalUserId =
        userId || createUserId();

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
      <View style={styles.container}>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.title}>
            Create Profile
          </Text>

          <Text style={styles.subtitle}>
            Tell us a little about yourself
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
            Name
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor="#806D79"
            style={styles.input}
            maxLength={30}
          />
        </View>

        {/* AGE */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Age
          </Text>

          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Enter your age"
            placeholderTextColor="#806D79"
            style={styles.input}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        {/* GENDER */}

        <View style={styles.field}>
          <Text style={styles.label}>
            Gender
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#12070D',
  },

  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    color: '#FFF7FB',
    fontSize: 30,
    fontWeight: '800',
  },

  subtitle: {
    color: '#A995A1',
    fontSize: 13,
    marginTop: 5,
  },

  photoContainer: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 24,
    overflow: 'hidden',
  },

  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#29101B',
    borderWidth: 1,
    borderColor: '#4A1D30',
    justifyContent: 'center',
    alignItems: 'center',
  },

  photoIcon: {
    fontSize: 30,
  },

  photoText: {
    color: '#A995A1',
    fontSize: 10,
    marginTop: 2,
  },

  field: {
    marginBottom: 17,
  },

  label: {
    color: '#FFF7FB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
  },

  input: {
    height: 52,
    backgroundColor: '#1B0C14',
    borderWidth: 1,
    borderColor: '#38202B',
    borderRadius: 15,
    paddingHorizontal: 15,
    color: '#FFF7FB',
    fontSize: 15,
  },

  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },

  genderButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#1B0C14',
    borderWidth: 1,
    borderColor: '#38202B',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  genderButtonActive: {
    backgroundColor: '#3A1425',
    borderColor: '#FF4F81',
  },

  genderText: {
    color: '#A995A1',
    fontSize: 15,
    fontWeight: '700',
  },

  genderTextActive: {
    color: '#FF4F81',
  },

  continueButton: {
    height: 54,
    marginTop: 12,
    borderRadius: 17,
    backgroundColor: '#FF4F81',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4F81',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 5,
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