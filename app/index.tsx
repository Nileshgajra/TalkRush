import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>TalkRush</Text>

      <Text style={styles.title}>
        Anonymous Random Chat
      </Text>

      <Text style={styles.subtitle}>
        Meet strangers instantly and chat anonymously.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/profile')}>
        <Text style={styles.buttonText}>Start Chat</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        No Login Required
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  logo: {
    color: '#00E0FF',
    fontSize: 42,
    fontWeight: 'bold',
  },

  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },

  subtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },

  button: {
    marginTop: 40,
    backgroundColor: '#00E0FF',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },

  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },

  footer: {
    color: '#6B7280',
    marginTop: 20,
    fontSize: 14,
  },
});