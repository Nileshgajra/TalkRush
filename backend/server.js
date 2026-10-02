const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
const Message = require('./models/Message');
const Report = require('./models/Report');
const firebaseAdmin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');
const http = require('http');
const { Server } = require('socket.io');

// =========================
// APP
// =========================

const app = express();

const server = http.createServer(app);

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
let connectionSequence = 0;

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;
const MEDIA_UPLOAD_TTL_MS = 15 * 60 * 1000;
const MEDIA_DOWNLOAD_TTL_MS = 60 * 60 * 1000;

const ALLOWED_MEDIA_TYPES = {
  image: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
  video: new Set([
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ]),
};

function isUserOnline(userId) {
  const socketId = onlineUsers[userId];
  const userSocket =
    socketId && io.sockets.sockets.get(socketId);

  if (!userSocket) {
    if (socketId) {
      delete onlineUsers[userId];
    }

    return false;
  }

  return userSocket.isAppActive !== false;
}

function emitPresence(userId) {
  if (!userId) {
    return;
  }

  io.emit(
    'presence-updated',
    {
      userId,
      online: isUserOnline(userId),
    }
  );
}

// =========================
// FIREBASE CLOUD MESSAGING
// =========================

function getFirebaseMessaging() {
  const serviceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    return null;
  }

  try {
    if (!firebaseAdmin.apps.length) {
      firebaseAdmin.initializeApp({
        credential:
          firebaseAdmin.credential.cert(
            JSON.parse(serviceAccountJson)
          ),
      });
    }

    return firebaseAdmin.messaging();

  } catch (error) {
    console.error(
      'Firebase Messaging initialization error:',
      error
    );

    return null;
  }
}

function getSupabaseStorage() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucketName =
    process.env.SUPABASE_STORAGE_BUCKET;

  if (!supabaseUrl || !serviceRoleKey || !bucketName) {
    return null;
  }

  return {
    bucket: createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    ).storage.from(bucketName),
  };
}

// =========================
// HELPER FUNCTIONS
// =========================

function removeFromAllQueues(socketId) {
  maleQueue = maleQueue.filter(
    (u) => u.socketId !== socketId
  );

  femaleQueue = femaleQueue.filter(
    (u) => u.socketId !== socketId
  );

  randomQueue = randomQueue.filter(
    (u) => u.socketId !== socketId
  );
}

function isSocketSearching(socketId) {
  const queuedSocket =
    io.sockets.sockets.get(socketId);

  return Boolean(
    queuedSocket &&
    queuedSocket.isSearching &&
    !pairs[socketId]
  );
}

function removeFromPair(socketId) {
  const partnerId = pairs[socketId];

  if (partnerId) {
    delete pairs[partnerId];
    delete pairs[socketId];
  }

  return partnerId;
}

async function isBlockedBetween(userA, userB) {
  if (!userA || !userB) {
    return false;
  }

  const users = await User.find({
    userId: {
      $in: [userA, userB],
    },
  })
    .select('userId blockedUsers')
    .lean();

  const first = users.find(
    (u) => u.userId === userA
  );

  const second = users.find(
    (u) => u.userId === userB
  );

  const firstBlocked =
    first?.blockedUsers?.includes(userB);

  const secondBlocked =
    second?.blockedUsers?.includes(userA);

  return Boolean(
    firstBlocked || secondBlocked
  );
}

async function getUserProfile(userId) {
  if (!userId) {
    return null;
  }

  return User.findOne({
    userId,
  })
    .select('userId name age gender')
    .lean();
}

async function getChatHistory(userA, userB) {
  return Message.find({
    $or: [
      {
        senderId: userA,
        receiverId: userB,
      },
      {
        senderId: userB,
        receiverId: userA,
      },
    ],
  })
    .sort({
      createdAt: 1,
    })
    .lean();
}

function getMediaValidationError(media) {
  if (!media || typeof media !== 'object') {
    return 'Invalid media attachment.';
  }

  const {
    type,
    contentType,
    size,
    duration,
  } = media;

  if (!ALLOWED_MEDIA_TYPES[type]?.has(contentType)) {
    return 'Only JPG, PNG, WEBP, MP4, MOV, and WEBM files are supported.';
  }

  if (!Number.isInteger(size) || size <= 0) {
    return 'Could not verify the media file size.';
  }

  if (
    type === 'image' &&
    size > MAX_IMAGE_SIZE_BYTES
  ) {
    return 'Photos must be 10 MB or smaller.';
  }

  if (
    type === 'video' &&
    size > MAX_VIDEO_SIZE_BYTES
  ) {
    return 'Videos must be 25 MB or smaller.';
  }

  if (
    type === 'video' &&
    (!Number.isFinite(duration) ||
      duration < 0 ||
      duration > MAX_VIDEO_DURATION_SECONDS)
  ) {
    return 'Videos must be 60 seconds or shorter.';
  }

  return '';
}

function getMediaFileExtension(contentType) {
  return {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  }[contentType] || 'bin';
}

