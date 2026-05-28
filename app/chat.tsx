import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import socket from '../socket';

export default function ChatScreen() {

  const params =
    useLocalSearchParams();

  const flatListRef =
    useRef<any>(null);

  const disconnectTimer =
    useRef<any>(null);

  const isLeavingRef =
    useRef(false);

  const [stranger, setStranger] =
    useState<any>({
      name:
        params.strangerName || '',
      age:
        params.strangerAge || '',
      gender:
        params.strangerGender || '',
    });

  const [message, setMessage] =
    useState('');

  const [messages, setMessages] =
    useState<any[]>([]);

  const [status, setStatus] =
    useState('Online');

  const [typing, setTyping] =
    useState(false);

  const [seen, setSeen] =
    useState(false);

  const [skipCount, setSkipCount] =
    useState<number>(0);

  const [showAdModal, setShowAdModal] =
    useState(false);

  useEffect(() => {

    socket.off('matched');
    socket.off('message');
    socket.off('typing');
    socket.off('seen');
    socket.off('disconnected');

    // MATCHED
    socket.on(
      'matched',
      (userData) => {

        console.log(
          'Matched Successfully'
        );

        clearTimeout(
          disconnectTimer.current
        );

        isLeavingRef.current =
          false;

        setStatus('Online');

        setTyping(false);

        setSeen(false);

        setMessages([]);

        setStranger({
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
        });

      }
    );

    // MESSAGE
    socket.on(
      'message',
      (text) => {

        setTyping(false);

        socket.emit('seen');

        setMessages((prev) => [
          ...prev,
          {
            id:
              Date.now().toString() +
              Math.random(),

            text,

            sender: 'other',
          },
        ]);

        setTimeout(() => {

          flatListRef.current?.scrollToEnd({
            animated: true,
          });

        }, 100);

      }
    );

    // TYPING
    socket.on(
      'typing',
      () => {

        setTyping(true);

        setTimeout(() => {

          setTyping(false);

        }, 1200);

      }
    );

    // SEEN
    socket.on(
      'seen',
      () => {

        setSeen(true);

      }
    );

    // DISCONNECTED
    socket.on(
      'disconnected',
      () => {

        if (
          isLeavingRef.current
        ) {

          console.log(
            'Manual next pressed'
          );

          isLeavingRef.current =
            false;

          return;

        }

        console.log(
          'Partner disconnected'
        );

        setStatus('Searching');

        setTyping(false);

        setSeen(false);

        setMessages([]);

        setStranger({
          name: 'Searching...',
          age: '',
          gender: '',
        });

        disconnectTimer.current =
          setTimeout(() => {

            router.replace({

              pathname:
                '/searching',

              params: {
                name:
                  params.myName,

                age:
                  params.myAge,

                gender:
                  params.myGender,

                genderFilter:
                  params.genderFilter,
              },

            });

          }, 1500);

      }
    );

    return () => {

      socket.off('matched');
      socket.off('message');
      socket.off('typing');
      socket.off('seen');
      socket.off('disconnected');

    };

  }, []);

  // SEND MESSAGE
  const sendMessage = () => {

    if (!message.trim())
      return;

    setSeen(false);

    socket.emit(
      'message',
      message
    );

    setMessages((prev) => [
      ...prev,
      {
        id:
          Date.now().toString(),

        text: message,

        sender: 'me',
      },
    ]);

    setMessage('');

    setTimeout(() => {

      flatListRef.current?.scrollToEnd({
        animated: true,
      });

    }, 100);

  };

  // NEXT USER
  const nextUser = () => {

    if (
      isLeavingRef.current
    )
      return;

    isLeavingRef.current =
      true;

    if (skipCount >= 4) {

      setShowAdModal(true);

      return;

    }

    setSkipCount((prev) =>
      prev + 1
    );

    clearTimeout(
      disconnectTimer.current
    );

    socket.off('matched');
    socket.off('message');
    socket.off('typing');
    socket.off('seen');
    socket.off('disconnected');

    setMessages([]);

    setSeen(false);

    setTyping(false);

    setStatus('Searching');

    setStranger({
      name: 'Searching...',
      age: '',
      gender: '',
    });

    socket.emit(
      'disconnect-partner'
    );

    router.replace({

      pathname: '/searching',

      params: {
        name: params.myName,
        age: params.myAge,
        gender: params.myGender,
        genderFilter:
          params.genderFilter,
      },

    });

  };

  const getStatusColor = () => {

    if (status === 'Online') {

      return '#22C55E';

    }

    if (status === 'Searching') {

      return '#00E0FF';

    }

    return '#EF4444';

  };

  return (

    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      keyboardVerticalOffset={
        Platform.OS === 'ios'
          ? 0
          : 25
      }
    >

      <View style={styles.container}>

        <View style={styles.header}>

          <View style={styles.avatar}>

            <Text
              style={styles.avatarText}
            >
              {stranger.name
                ?.toString()
                .charAt(0)}
            </Text>

          </View>

          <Text style={styles.name}>
            {stranger.name}
            {stranger.age
              ? `, ${stranger.age}`
              : ''}
          </Text>

          <Text style={styles.gender}>
            {stranger.gender}
          </Text>

          <View
            style={
              styles.statusContainer
            }
          >

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    getStatusColor(),
                },
              ]}
            />

            <Text
              style={styles.statusText}
            >
              {status}
            </Text>

          </View>

        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) =>
            item.id
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="always"
          contentContainerStyle={
            styles.chatContainer
          }
          renderItem={({ item }) => (

            <View
              style={[
                styles.messageBubble,

                item.sender === 'me'
                  ? styles.myMessage
                  : styles.otherMessage,
              ]}
            >

              <Text
                style={
                  styles.messageText
                }
              >
                {item.text}
              </Text>

            </View>

          )}
        />

        {typing && (

          <View
            style={
              styles.typingContainer
            }
          >

            <ActivityIndicator
              size="small"
              color="#00E0FF"
            />

            <Text
              style={
                styles.typingText
              }
            >
              Stranger typing...
            </Text>

          </View>

        )}

        {seen && (

          <Text style={styles.seenText}>
            Seen
          </Text>

        )}

        <View
          style={styles.inputContainer}
        >

          <TouchableOpacity
            style={styles.nextButton}
            onPress={nextUser}
          >

            <Text
              style={styles.nextText}
            >
              Next
            </Text>

          </TouchableOpacity>

          <TextInput
            value={message}
            onChangeText={(text) => {

              setMessage(text);

              socket.emit('typing');

            }}
            placeholder="Type message..."
            placeholderTextColor="#64748B"
            style={styles.input}
            multiline
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
          >

            <Text
              style={styles.sendText}
            >
              Send
            </Text>

          </TouchableOpacity>

        </View>

      </View>

      <Modal
        visible={showAdModal}
        transparent
        animationType="fade"
      >

        <View
          style={styles.modalOverlay}
        >

          <View style={styles.modalBox}>

            <Text
              style={styles.modalTitle}
            >
              Free Limit Reached
            </Text>

            <Text
              style={styles.modalText}
            >
              Watch ad to unlock more skips
            </Text>

            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => {

                Alert.alert(
                  'Rewarded Ad',
                  'Ad watched successfully'
                );

                setShowAdModal(false);

                setSkipCount(0);

              }}
            >

              <Text
                style={
                  styles.watchButtonText
                }
              >
                Watch Ad
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </KeyboardAvoidingView>

  );

}

