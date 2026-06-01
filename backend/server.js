const express = require('express');

const http = require('http');

const { Server } = require('socket.io');

const app = express();

const server =
  http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// QUEUES
let maleQueue = [];

let femaleQueue = [];

let randomQueue = [];

// ACTIVE PAIRS
const pairs = {};

io.on(
  'connection',
  (socket) => {

    console.log(
      'User Connected:',
      socket.id
    );

    // FIND STRANGER
    socket.on(
      'find-stranger',
      (userData) => {

        console.log(
          'Searching:',
          socket.id,
          userData
        );

        // REMOVE OLD QUEUES
        maleQueue =
          maleQueue.filter(
            (u) =>
              u.socketId !==
              socket.id
          );

        femaleQueue =
          femaleQueue.filter(
            (u) =>
              u.socketId !==
              socket.id
          );

        randomQueue =
          randomQueue.filter(
            (u) =>
              u.socketId !==
              socket.id
          );

        // REMOVE OLD PAIRS
        const oldPartner =
          pairs[socket.id];

        if (oldPartner) {

          io.to(
            oldPartner
          ).emit(
            'disconnected'
          );

          delete pairs[
            oldPartner
          ];

          delete pairs[
            socket.id
          ];

        }

        let partner = null;

        // RANDOM MATCH
        if (
          userData.genderFilter ===
          'Random'
        ) {

          if (
            randomQueue.length
          ) {

            partner =
              randomQueue.shift();

          }

          else if (
            maleQueue.length
          ) {

            partner =
              maleQueue.shift();

          }

          else if (
            femaleQueue.length
          ) {

            partner =
              femaleQueue.shift();

          }

        }

        // USER WANTS FEMALE
        else if (
          userData.genderFilter ===
          'Female'
        ) {

          if (
            femaleQueue.length
          ) {

            partner =
              femaleQueue.shift();

          }

          else if (
            randomQueue.length
          ) {

            partner =
              randomQueue.shift();

          }

        }

        // USER WANTS MALE
        else if (
          userData.genderFilter ===
          'Male'
        ) {

          if (
            maleQueue.length
          ) {

            partner =
              maleQueue.shift();

          }

          else if (
            randomQueue.length
          ) {

            partner =
              randomQueue.shift();

          }

        }

        // MATCH FOUND
        if (
          partner &&
          partner.socketId !==
            socket.id
        ) {

          pairs[socket.id] =
            partner.socketId;

          pairs[
            partner.socketId
          ] = socket.id;

          io.to(
            socket.id
          ).emit(
            'matched',
            partner.userData
          );

          io.to(
            partner.socketId
          ).emit(
            'matched',
            userData
          );

          console.log(
            'MATCHED:',
            socket.id,
            partner.socketId
          );

        }

        // NO MATCH
        else {

          // STORE USERS
          if (
            userData.gender ===
            'Male'
          ) {

            maleQueue.push({
              socketId:
                socket.id,
              userData,
            });

          }

          else if (
            userData.gender ===
            'Female'
          ) {

            femaleQueue.push({
              socketId:
                socket.id,
              userData,
            });

          }

          else {

            randomQueue.push({
              socketId:
                socket.id,
              userData,
            });

          }

          socket.emit(
            'searching'
          );

        }

      }
    );

    // MESSAGE
    socket.on(
      'message',
      (message) => {

        const partnerId =
          pairs[socket.id];

        if (partnerId) {

          io.to(
            partnerId
          ).emit(
            'message',
            message
          );

        }

      }
    );

    // TYPING
    socket.on(
      'typing',
      () => {

        const partnerId =
          pairs[socket.id];

        if (partnerId) {

          io.to(
            partnerId
          ).emit(
            'typing'
          );

        }

      }
    );

    // SEEN
    socket.on(
      'seen',
      () => {

        const partnerId =
          pairs[socket.id];

        if (partnerId) {

          io.to(
            partnerId
          ).emit(
            'seen'
          );

        }

      }
    );

    // NEXT USER
    socket.on(
      'disconnect-partner',
      () => {

        const partnerId =
          pairs[socket.id];

        if (partnerId) {

          io.to(
            partnerId
          ).emit(
            'disconnected'
          );

          delete pairs[
            partnerId
          ];

          delete pairs[
            socket.id
          ];

        }

      }
    );

    // DISCONNECT
    socket.on(
      'disconnect',
      () => {

        console.log(
          'Disconnected:',
          socket.id
        );

        maleQueue =
          maleQueue.filter(
            (u) =>
              u.socketId !==
              socket.id
          );

        femaleQueue =
          femaleQueue.filter(
            (u) =>
              u.socketId !==
              socket.id
          );

        randomQueue =
          randomQueue.filter(
            (u) =>
              u.socketId !==
              socket.id
          );

        const partnerId =
          pairs[socket.id];

        if (partnerId) {

          io.to(
            partnerId
          ).emit(
            'disconnected'
          );

          delete pairs[
            partnerId
          ];

          delete pairs[
            socket.id
          ];

        }

      }
    );

  }
);

const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Socket.IO Running On Port ${PORT}`
    );
  }
);