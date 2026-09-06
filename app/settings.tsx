import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Manage your TalkRush account
            </Text>
          </View>
        </View>

        {/* SETTINGS CARD */}
        <View style={styles.card}>

          {/* EDIT PROFILE */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>👤</Text>
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Edit Profile</Text>
              <Text style={styles.rowSubtitle}>
                Change your name, age or gender
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* BLOCK USER */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              // Block feature will be connected here
            }}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>🚫</Text>
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Block User</Text>
              <Text style={styles.rowSubtitle}>
                Block someone you don't want to talk to
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          {/* REPORT USER */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              // Report feature will be connected here
            }}
          >
            <View style={styles.iconBox}>
              <Text style={styles.icon}>⚠️</Text>
            </View>

            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Report User</Text>
              <Text style={styles.rowSubtitle}>
                Report inappropriate behaviour
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

        </View>

        {/* APP INFO */}
        <View style={styles.info}>
          <Text style={styles.heart}>♥</Text>
          <Text style={styles.infoText}>
            TalkRush
          </Text>
          <Text style={styles.version}>
            Version 1.0
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12070D',
  },

  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#21101A',
    borderWidth: 1,
    borderColor: '#4A1D30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  backText: {
    color: '#FFF7FB',
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },

  title: {
    color: '#FFF7FB',
    fontSize: 27,
    fontWeight: '800',
  },

  subtitle: {
    color: '#A995A1',
    fontSize: 13,
    marginTop: 3,
  },

  card: {
    backgroundColor: '#1B0C14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38202B',
    overflow: 'hidden',
  },

  row: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#30202A',
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
    fontSize: 20,
  },

  rowContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  rowTitle: {
    color: '#FFF7FB',
    fontSize: 16,
    fontWeight: '800',
  },

  rowSubtitle: {
    color: '#A995A1',
    fontSize: 11.5,
    marginTop: 4,
  },

  arrow: {
    color: '#806B77',
    fontSize: 30,
  },

  info: {
    alignItems: 'center',
    marginTop: 40,
  },

  heart: {
    color: '#FF4F81',
    fontSize: 28,
  },

  infoText: {
    color: '#FFF7FB',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },

  version: {
    color: '#806B77',
    fontSize: 11,
    marginTop: 4,
  },
});