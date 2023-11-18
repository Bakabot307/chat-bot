const tmi = require("tmi.js");
const SteamUser = require("steam-user");
require("dotenv").config();
const request = require("request");
const steamTotp = require("steam-totp");
const catApi = require("random-cat-img");
const app = express();
const express = require("express");
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bakabobo " + port);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
const twitchClient = new tmi.Client({
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username: process.env.TWITCH_USER_NAME,
    password: process.env.TWITCH_PASSWORD,
  },
  channels: ["bakabot1235"],
});

const twitchClientMain = new tmi.Client({
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username: process.env.TWITCH_USER_NAME_MAIN,
    password: process.env.TWITCH_PASSWORD_MAIN,
  },
  channels: ["bakabot1235"],
});
twitchClientMain.connect().catch(console.log("connect to main"));
twitchClient.connect().catch(console.log("connect to bot"));

const steamClient = new SteamUser();
const steamClientMain = new SteamUser();

let isBotRunning = false;

const loginDetails = {
  accountName: process.env.STEAM_USER_NAME,
  password: process.env.STEAM_PASSWORD,
  twoFactorCode: steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET),
  rememberPassword: true,
};

steamClientMain.logOn(loginDetails);

steamClientMain.on('playingState', function(blocked, playingApp) {
  if(blocked){
    console.log("playing: ", playingApp)
    steamClient.setPersona(SteamUser.EPersonaState.Busy);
  } else{
    console.log("not playing anything")
    steamClient.setPersona(SteamUser.EPersonaState.Busy);
    steamClient.gamesPlayed([570])
  }
});
steamClientMain.on("error", function (e) {
  if (e.eresult === SteamUser.EResult.LoggedInElsewhere) {
    console.log("logged somewhere else");
    steamClient.setPersona(SteamUser.EPersonaState.Busy);
    relogAfterDelay();
  }
});

function relogAfterDelay() {
}

steamClient.logOn({
  accountName: process.env.STEAM_USER_NAME_2,
  password: process.env.STEAM_PASSWORD_2,
});

steamClient.on("loggedOn", () => {
  twitchClient.say(
      "bakabot1235",
      `/me steam connected. Bot is online HACKERMANS`
  );
  steamClient.setPersona(SteamUser.EPersonaState.Busy);
});

steamClient.on("friendMessage", function (steamId, message) {
  twitchClientMain.say("bakabot1235", message);
});

twitchClientMain.on("message", (channel, userstate, message, self) => {
  const command = message.trim().split(" ")[0];
  if (
      command === "!start" &&
      (userstate["mod"] || userstate["username"] === channel.slice(1))
  ) {
    isBotRunning = true;
    twitchClient.say(
        channel,
        `/me bot started by ${userstate["username"]} Plotge `
    );
  } else if (
      command === "!stop" &&
      (userstate["mod"] || userstate["username"] === channel.slice(1))
  ) {
    isBotRunning = false;

    twitchClient.say(
        channel,
        `/me bot stopped by ${userstate["username"]} NONONONONO sending cat pics `
    );
    steamClient.chatMessage(
        "76561198392179703",
        `/me bot stopped by ${userstate["username"]} NONONONONO sending cat pics`
    );
  }
  if (userstate["username"] === channel.slice(1)) {
    return;
  }
  if (!isBotRunning) {
    function relogAfterDelay() {
    }
    steamClient.on("friendMessage", (steamID, message) => {
      const result = Math.floor(Math.random() * 3) + 1;

      if (result === 1) {
        (async () => {
          const res = await catApi();
          steamClient.chatTyping(steamID);
          steamClient.chatMessage(
              steamID,
              `${res.data.message}`,
              SteamUser.EChatEntryType.ChatMsg
          );
        })();
      } else if (result === 2) {
        request(
            {
              url: "https://aws.random.cat/meow",
              json: true,
            },
            (error, response, body) => {
              if (!error && response.statusCode === 200) {
                // Send a message to the Steam user with the URL of the random cat image
                steamClient.chatTyping(steamID);
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
      } else {
        request(
            {
              url: "https://api.thecatapi.com/v1/images/search",
              json: true,
            },
            (error, response, body) => {
              if (!error && response.statusCode === 200) {
                // Send a message to the Steam user with the URL of the random cat image
                steamClient.chatTyping(steamID);
                steamClient.chatMessage(
                    steamID,
                    `${body[0].url}`,
                    SteamUser.EChatEntryType.ChatMsg
                );
              } else {
                console.error(`Error getting cat image: ${error}`);
              }
            }
        );
      }
  }
  );
  steamClient.chatMessage(
      "76561198392179703",
      `${userstate["username"]}: ${message}`
  );
});