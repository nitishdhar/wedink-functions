const functions = require('firebase-functions');
const _ = require('lodash');
// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const fetch = require('node-fetch');

const db = admin.firestore();

// Returns a users promise
function getAllWedInkUsers() {
  const users = [];
  return db.collection(`users`).get().then((usersSnapshot) => {
    usersSnapshot.forEach((user) => {
      if (user.data().verified) {
        users.push(user.id);
      }
    });
    return users;
  });
}

function getUserDeviceTokens(userId) {
  const userTokens = [];
  return db.collection(`users/${userId}/devices`).get().then((devicesSnapshot) => {
    devicesSnapshot.forEach((device) => {
      if (device.data().deviceExpoToken !== null && !userTokens.includes(device.data().deviceExpoToken)) {
        userTokens.push(device.data().deviceExpoToken);
      }
    });
    return userTokens;
  })
}

function getAllUsersDeviceTokens(users) {
  const promises = [];
  users.forEach((userId) => {
    promises.push(getUserDeviceTokens(userId));
  });
  return Promise.all(promises).then((tokenArrays) => {
    const allUserTokens = [].concat.apply([], tokenArrays);
    return _.uniq(allUserTokens);
  });
}

function sendUpdateToDeviceToken(token) {
  return fetch('https://exp.host/--/api/v2/push/send', {
    body: JSON.stringify({
      to: token,
      title: "New Update is Available",
      body: "Open the app to receive the update",
      data: { type: 'update' },
      sound: 'default'
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
}

function sendUpdateToAllDeviceTokens(tokens) {
  const promises = [];
  tokens.forEach((token) => {
    promises.push(sendUpdateToDeviceToken(token));
  });
  return Promise.all(promises).then((response) => {
    return response;
  });
}

exports.sendUpdateToAllWedInkUsers = functions.https.onRequest((freq, fres) => {
  return getAllWedInkUsers().then((users) => {
    return getAllUsersDeviceTokens(users).then((tokens) => {
      return sendUpdateToAllDeviceTokens(tokens).then((response) => {
        console.log(response);
        return fres.send('Updates sent successfully');
      });
    });
  });
});