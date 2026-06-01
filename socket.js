import { io } from 'socket.io-client';

const socket = io(
  'https://talkrush.onrender.com',
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