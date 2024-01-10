const tmi = require("tmi.js");
const SteamUser = require("steam-user");
require("dotenv").config();
const request = require("request");
const steamTotp = require("steam-totp");
const catApi = require("random-cat-img");
const express = require("express");
const port = process.env.PORT || 3000;

const axios = require('axios');
const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const accessToken = 'xaoc74emha2artpm28o2ujg8xps9yq';

async function updateChannelTitle() {
  try {
    // Fetch the broadcaster ID using the access token
    const broadcasterId = await getBroadcasterId(accessToken);

    if (broadcasterId) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': clientId,
        'Content-Type': 'application/json',
      };

      // Fetch emotes
      const responseEmote = await axios.get('https://7tv.io/v3/emote-sets/659e7fd78bea51fbcfe11e35');
      if (responseEmote.status === 200) {
        const emotes = responseEmote.data.emotes;
        const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];

        // Update channel title with the random emote name
        const data = {
          title: randomEmote.name,
        };

        const response = await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, data, { headers });

        console.log('Channel title updated successfully:', data.title);
      } else {
        console.error('Error fetching emotes:', responseEmote.statusText);
      }
    } else {
      console.error('Error: Broadcaster ID not found.');
    }
  } catch (error) {
    console.error('Error updating channel title:', error.message);
    throw error;
  }
}

async function getBroadcasterId(accessToken) {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': clientId,
    };

    const response = await axios.get('https://api.twitch.tv/helix/users', { headers });

    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0].id;
    } else {
      console.error('No broadcaster ID found');
      return null;
    }
  } catch (error) {
    console.error('Error fetching broadcaster ID:', error.message);
    throw error;
  }
}


const app = express();
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
twitchClientMain.connect().catch(err => console.error("Twitch Main Connection Error:", err));
twitchClient.connect().catch(err => console.error("Twitch Bot Connection Error:", err));

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
    steamClientMain.setPersona(SteamUser.EPersonaState.Busy);
  } else{
    console.log("not playing anything")
    steamClientMain.setPersona(SteamUser.EPersonaState.Busy);
    steamClientMain.gamesPlayed([570])
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
  const delay = 60000;
  console.log("gonna retry after", delay / 1000, "s");
  setTimeout(() => {
    console.log(`Relogging...`);
    loginDetails.twoFactorCode= steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET)
    steamClientMain.logOn(loginDetails);
  }, delay);
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
  if(isBotRunning===true){
    twitchClientMain.say("bakabot1235", message);
  }
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
  if(isBotRunning==true){
        steamClient.chatMessage(
            "76561198392179703",
            `${userstate["username"]}: ${message}`
        );
		setInterval(updateChannelTitle, 300000);
        updateChannelTitle();
  }
})


  steamClientMain.on("friendMessage", (steamID, message) => {
        if (isBotRunning == false) {
          const result = Math.floor(Math.random() * 3) + 1;
          if (result === 1) {
                (async () => {
              const res = await catApi();
              steamClientMain.chatTyping(steamID);
              steamClientMain.chatMessage(
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
                    steamClientMain.chatTyping(steamID);
                    steamClientMain.chatMessage(
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
                    steamClientMain.chatTyping(steamID);
                    steamClientMain.chatMessage(
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
      }
  );






