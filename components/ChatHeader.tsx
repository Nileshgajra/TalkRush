import React from 'react';

import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

type Props = {
  name: any;
  age: any;
  gender: any;
  status: string;
};

export default function ChatHeader({
  name,
  age,
  gender,
  status,
}: Props) {

  return (

    <View style={styles.header}>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {name?.charAt(0)}
        </Text>
      </View>

      <Text style={styles.name}>
        {name}, {age}
      </Text>

      <Text style={styles.gender}>
        {gender}
      </Text>

      <View style={styles.statusRow}>

        <View
          style={[
            styles.dot,

            status === 'Online'
              ? styles.online
              : styles.searching,
          ]}
        />

        <Text style={styles.status}>
          {status}
        </Text>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#020617',
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },

  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },

  gender: {
    color: '#94A3B8',
    marginTop: 4,
    fontSize: 15,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  online: {
    backgroundColor: '#22C55E',
  },

  searching: {
    backgroundColor: '#F59E0B',
  },

  status: {
    color: '#CBD5E1',
    fontSize: 14,
  },

});