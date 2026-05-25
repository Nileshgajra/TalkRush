import { useRouter } from 'expo-router';

import React, { useState } from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {

  const router = useRouter();

  const [name, setName] = useState('');

  const [age, setAge] = useState('');

  const [gender, setGender] = useState('');

  const continueChat = () => {

    if (!name || !age || !gender) {

      Alert.alert(
        'Error',
        'Please fill all details'
      );

      return;

    }

    if (name.trim().length < 2) {

      Alert.alert(
        'Error',
        'Enter valid name'
      );

      return;

    }

    if (
      Number(age) < 18 ||
      Number(age) > 60
    ) {

      Alert.alert(
        'Error',
        'Age must be between 18 and 60'
      );

      return;

    }

    router.push({

      pathname: '/match',

      params: {
        name,
        age,
        gender,
      },

    });

  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Create Profile
      </Text>

      <TextInput
        placeholder="Enter Name"
        placeholderTextColor="#64748B"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Enter Age"
        placeholderTextColor="#64748B"
        style={styles.input}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />

      <Text style={styles.genderTitle}>
        Select Gender
      </Text>

      <View style={styles.genderContainer}>

        <TouchableOpacity
          style={[
            styles.genderButton,

            gender === 'Male' &&
            styles.activeButton,
          ]}
          onPress={() =>
            setGender('Male')
          }
        >

          <Text style={styles.genderText}>
            Male
          </Text>

        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.genderButton,

            gender === 'Female' &&
            styles.activeButton,
          ]}
          onPress={() =>
            setGender('Female')
          }
        >

          <Text style={styles.genderText}>
            Female
          </Text>

        </TouchableOpacity>

      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={continueChat}
      >

        <Text style={styles.continueText}>
          Continue
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
    padding: 24,
  },

  title: {
    color: '#00E0FF',
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#111C34',
    borderRadius: 18,
    padding: 18,
    color: 'white',
    marginBottom: 20,
    fontSize: 16,
  },

  genderTitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 16,
  },

  genderContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 30,
  },

  genderButton: {
    flex: 1,
    backgroundColor: '#111C34',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
  },

  activeButton: {
    backgroundColor: '#00E0FF',
  },

  genderText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },

  continueButton: {
    backgroundColor: '#00E0FF',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
  },

  continueText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },

});