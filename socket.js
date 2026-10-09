import { io } from 'socket.io-client';
import { getAuth } from '@react-native-firebase/auth';

const socket = io(
  'https://talkrush.onrender.com',
  {
    transports: ['websocket'],
    autoConnect: false,
    auth: async (callback) => {
      try {
        const user = getAuth().currentUser;
        callback(user ? { token: await user.getIdToken() } : {});
      } catch {
        callback({});
      }
    },
  }
);

socket.on('connect', () => {

  console.log(
    'Socket Connected:',
    socket.id
  );

});

socket.on('disconnect', () => {

  console.log(
    'Socket Disconnected'
  );

});

export default socket;