async function getMediaDownloadUrl(mediaPath) {
  const storage = getSupabaseStorage();

  if (!storage || !mediaPath) {
    return '';
  }

  try {
    const {
      data,
      error,
    } = await storage.bucket.createSignedUrl(
      mediaPath,
      MEDIA_DOWNLOAD_TTL_MS / 1000
    );

    if (error || !data?.signedUrl) {
      throw error || new Error('No signed media URL returned.');
    }

    return data.signedUrl;

  } catch (error) {
    console.error(
      'Media download URL error:',
      error?.code || 'unknown error'
    );

    return '';
  }
}

async function toMessageData(message) {
  return {
    id: message._id?.toString() || message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    text: message.text || '',
    mediaType: message.mediaType || '',
    mediaPath: message.mediaPath || '',
    mediaContentType: message.mediaContentType || '',
    mediaSize: message.mediaSize || 0,
    mediaDuration: message.mediaDuration || 0,
    mediaUrl: message.mediaPath
      ? await getMediaDownloadUrl(message.mediaPath)
      : '',
    seen: message.seen,
    createdAt: message.createdAt,
  };
}

async function consumePendingMediaUpload(socket, mediaPath) {
  const pending =
    socket.pendingMediaUploads?.get(mediaPath);

  if (!pending || pending.expiresAt < Date.now()) {
    if (pending) {
      socket.pendingMediaUploads.delete(mediaPath);
    }

    return null;
  }

  const storage = getSupabaseStorage();

  if (!storage) {
    return null;
  }

  try {
    const {
      data: metadata,
      error,
    } = await storage.bucket.info(mediaPath);

    if (
      error ||
      !metadata ||
      metadata.contentType !== pending.contentType ||
      Number(metadata.size) !== pending.size
    ) {
      return null;
    }

    socket.pendingMediaUploads.delete(mediaPath);
    return pending;

  } catch (error) {
    console.error(
      'Media upload verification error:',
      error?.code || 'unknown error'
    );

    return null;
  }
}

async function sendFriendMessageNotification(
  receiver,
  sender,
  text
) {
  const firebaseMessaging =
    getFirebaseMessaging();

  if (
    !firebaseMessaging ||
    !receiver?.pushToken ||
    receiver.userId === sender?.userId
  ) {
    return;
  }

  try {
    await firebaseMessaging.send({
      token: receiver.pushToken,

      notification: {
        title:
          `New message from ${sender.name}`,
        body: text,
      },

      data: {
        type: 'friend-message',
        senderId: String(sender.userId),
        senderName: String(sender.name),
        senderAge: String(sender.age),
        senderGender: String(sender.gender),
      },

      android: {
        priority: 'high',

        notification: {
          channelId: 'friend-messages',
          sound: 'default',
        },
      },
    });

  } catch (error) {
    console.error(
      'Friend message notification error:',
      error?.code || 'unknown error'
    );

    if (
      error?.code ===
        'messaging/registration-token-not-registered' ||
      error?.code ===
        'messaging/invalid-registration-token'
    ) {
      await User.updateOne(
        {
          userId: receiver.userId,
        },
        {
          $set: {
            pushToken: '',
          },
        }
      );
    }
  }
}

async function areCurrentFriends(userA, userB) {
  if (
    !userA ||
    !userB ||
    userA === userB
  ) {
    return false;
  }

  const users = await User.find({
    userId: {
      $in: [userA, userB],
    },
  })
    .select('userId friends')
    .lean();

  const first = users.find(
    (user) => user.userId === userA
  );

  const second = users.find(
    (user) => user.userId === userB
  );

  return Boolean(
    first?.friends?.includes(userB) &&
    second?.friends?.includes(userA)
  );
}

// =========================
// FIND ELIGIBLE PARTNER
// =========================

function acceptsGender(
  genderFilter,
  gender
) {
  return (
    genderFilter === 'Random' ||
    genderFilter === gender
  );
}

function areGenderPreferencesCompatible(
  currentUserData,
  candidateUserData
) {
  return (
    acceptsGender(
      currentUserData?.genderFilter,
      candidateUserData?.gender
    ) &&
    acceptsGender(
      candidateUserData?.genderFilter,
      currentUserData?.gender
    )
  );
}

async function findEligiblePartner(
  queue,
  currentUserData,
  currentSocketId
) {
  const queuedUserCount =
    queue.length;

  for (
    let index = 0;
    index < queuedUserCount;
    index += 1
  ) {
    const candidate = queue.shift();

    if (
      !candidate ||
      candidate.socketId === currentSocketId ||
      !isSocketSearching(candidate.socketId)
    ) {
      continue;
    }

    const candidateUserId =
      candidate.userData?.userId;

    if (!candidateUserId) {
      continue;
    }

    const blocked =
      await isBlockedBetween(
        currentUserData?.userId,
        candidateUserId
      );

    if (blocked) {
      console.log(
        'Blocked match skipped:',
        currentUserData?.userId,
        'X',
        candidateUserId
      );

      if (isSocketSearching(candidate.socketId)) {
        queue.push(candidate);
      }

      continue;
    }

    // The database lookup above yields to the event loop. The candidate may
    // have cancelled, disconnected, or matched while it was in progress.
    if (!isSocketSearching(candidate.socketId)) {
      continue;
    }

    if (
      !areGenderPreferencesCompatible(
        currentUserData,
        candidate.userData
      )
    ) {
      if (isSocketSearching(candidate.socketId)) {
        queue.push(candidate);
      }
      continue;
    }

    return candidate;
  }

  return null;
}

