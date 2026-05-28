import { io } from 'socket.io-client';

const socket = io(
  'http://192.168.1.19:3000',
  {
    transports: ['websocket'],
    autoConnect: true,
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