const tmi = require("tmi.js");
const SteamUser = require("steam-user");
require("dotenv").config();
const request = require("request");
const steamTotp = require("steam-totp");
const express = require("express");
const catApi = require("random-cat-img");
const app = express();
const port = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Bakabobo " + port);
});
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// const twitchClient = new tmi.Client({
//   connection: {
//     reconnect: true,
//     secure: true,
//   },
//   identity: {
//     username: process.env.TWITCH_USER_NAME,
//     password: process.env.TWITCH_PASSWORD,
//   },
//   channels: ["bakabot1235"],
// });

// const twitchClientMain = new tmi.Client({
//   connection: {
//     reconnect: true,
//     secure: true,
//   },
//   identity: {
//     username: process.env.TWITCH_USER_NAME_MAIN,
//     password: process.env.TWITCH_PASSWORD_MAIN,
//   },
//   channels: ["bakabot1235"],
// });
// twitchClient.connect().catch(console.log("yo"));
// twitchClientMain.connect();
const steamClient = new SteamUser();

// let isBotRunning = true;

steamClient.logOn({
  accountName: process.env.STEAM_USER_NAME,
  password: process.env.STEAM_PASSWORD,
  twoFactorCode: steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET),
});

// steamClient.on("loggedOn", () => {
//   twitchClient.say(
//     "bakabot1235",
//     `/me steam connected. Bot is online HACKERMANS`
//   );
//   steamClient.setPersona(SteamUser.EPersonaState.Busy);
// });

// steamClient.on("friendMessage", function (steamId, message) {
//   twitchClientMain.say("bakabot1235", message);
// });

// twitchClient.on("chat", (channel, userstate, message, self) => {
//   if (self) return;

//   const command = message.trim().split(" ")[0];

//   if (
//     command === "!start" &&
//     (userstate["mod"] || userstate["username"] === channel.slice(1))
//   ) {
//     isBotRunning = true;
//     twitchClient.say(
//       channel,
//       `/me bot started by ${userstate["username"]} Plotge `
//     );
//   } else if (
//     command === "!stop" &&
//     (userstate["mod"] || userstate["username"] === channel.slice(1))
//   ) {
//     isBotRunning = false;
//     twitchClient.say(
//       channel,
//       `/me bot stopped by ${userstate["username"]} NONONONONO`
//     );
//   } else if (isBotRunning) {
//     steamClient.chatMessage(
//       "76561198392179703",
//       `${userstate["username"]}: ${message}`
//     );
//   } else {
//     return;
//   }
// });

steamClient.on("loggedOn", function () {
  console.log("Logged into Steam");
  steamClient.setPersona(SteamUser.EPersonaState.Online);
  steamClient.gamesPlayed(["Yoooooooooooo"]);
});

steamClient.on("friendMessage", (steamID, message) => {
  const result = Math.floor(Math.random() * 2) + 1;

  if (result === 1) {
    (async () => {
      const res = await catApi();
      steamClient.chatMessage(
        steamID,
        `${res.data.message}`,
        SteamUser.EChatEntryType.ChatMsg
      );
    })();
  } else {
    request(
      {
        url: "https://aws.random.cat/meow",
        json: true,
      },
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          // Send a message to the Steam user with the URL of the random cat image
          steamClient.chatMessage(
            steamID,
            `${body.file}`,
            SteamUser.EChatEntryType.ChatMsg
          );
        } else {
          console.error(`Error getting cat image: ${error}`);
        }
      }
    );
  }
});
