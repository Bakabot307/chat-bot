const tmi = require("tmi.js");
const SteamUser = require("steam-user");
require("dotenv").config();
const request = require("request");
const steamTotp = require("steam-totp");
const catApi = require("random-cat-img");
const express = require("express");
const port = process.env.PORT || 3000;
const util = require('util');
let refreshTOken;
const axios = require('axios');
const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const clientSecret = 'l39js4ios95bjxstrvsans0cb50wi5';
const twitchTokenRefreshUrl = 'https://id.twitch.tv/oauth2/token';
const mysql = require('mysql');

// Create a connection to the database
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12676136',
  password: 'xAq42LntFh',
  database: 'sql12676136'
});

const query = util.promisify(pool.query).bind(pool);
// Function to save the new access token (replace this with your actual logic)
async function refreshAccessToken(refreshToken) {
  try {
    const refreshParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Perform the token refresh request
    const response = await axios.post(twitchTokenRefreshUrl, refreshParams);

    // Extract the new access token from the response
    const newAccessToken = response.data.access_token;
	const newRefreshToken = response.data.refresh_token;
    // Update the 'token_twitch' table with the new access token
    const updateSql = 'UPDATE token_twitch SET access_token = ?, refresh_token = ? where refresh_token = ?';
    const updateData = [newAccessToken,newRefreshToken,refreshToken];

    const updateResults = await query(updateSql, updateData);

    console.log('Access token updated. Rows affected:', updateResults.affectedRows);

	accessToken=newAccessToken;
  } catch (error) {
    console.error('Error in refreshAccessToken:', error.message);
    return null;
  }
}


async function getTokens() {
  try {
    const selectSql = 'SELECT access_token, refresh_token FROM token_twitch';
    const selectResults = await query(selectSql);

    if (selectResults.length > 0) {
      const accessToken = selectResults[0].access_token;
      const refreshToken = selectResults[0].refresh_token;
      return { accessToken, refreshToken };
    } else {
      console.error('No data retrieved from the database.');
      return null;
    }
  } catch (error) {
    console.error('Error in getTokens:', error.message);
    return null;
  }
}

async function updateChannelTitle() {
  try {
    const tokens = await getTokens();    
    if (tokens) {
      const { accessToken, refreshToken } = tokens;
      refreshTOken=refreshToken;
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
    } else {
      console.error('Error: No tokens retrieved.');
    }
} catch (error) {
    if (error.response && error.response.status === 401) {
      try {
        await refreshAccessToken(refreshTOken); // Use refreshTOken here
        await updateChannelTitle();
      } catch (refreshError) {
        console.error('Error updating channel title:', refreshError.message);
        // Handle the error appropriately or throw it if needed
        throw refreshError;
      }
    } else {
      console.error('Error updating channel title:', error.message);
      // Handle the error appropriately or throw it if needed
      throw error;
    }
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
 let intervalBot;
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
	updateChannelTitle();
	intervalBot = setInterval(updateChannelTitle, 300000);
    
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
	clearInterval(intervalBot)
  }
  if (userstate["username"] === channel.slice(1)) {
    return;
  }
  if(isBotRunning==true){
        steamClient.chatMessage(
            "76561198392179703",
            `${userstate["username"]}: ${message}`
        );		
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