// =========================
// SOCKET CONNECTION
// =========================

io.on(
  'connection',
  (socket) => {
    socket.isAppActive = true;
    socket.activeFriendChatWith = '';
    socket.pendingMediaUploads = new Map();
    socket.connectionOrder =
      connectionSequence += 1;

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

          const currentSocketId =
            onlineUsers[userData.userId];

          const currentSocket =
            currentSocketId &&
            currentSocketId !== socket.id
              ? io.sockets.sockets.get(currentSocketId)
              : null;

          // An older connection can finish an in-flight registration after a
          // reconnection has already become the user's active socket.
          if (
            currentSocket &&
            currentSocket.connectionOrder > socket.connectionOrder
          ) {
            return;
          }

          socket.userId =
            userData.userId;

          // If this user already has
          // another socket, remove old one.
          const oldSocketId =
            onlineUsers[
              userData.userId
            ];

          if (
            oldSocketId &&
            oldSocketId !== socket.id
          ) {
            removeFromAllQueues(
              oldSocketId
            );

            const oldPartner =
              removeFromPair(
                oldSocketId
              );

            if (oldPartner) {
              io.to(
                oldPartner
              ).emit(
                'disconnected'
              );
            }
          }

          onlineUsers[
            userData.userId
          ] = socket.id;

          emitPresence(userData.userId);

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

          socket.emit(
            'user-registered',
            {
              userId: userData.userId,
            }
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
    // REGISTER PUSH TOKEN
    // ==================================================

    socket.on(
      'register-push-token',
      async ({
        userId,
        pushToken,
      }) => {
        try {
          if (
            !userId ||
            !pushToken ||
            socket.userId !== userId
          ) {
            socket.emit(
              'push-token-result',
              {
                success: false,
                message: 'Push token registration failed.',
              }
            );

            return;
          }

          await User.updateOne(
            {
              userId,
            },
            {
              $set: {
                pushToken,
              },
            }
          );

          socket.emit(
            'push-token-result',
            {
              success: true,
            }
          );

        } catch (error) {
          console.error(
            'Push Token Registration Error:',
            error
          );

          socket.emit(
            'push-token-result',
            {
              success: false,
              message: 'Push token registration failed.',
            }
          );
        }
      }
    );

    // ==================================================
    // APP ACTIVITY
    // ==================================================

    socket.on(
      'set-app-activity',
      ({
        active,
      }) => {
        if (
          socket.userId &&
          onlineUsers[socket.userId] === socket.id
        ) {
          socket.isAppActive =
            Boolean(active);

          emitPresence(socket.userId);
        }
      }
    );

    // ==================================================
    // ACTIVE FRIEND CHAT
    // ==================================================

    socket.on(
      'set-active-friend-chat',
      ({
        friendId,
      }) => {
        socket.activeFriendChatWith =
          typeof friendId === 'string'
            ? friendId
            : '';
      }
    );

    // ==================================================
    // GET ONLINE STATUS
    // ==================================================

    socket.on(
      'get-user-status',
      ({
        userId,
      }) => {
        socket.emit(
          'user-status',
          {
            userId,
            online:
              isUserOnline(userId),
          }
        );
      }
    );

    // ==================================================
    // FIND STRANGER
    // ==================================================

    socket.on(
      'find-stranger',
      async (userData) => {
        try {
          console.log(
            'Searching:',
            socket.id,
            userData
          );

          // React effects can emit this event more than once. One socket may
          // have only one in-flight search.
          if (socket.isSearching) {
            return;
          }

          if (
            !userData ||
            !userData.userId
          ) {
            socket.emit(
              'searching'
            );

            return;
          }

          socket.isSearching = true;

          // Remove this user from
          // every queue first.
          removeFromAllQueues(
            socket.id
          );

          // IMPORTANT:
          // We no longer automatically
          // search again for the old partner.
          removeFromPair(
            socket.id
          );

          let partner = null;

          // =========================
          // RANDOM MATCH
          // =========================

          if (
            userData.genderFilter ===
            'Random'
          ) {
            partner =
              await findEligiblePartner(
                randomQueue,
                userData,
                socket.id
              );

            if (!partner) {
              partner =
                await findEligiblePartner(
                  maleQueue,
                  userData,
                  socket.id
                );
            }

            if (!partner) {
              partner =
                await findEligiblePartner(
                  femaleQueue,
                  userData,
                  socket.id
                );
            }
          }

          // =========================
          // FEMALE MATCH
          // =========================

          else if (
            userData.genderFilter ===
            'Female'
          ) {
            partner =
              await findEligiblePartner(
                femaleQueue,
                userData,
                socket.id
              );
          }

          // =========================
          // MALE MATCH
          // =========================

          else if (
            userData.genderFilter ===
            'Male'
          ) {
            partner =
              await findEligiblePartner(
                maleQueue,
                userData,
                socket.id
              );
          }

          // =========================
          // MATCH FOUND
          // =========================

          if (
            partner &&
            partner.socketId !==
              socket.id
          ) {
            // Do not pair a socket that left the queue while the blocked-user
            // lookup was pending.
            if (!isSocketSearching(partner.socketId)) {
              socket.isSearching = false;
              socket.emit('searching');
              return;
            }

            socket.isSearching = false;

            const partnerSocket =
              io.sockets.sockets.get(
                partner.socketId
              );

            partnerSocket.isSearching = false;

            pairs[
              socket.id
            ] =
              partner.socketId;

            pairs[
              partner.socketId
            ] =
              socket.id;

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

            return;
          }

          // =========================
          // NO MATCH
          // =========================

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

        } catch (error) {
          socket.isSearching = false;

          console.error(
            'Find Stranger Error:',
            error
          );

          socket.emit(
            'searching'
          );
        }
      }
    );

    // ==================================================
    // STRANGER MESSAGE
    // ==================================================

    socket.on(
      'request-media-upload',
      async ({
        chatType,
        receiverId,
        media,
      }, callback) => {
        const respond =
          typeof callback === 'function'
            ? callback
            : () => {};

        try {
          if (!socket.userId || !receiverId) {
            respond({
              success: false,
              message: 'This chat is no longer available.',
            });
            return;
          }

          const validationError =
            getMediaValidationError(media);

          if (validationError) {
            respond({
              success: false,
              message: validationError,
            });
            return;
          }

          if (chatType === 'friend') {
            const friends =
              await areCurrentFriends(
                socket.userId,
                receiverId
              );

            const blocked =
              await isBlockedBetween(
                socket.userId,
                receiverId
              );

            if (!friends || blocked) {
              respond({
                success: false,
                message:
                  'You can only share media with current friends.',
              });
              return;
            }
          } else if (chatType === 'random') {
            const partnerSocket =
              io.sockets.sockets.get(
                pairs[socket.id]
              );

            if (
              !partnerSocket ||
              partnerSocket.userId !== receiverId
            ) {
              respond({
                success: false,
                message: 'Your chat partner is no longer available.',
              });
              return;
            }
          } else {
            respond({
              success: false,
              message: 'Invalid chat type.',
            });
            return;
          }

          const storage = getSupabaseStorage();

          if (!storage) {
            respond({
              success: false,
              message:
                'Media storage is not configured on the server.',
            });
            return;
          }

          const mediaPath = [
            'chat-media',
            encodeURIComponent(socket.userId),
            `${Date.now()}-${randomUUID()}.${
              getMediaFileExtension(media.contentType)
            }`,
          ].join('/');

          const {
            data: upload,
            error: uploadError,
          } = await storage.bucket.createSignedUploadUrl(
            mediaPath
          );

          if (uploadError || !upload?.signedUrl) {
            throw (
              uploadError ||
              new Error('No signed media upload URL returned.')
            );
          }

          socket.pendingMediaUploads.set(
            mediaPath,
            {
              chatType,
              receiverId,
              type: media.type,
              contentType: media.contentType,
              size: media.size,
              duration: media.duration || 0,
              expiresAt:
                Date.now() + MEDIA_UPLOAD_TTL_MS,
            }
          );

          respond({
            success: true,
            mediaPath,
            uploadUrl: upload.signedUrl,
          });

        } catch (error) {
          console.error(
            'Media upload request error:',
            error
          );

          respond({
            success: false,
            message: 'Could not prepare the media upload.',
          });
        }
      }
    );

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

    socket.on(
      'media-message',
      async ({
        receiverId,
        mediaPath,
      }) => {
        try {
          const partnerId = pairs[socket.id];
          const partnerSocket =
            io.sockets.sockets.get(partnerId);

          if (
            !partnerSocket ||
            partnerSocket.userId !== receiverId
          ) {
            socket.emit(
              'media-message-error',
              {
                message: 'Your chat partner is no longer available.',
              }
            );
            return;
          }

          const media =
            await consumePendingMediaUpload(
              socket,
              mediaPath
            );

          if (
            !media ||
            media.chatType !== 'random' ||
            media.receiverId !== receiverId
          ) {
            socket.emit(
              'media-message-error',
              {
                message: 'The media upload could not be verified.',
              }
            );
            return;
          }

          const messageData = {
            id: `${Date.now()}-${randomUUID()}`,
            senderId: socket.userId,
            receiverId,
            text: '',
            mediaType: media.type,
            mediaPath,
            mediaContentType: media.contentType,
            mediaSize: media.size,
            mediaDuration: media.duration,
            mediaUrl: await getMediaDownloadUrl(mediaPath),
            createdAt: new Date(),
          };

          io.to(partnerId).emit(
            'media-message',
            messageData
          );
          socket.emit(
            'media-message-sent',
            messageData
          );

        } catch (error) {
          console.error(
            'Random media message error:',
            error
          );
          socket.emit(
            'media-message-error',
            {
              message: 'Could not send media.',
            }
          );
        }
      }
    );

    // ==================================================
    // FRIEND MESSAGE
    // ==================================================

    socket.on(
      'friend-message',
      async ({
        senderId,
        receiverId,
        text,
      }) => {
        try {
          if (
            !senderId ||
            !receiverId ||
            !text ||
            !text.trim()
          ) {
            socket.emit(
              'friend-message-error',
              {
                message: 'Invalid friend message.',
              }
            );

            return;
          }

          // Security check
          if (
            socket.userId !==
            senderId
          ) {
            socket.emit(
              'friend-message-error',
              {
                message: 'User verification failed.',
              }
            );

            return;
          }

          // Check both users
          const sender =
            await User.findOne({
              userId:
                senderId,
            });

          const receiver =
            await User.findOne({
              userId:
                receiverId,
            });

          if (
            !sender ||
            !receiver
          ) {
            socket.emit(
              'friend-message-error',
              {
                message: 'Friend profile not found.',
              }
            );

            return;
          }

          // Blocked users cannot
          // exchange friend messages.
          const blocked =
            await isBlockedBetween(
              senderId,
              receiverId
            );

          if (blocked) {
            socket.emit(
              'friend-message-error',
              {
                message:
                  'You cannot message this user.',
              }
            );

            return;
          }

          const friends =
            await areCurrentFriends(
              senderId,
              receiverId
            );

          if (!friends) {
            socket.emit(
              'friend-message-error',
              {
                message:
                  'You can only message current friends.',
              }
            );

            return;
          }

          // Save message permanently.
          const savedMessage =
            await Message.create({
              senderId,
              receiverId,
              text:
                text.trim(),
              seen: false,
            });

          const messageData =
            await toMessageData(savedMessage);

          // Deliver immediately if
          // receiver is online.
          const receiverSocketId =
            onlineUsers[
              receiverId
            ];

          if (
            receiverSocketId
          ) {
            io.to(
              receiverSocketId
            ).emit(
              'friend-message',
              messageData
            );
          }

          const receiverSocket =
            receiverSocketId
              ? io.sockets.sockets.get(
                  receiverSocketId
                )
              : null;

          if (
            !receiverSocket?.isAppActive ||
            receiverSocket.activeFriendChatWith !== senderId
          ) {
            void sendFriendMessageNotification(
              receiver,
              sender,
              savedMessage.text
            );
          }

          // Tell sender that the
          // message was saved.
          socket.emit(
            'friend-message-sent',
            messageData
          );

          console.log(
            'Friend message:',
            senderId,
            '→',
            receiverId
          );

        } catch (error) {
          console.error(
            'Friend Message Error:',
            error
          );

          socket.emit(
            'friend-message-error',
            {
              message: 'Could not send message.',
            }
          );
        }
      }
    );

    socket.on(
      'friend-media-message',
      async ({
        senderId,
        receiverId,
        mediaPath,
      }) => {
        try {
          if (
            !senderId ||
            !receiverId ||
            !mediaPath ||
            socket.userId !== senderId
          ) {
            socket.emit(
              'friend-message-error',
              {
                message: 'Invalid friend media message.',
              }
            );
            return;
          }

          const sender = await User.findOne({
            userId: senderId,
          });
          const receiver = await User.findOne({
            userId: receiverId,
          });
          const friends = await areCurrentFriends(
            senderId,
            receiverId
          );
          const blocked = await isBlockedBetween(
            senderId,
            receiverId
          );

          if (!sender || !receiver || !friends || blocked) {
            socket.emit(
              'friend-message-error',
              {
                message:
                  'You can only share media with current friends.',
              }
            );
            return;
          }

          const media =
            await consumePendingMediaUpload(
              socket,
              mediaPath
            );

          if (
            !media ||
            media.chatType !== 'friend' ||
            media.receiverId !== receiverId
          ) {
            socket.emit(
              'friend-message-error',
              {
                message: 'The media upload could not be verified.',
              }
            );
            return;
          }

          const savedMessage = await Message.create({
            senderId,
            receiverId,
            text: '',
            mediaType: media.type,
            mediaPath,
            mediaContentType: media.contentType,
            mediaSize: media.size,
            mediaDuration: media.duration,
            seen: false,
          });

          const messageData =
            await toMessageData(savedMessage);
          const receiverSocketId =
            onlineUsers[receiverId];

          if (receiverSocketId) {
            io.to(receiverSocketId).emit(
              'friend-message',
              messageData
            );
          }

          const receiverSocket = receiverSocketId
            ? io.sockets.sockets.get(receiverSocketId)
            : null;

          if (
            !receiverSocket?.isAppActive ||
            receiverSocket.activeFriendChatWith !== senderId
          ) {
            void sendFriendMessageNotification(
              receiver,
              sender,
              media.type === 'image'
                ? '📷 Photo'
                : '🎥 Video'
            );
          }

          socket.emit(
            'friend-message-sent',
            messageData
          );

        } catch (error) {
          console.error(
            'Friend media message error:',
            error
          );
          socket.emit(
            'friend-message-error',
            {
              message: 'Could not send media.',
            }
          );
        }
      }
    );

    // ==================================================
    // GET FRIEND CHAT HISTORY
    // ==================================================

    socket.on(
      'get-chat-history',
      async ({
        userId,
        friendId,
      }) => {
        try {
          if (
            !userId ||
            !friendId
          ) {
            return;
          }

          if (
            socket.userId !==
            userId
          ) {
            return;
          }

          const friends =
            await areCurrentFriends(
              userId,
              friendId
            );

          if (!friends) {
            socket.emit(
              'chat-history',
              {
                success: false,

                friendId,

                messages: [],

                message:
                  'You can only view current friends\' chat history.',
              }
            );

            return;
          }

          const history =
            await getChatHistory(
              userId,
              friendId
            );

          const unreadMessageIds =
            history
              .filter(
                (message) =>
                  message.senderId === friendId &&
                  message.receiverId === userId &&
                  !message.seen
              )
              .map(
                (message) => {
                  message.seen = true;
                  return message._id;
                }
              );

          if (unreadMessageIds.length > 0) {
            await Message.updateMany(
              {
                _id: {
                  $in: unreadMessageIds,
                },
              },
              {
                $set: {
                  seen: true,
                },
              }
            );

            const senderSocketId =
              onlineUsers[friendId];

            if (senderSocketId) {
              io.to(senderSocketId).emit(
                'friend-message-seen',
                {
                  messageIds:
                    unreadMessageIds.map(
                      (messageId) =>
                        messageId.toString()
                    ),
                }
              );
            }
          }

          socket.emit(
            'chat-history',
            {
              success: true,

              friendId,

              messages:
                await Promise.all(
                  history.map(toMessageData)
                ),
            }
          );

        } catch (error) {
          console.error(
            'Get Chat History Error:',
            error
          );

          socket.emit(
            'chat-history',
            {
              success: false,

              friendId,

              messages: [],
            }
          );
        }
      }
    );

    // ==================================================
    // FRIEND MESSAGE SEEN
    // ==================================================

    socket.on(
      'friend-message-seen',
      async ({
        messageId,
        userId,
      }) => {
        try {
          if (
            !messageId ||
            !userId
          ) {
            return;
          }

          if (
            socket.userId !==
            userId
          ) {
            return;
          }

          const message =
            await Message.findById(
              messageId
            );

          if (!message) {
            return;
          }

          // Only receiver can mark
          // the message as seen.
          if (
            message.receiverId !==
            userId
          ) {
            return;
          }

          const friends =
            await areCurrentFriends(
              userId,
              message.senderId
            );

          if (!friends) {
            socket.emit(
              'friend-message-seen-error',
              {
                message:
                  'You can only update messages from current friends.',
              }
            );

            return;
          }

          message.seen = true;

          await message.save();

          const senderSocketId =
            onlineUsers[
              message.senderId
            ];

          if (
            senderSocketId
          ) {
            io.to(
              senderSocketId
            ).emit(
              'friend-message-seen',
              {
                messageId:
                  message._id.toString(),
              }
            );
          }

        } catch (error) {
          console.error(
            'Friend Message Seen Error:',
            error
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
    // FRIEND TYPING
    // ==================================================

    socket.on(
      'friend-typing',
      async ({
        senderId,
        receiverId,
      }) => {
        try {
          if (
            socket.userId !==
            senderId
          ) {
            return;
          }

          const friends =
            await areCurrentFriends(
              senderId,
              receiverId
            );

          if (!friends) {
            socket.emit(
              'friend-typing-error',
              {
                message:
                  'You can only type to current friends.',
              }
            );

            return;
          }

          const receiverSocketId =
            onlineUsers[
              receiverId
            ];

          if (
            receiverSocketId
          ) {
            io.to(
              receiverSocketId
            ).emit(
              'friend-typing',
              {
                senderId,
              }
            );
          }

        } catch (error) {
          console.error(
            'Friend Typing Error:',
            error
          );
        }
      }
    );

    // ==================================================
    // SEEN - STRANGER
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
    // NEXT USER / LEAVE CHAT
    // ==================================================

    socket.on(
      'disconnect-partner',
      () => {
        socket.isSearching = false;

        const partnerId =
          pairs[socket.id];

        // Remove both sides of pair.
        if (partnerId) {
          delete pairs[
            partnerId
          ];

          delete pairs[
            socket.id
          ];

          // IMPORTANT:
          // Partner only gets the
          // "Partner left" event.
          // We DO NOT put partner
          // into a search queue.
          io.to(
            partnerId
          ).emit(
            'disconnected'
          );
        }

        // Remove current user
        // from any search queue.
        removeFromAllQueues(
          socket.id
        );
      }
    );

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

          // Block check
          const blocked =
            await isBlockedBetween(
              fromUserId,
              toUserId
            );

          if (blocked) {
            socket.emit(
              'friend-request-result',
              {
                success: false,
                message:
                  'You cannot add this user.',
              }
            );

            return;
          }

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

          const request =
            await FriendRequest.create({
              fromUserId,

              toUserId,

              status:
                'pending',
            });

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

          const friendIds =
            user.friends || [];

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

                online:
                  isUserOnline(friend.userId),
              })
            );

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
                    'QELUNO User',

                  age:
                    sender?.age ||
                    '',

                  gender:
                    sender?.gender ||
                    '',
                };
              }
            );

          socket.emit(
            'friend-data',
            {
              success: true,

              friends,

              requests,
            }
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

          const blocked =
            await isBlockedBetween(
              request.fromUserId,
              request.toUserId
            );

          if (blocked) {
            request.status =
              'rejected';

            await request.save();

            socket.emit(
              'friend-request-result',
              {
                success: false,
                message:
                  'This user is blocked.',
              }
            );

            return;
          }

          request.status =
            'accepted';

          await request.save();

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

          request.status =
            'rejected';

          await request.save();

          socket.emit(
            'friend-request-result',
            {
              success: true,

              message:
                'Friend request rejected.',
            }
          );

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
    // REMOVE FRIEND
    // ==================================================

    socket.on(
      'remove-friend',
      async ({
        userId,
        friendId,
      }) => {
        try {
          if (
            !userId ||
            !friendId
          ) {
            return;
          }

          if (
            socket.userId !==
            userId
          ) {
            return;
          }

          await User.updateOne(
            {
              userId,
            },
            {
              $pull: {
                friends:
                  friendId,
              },
            }
          );

          await User.updateOne(
            {
              userId:
                friendId,
            },
            {
              $pull: {
                friends:
                  userId,
              },
            }
          );

          // Do not allow an older pending request between these users to
          // recreate the friendship after either side removes it.
          await FriendRequest.updateMany(
            {
              status: 'pending',
              $or: [
                {
                  fromUserId: userId,
                  toUserId: friendId,
                },
                {
                  fromUserId: friendId,
                  toUserId: userId,
                },
              ],
            },
            {
              $set: {
                status: 'rejected',
              },
            }
          );

          // IMPORTANT:
          // We DO NOT delete messages.
          // Friend chat history remains.

          socket.emit(
            'friend-removed',
            {
              success: true,

              friendId,
            }
          );

          const friendSocketId =
            onlineUsers[
              friendId
            ];

          if (
            friendSocketId
          ) {
            io.to(
              friendSocketId
            ).emit(
              'friend-removed',
              {
                success: true,

                friendId:
                  userId,
              }
            );
          }

          console.log(
            'Friend removed:',
            userId,
            'X',
            friendId
          );

        } catch (error) {
          console.error(
            'Remove Friend Error:',
            error
          );
        }
      }
    );

    // ==================================================
    // BLOCK USER
    // ==================================================

    socket.on(
      'block-user',
      async ({
        userId,
        blockedUserId,
      }) => {
        try {
          if (
            !userId ||
            !blockedUserId
          ) {
            return;
          }

          if (
            socket.userId !==
            userId
          ) {
            return;
          }

          if (
            userId ===
            blockedUserId
          ) {
            return;
          }

          const user =
            await User.findOne({
              userId,
            });

          const blockedUser =
            await User.findOne({
              userId:
                blockedUserId,
            });

          if (
            !user ||
            !blockedUser
          ) {
            socket.emit(
              'block-result',
              {
                success: false,
                message:
                  'User not found.',
              }
            );

            return;
          }

          // Save permanently.
          await User.updateOne(
            {
              userId,
            },
            {
              $addToSet: {
                blockedUsers:
                  blockedUserId,
              },

              $pull: {
                friends:
                  blockedUserId,
              },
            }
          );

          // Remove friendship
          // from the other side too.
          await User.updateOne(
            {
              userId:
                blockedUserId,
            },
            {
              $pull: {
                friends:
                  userId,
              },
            }
          );

          // Cancel pending requests
          await FriendRequest.updateMany(
            {
              $or: [
                {
                  fromUserId:
                    userId,

                  toUserId:
                    blockedUserId,

                  status:
                    'pending',
                },
                {
                  fromUserId:
                    blockedUserId,

                  toUserId:
                    userId,

                  status:
                    'pending',
                },
              ],
            },
            {
              $set: {
                status:
                  'rejected',
              },
            }
          );

          // If they are currently
          // chatting as strangers,
          // disconnect them.
          const currentSocketId =
            onlineUsers[
              blockedUserId
            ];

          if (
            currentSocketId &&
            pairs[socket.id] ===
              currentSocketId
          ) {
            delete pairs[
              socket.id
            ];

            delete pairs[
              currentSocketId
            ];

            io.to(
              currentSocketId
            ).emit(
              'disconnected'
            );
          }

          // Remove blocked user
          // from matching queues.
          if (
            currentSocketId
          ) {
            removeFromAllQueues(
              currentSocketId
            );
          }

          socket.emit(
            'block-result',
            {
              success: true,

              message:
                'User blocked.',

              blockedUserId,
            }
          );

          console.log(
            'User blocked:',
            userId,
            'X',
            blockedUserId
          );

        } catch (error) {
          console.error(
            'Block User Error:',
            error
          );

          socket.emit(
            'block-result',
            {
              success: false,
              message:
                'Could not block user.',
            }
          );
        }
      }
    );

    // ==================================================
    // UNBLOCK USER
    // ==================================================

    socket.on(
      'unblock-user',
      async ({
        userId,
        blockedUserId,
      }) => {
        try {
          if (
            !userId ||
            !blockedUserId
          ) {
            return;
          }

          if (
            socket.userId !==
            userId
          ) {
            return;
          }

          await User.updateOne(
            {
              userId,
            },
            {
              $pull: {
                blockedUsers:
                  blockedUserId,
              },
            }
          );

          socket.emit(
            'unblock-result',
            {
              success: true,

              message:
                'User unblocked.',

              blockedUserId,
            }
          );

          console.log(
            'User unblocked:',
            userId,
            '→',
            blockedUserId
          );

        } catch (error) {
          console.error(
            'Unblock User Error:',
            error
          );

          socket.emit(
            'unblock-result',
            {
              success: false,
              message:
                'Could not unblock user.',
            }
          );
        }
      }
    );

    // ==================================================
    // GET BLOCKED USERS
    // ==================================================

    socket.on(
      'get-blocked-users',
      async ({
        userId,
      }) => {
        try {
          if (
            !userId ||
            socket.userId !==
              userId
          ) {
            return;
          }

          const user =
            await User.findOne({
              userId,
            })
              .select(
                'blockedUsers'
              )
              .lean();

          const blockedIds =
            user?.blockedUsers ||
            [];

          const blockedUsers =
            await User.find({
              userId: {
                $in:
                  blockedIds,
              },
            })
              .select(
                'userId name age gender'
              )
              .lean();

          socket.emit(
            'blocked-users',
            {
              success: true,

              blockedUsers:
              blockedUsers.map(
                  (blocked) => ({
                    userId:
                      blocked.userId,

                    name:
                      blocked.name,

                    age:
                      blocked.age,

                    gender:
                      blocked.gender,
                  })
                ),
            }
          );

        } catch (error) {
          console.error(
            'Get Blocked Users Error:',
            error
          );

          socket.emit(
            'blocked-users',
            {
              success: false,
blockedUsers: []
            }
          );
        }
      }
    );

    // ==================================================
    // REPORT USER
    // ==================================================

    socket.on(
      'report-user',
      async ({
        reporterId,
        reportedUserId,
        reason,
      }) => {
        try {
          if (
            !reporterId ||
            !reportedUserId ||
            !reason
          ) {
            socket.emit(
              'report-result',
              {
                success: false,
                message:
                  'Please provide all report information.',
              }
            );

            return;
          }

          if (
            socket.userId !==
            reporterId
          ) {
            socket.emit(
              'report-result',
              {
                success: false,
                message:
                  'User verification failed.',
              }
            );

            return;
          }

          if (
            reporterId ===
            reportedUserId
          ) {
            socket.emit(
              'report-result',
              {
                success: false,
                message:
                  'You cannot report yourself.',
              }
            );

            return;
          }

          const reportedUser =
            await User.findOne({
              userId:
                reportedUserId,
            });

          if (!reportedUser) {
            socket.emit(
              'report-result',
              {
                success: false,
                message:
                  'User not found.',
              }
            );

            return;
          }

          const report =
            await Report.create({
              reporterId,

              reportedUserId,

              reason:
                reason.trim(),

              status:
                'pending',
            });

          socket.emit(
            'report-result',
            {
              success: true,

              message:
                'Report submitted successfully.',

              reportId:
                report._id.toString(),
            }
          );

          console.log(
            'User reported:',
            reporterId,
            '→',
            reportedUserId,
            '|',
            reason
          );

        } catch (error) {
          console.error(
            'Report User Error:',
            error
          );

          socket.emit(
            'report-result',
            {
              success: false,
              message:
                'Could not submit report.',
            }
          );
        }
      }
    );

    // ==================================================
    // GET REPORTED USERS
    // ==================================================

    socket.on(
      'get-reported-users',
      async ({
        userId,
      }) => {
        try {
          if (
            !userId ||
            socket.userId !==
              userId
          ) {
            return;
          }

          const reports =
            await Report.find({
              reporterId:
                userId,
            })
              .sort({
                createdAt:
                  -1,
              })
              .lean();

          const reportedIds =
            [
              ...new Set(
                reports.map(
                  (report) =>
                    report.reportedUserId
                )
              ),
            ];

          const reportedUsers =
            await User.find({
              userId: {
                $in:
                  reportedIds,
              },
            })
              .select(
                'userId name age gender'
              )
              .lean();

          const result =
            reports.map(
              (report) => {
                const person =
                  reportedUsers.find(
                    (user) =>
                      user.userId ===
                      report.reportedUserId
                  );

                return {
                  reportId:
                    report._id.toString(),

                  userId:
                    report.reportedUserId,

                  name:
                    person?.name ||
                    'QELUNO User',

                  age:
                    person?.age ||
                    '',

                  gender:
                    person?.gender ||
                    '',

                  reason:
                    report.reason,

                  status:
                    report.status,

                  createdAt:
                    report.createdAt,
                };
              }
            );

          socket.emit(
            'reported-users',
            {
              success: true,

              reports:
                result,
            }
          );

        } catch (error) {
          console.error(
            'Get Reported Users Error:',
            error
          );

          socket.emit(
            'reported-users',
            {
              success: false,
              reports: [],
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
        socket.isSearching = false;

        console.log(
          'Disconnected:',
          socket.id
        );

        let disconnectedUserId =
          socket.userId;

        let presenceChanged = false;

        // Remove online user
        if (
          socket.userId &&
          onlineUsers[
            socket.userId
          ] === socket.id
        ) {
          delete onlineUsers[
            socket.userId
          ];

          presenceChanged = true;
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

              disconnectedUserId = userId;
              presenceChanged = true;

              break;
            }
          }
        }

        if (presenceChanged) {
          emitPresence(disconnectedUserId);
        }

        // Remove queues
        removeFromAllQueues(
          socket.id
        );

        // Tell active partner
        // that this user left.
        const partnerId =
          pairs[socket.id];

        if (partnerId) {
          delete pairs[
            partnerId
          ];

          delete pairs[
            socket.id
          ];

          io.to(
            partnerId
          ).emit(
            'disconnected'
          );
        }

        console.log(
          'User is offline:',
          socket.userId
        );
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
    process.env.MONGODB_URI
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
