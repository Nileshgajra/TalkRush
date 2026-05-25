import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Modal Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});