const styles = StyleSheet.create({

  keyboard: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#020617',
  },

  header: {
    paddingTop: 14,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
    backgroundColor: '#030712',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 100,
    backgroundColor: '#16C6E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  avatarText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },

  name: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },

  gender: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 2,
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 20,
    marginRight: 8,
  },

  statusText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },

  chatContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },

  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    marginBottom: 12,
  },

  myMessage: {
    backgroundColor: '#16C6E5',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },

  otherMessage: {
    backgroundColor: '#111827',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },

  messageText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 22,
  },

  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
    marginBottom: 5,
  },

  typingText: {
    color: '#94A3B8',
    marginLeft: 8,
    fontSize: 13,
  },

  seenText: {
    color: '#64748B',
    textAlign: 'right',
    marginRight: 18,
    marginBottom: 4,
    fontSize: 12,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#0F172A',
    backgroundColor: '#020617',
  },

  nextButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    marginRight: 8,
  },

  nextText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },

  input: {
    flex: 1,
    backgroundColor: '#111827',
    color: 'white',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    textAlignVertical: 'top',
  },

  sendButton: {
    backgroundColor: '#16C6E5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
  },

  sendText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBox: {
    width: '85%',
    backgroundColor: '#081225',
    borderRadius: 30,
    padding: 28,
    alignItems: 'center',
  },

  modalTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },

  modalText: {
    color: '#CBD5E1',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },

  watchButton: {
    backgroundColor: '#00E0FF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 20,
  },

  watchButtonText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 16,
  },

});