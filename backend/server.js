const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
const http = require('http');
const { Server } = require('socket.io');


// =========================
// APP
// =========================

const app = express();

const server =
  http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});


// =========================
// QUEUES
// =========================

let maleQueue = [];
let femaleQueue = [];
let randomQueue = [];


// =========================
// ACTIVE PAIRS
// socket.id -> socket.id
// =========================

const pairs = {};


// =========================
// ONLINE USERS
// userId -> socket.id
// =========================

const onlineUsers = {};


// =========================
// SOCKET CONNECTION
// =========================

io.on(
  'connection',
  (socket) => {

    console.log(
      'User Connected:',
      socket.id
    );


    // ==================================================
    // REGISTER USER
    // ==================================================

    socket.on(
      'register-user',
      async (userData) => {

        try {

          if (
            !userData ||
            !userData.userId
          ) {
            return;
          }


          // Save userId on socket
          socket.userId =
            userData.userId;


          // Store online user
          onlineUsers[
            userData.userId
          ] = socket.id;


          // Save/update user
          await User.findOneAndUpdate(
            {
              userId:
                userData.userId,
            },
            {
              $set: {
                userId:
                  userData.userId,

                name:
                  userData.name,

                age:
                  Number(
                    userData.age
                  ),

                gender:
                  userData.gender,
              },
            },
            {
              upsert: true,
              new: true,
            }
          );


          console.log(
            'User Registered:',
            userData.userId
          );

        } catch (error) {

          console.error(
            'User Registration Error:',
            error
          );

        }

      }
    );


    // ==================================================
    // FIND STRANGER
    // ==================================================

    socket.on(
      'find-stranger',
      (userData) => {

        console.log(
          'Searching:',
          socket.id,
          userData
        );


        // =========================
        // REMOVE OLD QUEUE ENTRIES
        // =========================

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


        // =========================
        // REMOVE OLD PAIR
        // =========================

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


        // =========================
        // RANDOM MATCH
        // =========================

        if (
          userData.genderFilter ===
          'Random'
        ) {

          if (
            randomQueue.length
          ) {

            partner =
              randomQueue.shift();

          } else if (
            maleQueue.length
          ) {

            partner =
              maleQueue.shift();

          } else if (
            femaleQueue.length
          ) {

            partner =
              femaleQueue.shift();

          }

        }


        // =========================
        // FEMALE MATCH
        // =========================

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

        }


        // =========================
        // MALE MATCH
        // =========================

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

        }


        // =========================
        // MATCH FOUND
        // =========================

        if (
          partner &&
          partner.socketId !==
            socket.id
        ) {

          pairs[
            socket.id
          ] =
            partner.socketId;


          pairs[
            partner.socketId
          ] =
            socket.id;


          // Send partner data
          io.to(
            socket.id
          ).emit(
            'matched',
            partner.userData
          );


          // Send current user data
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


        // =========================
        // NO MATCH
        // =========================

        else {

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


    // ==================================================
    // MESSAGE
    // ==================================================

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


    // ==================================================
    // TYPING
    // ==================================================

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


    // ==================================================
    // SEEN
    // ==================================================

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


    // ==================================================
    // NEXT USER / DISCONNECT PARTNER
    // ==================================================

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


    // ==================================================
    // FRIEND SYSTEM
    // ==================================================


    // ==================================================
    // SEND FRIEND REQUEST
    // ==================================================

    socket.on(
      'send-friend-request',
      async ({
        fromUserId,
        toUserId,
      }) => {

        try {

          // =========================
          // VALIDATION
          // =========================

          if (
            !fromUserId ||
            !toUserId
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'Invalid user information.',
              }
            );

            return;

          }


          // =========================
          // SECURITY
          // =========================

          if (
            socket.userId &&
            socket.userId !==
              fromUserId
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'User verification failed.',
              }
            );

            return;

          }


          // =========================
          // CANNOT ADD YOURSELF
          // =========================

          if (
            fromUserId ===
            toUserId
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'You cannot add yourself.',
              }
            );

            return;

          }


          // =========================
          // GET USERS
          // =========================

          const sender =
            await User.findOne({
              userId:
                fromUserId,
            });


          const receiver =
            await User.findOne({
              userId:
                toUserId,
            });


          if (
            !sender ||
            !receiver
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'User not found.',
              }
            );

            return;

          }


          // =========================
          // ALREADY FRIENDS
          // =========================

          if (
            sender.friends &&
            sender.friends.includes(
              toUserId
            )
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'You are already friends.',
              }
            );

            return;

          }


          // =========================
          // CHECK SAME REQUEST
          // =========================

          const existingRequest =
            await FriendRequest.findOne({
              fromUserId,
              toUserId,
            });


          if (
            existingRequest &&
            existingRequest.status ===
              'pending'
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'Friend request already sent.',
              }
            );

            return;

          }


          // =========================
          // CHECK REVERSE REQUEST
          // =========================

          const reverseRequest =
            await FriendRequest.findOne({
              fromUserId:
                toUserId,

              toUserId:
                fromUserId,

              status:
                'pending',
            });


          if (reverseRequest) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'This user already sent you a friend request.',
              }
            );

            return;

          }


          // =========================
          // CREATE REQUEST
          // =========================

          const request =
            await FriendRequest.create({
              fromUserId,

              toUserId,

              status:
                'pending',
            });


          // =========================
          // TELL SENDER
          // =========================

          socket.emit(
            'friend-request-result',
            {
              success: true,

              message:
                'Friend request sent.',

              requestId:
                request._id.toString(),
            }
          );


          // =========================
          // NOTIFY RECEIVER
          // =========================

          const receiverSocketId =
            onlineUsers[
              toUserId
            ];


          if (
            receiverSocketId
          ) {

            io.to(
              receiverSocketId
            ).emit(
              'new-friend-request',
              {
                requestId:
                  request._id.toString(),

                fromUserId,

                toUserId,

                name:
                  sender.name,

                age:
                  sender.age,

                gender:
                  sender.gender,
              }
            );

          }


          console.log(
            'Friend request sent:',
            fromUserId,
            '→',
            toUserId
          );

        } catch (error) {

          console.error(
            'Send Friend Request Error:',
            error
          );


          socket.emit(
            'friend-request-result',
            {
              success: false,

              message:
                'Could not send friend request.',
            }
          );

        }

      }
    );


    // ==================================================
    // GET FRIEND DATA
    // Friends + Pending Requests
    // ==================================================

    socket.on(
      'get-friend-data',
      async ({
        userId,
      }) => {

        try {

          if (!userId) {

            socket.emit(
              'friend-data',
              {
                success: false,

                friends: [],

                requests: [],
              }
            );

            return;

          }


          // =========================
          // SECURITY
          // =========================

          if (
            socket.userId &&
            socket.userId !==
              userId
          ) {

            socket.emit(
              'friend-data',
              {
                success: false,

                friends: [],

                requests: [],
              }
            );

            return;

          }


          // =========================
          // CURRENT USER
          // =========================

          const user =
            await User.findOne({
              userId,
            }).lean();


          if (!user) {

            socket.emit(
              'friend-data',
              {
                success: true,

                friends: [],

                requests: [],
              }
            );

            return;

          }


          // =========================
          // FRIEND IDs
          // =========================

          const friendIds =
            user.friends || [];


          // =========================
          // FRIEND PROFILES
          // =========================

          const friendUsers =
            await User.find({
              userId: {
                $in:
                  friendIds,
              },
            })
            .select(
              'userId name age gender'
            )
            .lean();


          // =========================
          // PENDING REQUESTS
          // =========================

          const pendingRequests =
            await FriendRequest.find({
              toUserId:
                userId,

              status:
                'pending',
            })
            .sort({
              createdAt:
                -1,
            })
            .lean();


          // =========================
          // REQUEST SENDERS
          // =========================

          const senderIds =
            pendingRequests.map(
              (request) =>
                request.fromUserId
            );


          const senders =
            await User.find({
              userId: {
                $in:
                  senderIds,
              },
            })
            .select(
              'userId name age gender'
            )
            .lean();


          // =========================
          // FORMAT FRIENDS
          // =========================

          const friends =
            friendUsers.map(
              (friend) => ({

                userId:
                  friend.userId,

                name:
                  friend.name,

                age:
                  friend.age,

                gender:
                  friend.gender,

              })
            );


          // =========================
          // FORMAT REQUESTS
          // =========================

          const requests =
            pendingRequests.map(
              (request) => {

                const sender =
                  senders.find(
                    (item) =>
                      item.userId ===
                      request.fromUserId
                  );


                return {

                  requestId:
                    request._id.toString(),

                  fromUserId:
                    request.fromUserId,

                  toUserId:
                    request.toUserId,

                  name:
                    sender?.name ||
                    'TalkRush User',

                  age:
                    sender?.age ||
                    '',

                  gender:
                    sender?.gender ||
                    '',

                };

              }
            );


          // =========================
          // SEND TO APP
          // =========================

          socket.emit(
            'friend-data',
            {
              success: true,

              friends,

              requests,
            }
          );


          console.log(
            'Friend data sent:',
            userId
          );

        } catch (error) {

          console.error(
            'Get Friend Data Error:',
            error
          );


          socket.emit(
            'friend-data',
            {
              success: false,

              friends: [],

              requests: [],
            }
          );

        }

      }
    );


    // ==================================================
    // ACCEPT FRIEND REQUEST
    // ==================================================

    socket.on(
      'accept-friend-request',
      async ({
        requestId,
      }) => {

        try {

          if (!requestId) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'Request ID missing.',
              }
            );

            return;

          }


          // =========================
          // FIND REQUEST
          // =========================

          const request =
            await FriendRequest.findById(
              requestId
            );


          if (!request) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'Friend request not found.',
              }
            );

            return;

          }


          // =========================
          // SECURITY CHECK
          // =========================

          if (
            request.toUserId !==
            socket.userId
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'You cannot accept this request.',
              }
            );

            return;

          }


          // =========================
          // STATUS CHECK
          // =========================

          if (
            request.status !==
            'pending'
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'This request has already been processed.',
              }
            );

            return;

          }


          // =========================
          // CHECK BOTH USERS
          // =========================

          const sender =
            await User.findOne({
              userId:
                request.fromUserId,
            });


          const receiver =
            await User.findOne({
              userId:
                request.toUserId,
            });


          if (
            !sender ||
            !receiver
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'User profile not found.',
              }
            );

            return;

          }


          // =========================
          // ACCEPT REQUEST
          // =========================

          request.status =
            'accepted';


          await request.save();


          // =========================
          // SAVE FRIENDSHIP
          // =========================

          await User.updateOne(
            {
              userId:
                request.fromUserId,
            },
            {
              $addToSet: {
                friends:
                  request.toUserId,
              },
            }
          );


          await User.updateOne(
            {
              userId:
                request.toUserId,
            },
            {
              $addToSet: {
                friends:
                  request.fromUserId,
              },
            }
          );


          // =========================
          // TELL RECEIVER
          // =========================

          socket.emit(
            'friend-request-result',
            {
              success: true,

              message:
                'Friend request accepted.',

              friend: {
                userId:
                  sender.userId,

                name:
                  sender.name,

                age:
                  sender.age,

                gender:
                  sender.gender,
              },
            }
          );


          // =========================
          // NOTIFY SENDER
          // =========================

          const senderSocketId =
            onlineUsers[
              request.fromUserId
            ];


          if (
            senderSocketId
          ) {

            io.to(
              senderSocketId
            ).emit(
              'friend-request-accepted',
              {
                requestId:
                  request._id.toString(),

                fromUserId:
                  request.fromUserId,

                toUserId:
                  request.toUserId,

                name:
                  receiver.name,

                age:
                  receiver.age,

                gender:
                  receiver.gender,
              }
            );

          }


          console.log(
            'Friendship created:',
            request.fromUserId,
            '↔',
            request.toUserId
          );

        } catch (error) {

          console.error(
            'Accept Friend Request Error:',
            error
          );


          socket.emit(
            'friend-request-result',
            {
              success: false,

              message:
                'Could not accept friend request.',
            }
          );

        }

      }
    );


    // ==================================================
    // REJECT FRIEND REQUEST
    // ==================================================

    socket.on(
      'reject-friend-request',
      async ({
        requestId,
      }) => {

        try {

          if (!requestId) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'Request ID missing.',
              }
            );

            return;

          }


          // =========================
          // FIND REQUEST
          // =========================

          const request =
            await FriendRequest.findById(
              requestId
            );


          if (!request) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'Friend request not found.',
              }
            );

            return;

          }


          // =========================
          // SECURITY CHECK
          // =========================

          if (
            request.toUserId !==
            socket.userId
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'You cannot reject this request.',
              }
            );

            return;

          }


          // =========================
          // STATUS CHECK
          // =========================

          if (
            request.status !==
            'pending'
          ) {

            socket.emit(
              'friend-request-result',
              {
                success: false,

                message:
                  'This request has already been processed.',
              }
            );

            return;

          }


          // =========================
          // REJECT
          // =========================

          request.status =
            'rejected';


          await request.save();


          // =========================
          // TELL RECEIVER
          // =========================

          socket.emit(
            'friend-request-result',
            {
              success: true,

              message:
                'Friend request rejected.',
            }
          );


          // =========================
          // NOTIFY SENDER
          // =========================

          const senderSocketId =
            onlineUsers[
              request.fromUserId
            ];


          if (
            senderSocketId
          ) {

            io.to(
              senderSocketId
            ).emit(
              'friend-request-rejected',
              {
                requestId:
                  request._id.toString(),

                fromUserId:
                  request.fromUserId,

                toUserId:
                  request.toUserId,
              }
            );

          }


          console.log(
            'Friend request rejected:',
            request.fromUserId,
            '→',
            request.toUserId
          );

        } catch (error) {

          console.error(
            'Reject Friend Request Error:',
            error
          );


          socket.emit(
            'friend-request-result',
            {
              success: false,

              message:
                'Could not reject friend request.',
            }
          );

        }

      }
    );


    // ==================================================
    // DISCONNECT
    // ==================================================

    socket.on(
      'disconnect',
      () => {

        console.log(
          'Disconnected:',
          socket.id
        );


        // =========================
        // REMOVE ONLINE USER
        // =========================

        if (
          socket.userId &&
          onlineUsers[
            socket.userId
          ] === socket.id
        ) {

          delete onlineUsers[
            socket.userId
          ];

        } else {

          for (
            const userId in onlineUsers
          ) {

            if (
              onlineUsers[
                userId
              ] === socket.id
            ) {

              delete onlineUsers[
                userId
              ];

              break;

            }

          }

        }


        // =========================
        // REMOVE QUEUES
        // =========================

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


        // =========================
        // REMOVE ACTIVE PAIR
        // =========================

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


// ==================================================
// SERVER
// ==================================================

const PORT =
  process.env.PORT || 3000;


// ==================================================
// MONGODB
// ==================================================

mongoose
  .connect(
    'mongodb://127.0.0.1:27017/talkrush'
  )
  .then(() => {

    console.log(
      'MongoDB Connected'
    );


    server.listen(
      PORT,
      '0.0.0.0',
      () => {

        console.log(
          `Socket.IO Running On Port ${PORT}`
        );

      }
    );

  })
  .catch(
    (error) => {

      console.error(
        'MongoDB Connection Error:',
        error
      );

    }
  );