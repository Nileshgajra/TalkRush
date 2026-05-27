import { io } from 'socket.io-client';

const socket = io(
  'http://192.168.1.54:3000',
  {
    transports: ['websocket'],

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,

    autoConnect: true,
  }
);

socket.on('connect', () => {

  console.log(
    'Socket Connected:',
    socket.id
  );

});

socket.on('disconnect', (reason) => {

  console.log(
    'Socket Disconnected:',
    reason
  );

});

socket.io.on('reconnect', () => {

  console.log(
    'Socket Reconnected'
  );

});

socket.io.on('reconnect_attempt', () => {

  console.log(
    'Trying To Reconnect...'
  );

});

socket.io.on('reconnect_error', (error) => {

  console.log(
    'Reconnect Error:',
    error
  );

});

export default socket;