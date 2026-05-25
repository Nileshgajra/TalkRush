import { io } from 'socket.io-client';

const socket = io(
  'http://192.168.1.54:3000',
  {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
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