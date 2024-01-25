const tmi = require("tmi.js");
const SteamUser = require("steam-user");
require("dotenv").config();
const request = require("request");
const steamTotp = require("steam-totp");
const express = require("express");
const port = process.env.PORT || 3000;
const util = require('util');
let refreshTOken;
const axios = require('axios');
const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const clientSecret = 'l39js4ios95bjxstrvsans0cb50wi5';
const twitchTokenRefreshUrl = 'https://id.twitch.tv/oauth2/token';

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://thangptpk01991:1nQRFJ2MMB4RKiBT@bottokens.vsdhnuw.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
});

const database = client.db('bot_twitch');
const collection = database.collection('token_twitch');


async function refreshAccessToken(refreshToken) {
  try {
    // ... existing code to get new access token ...

    await collection.updateOne(
      { refresh_token: refreshToken },
      { $set: { access_token: newAccessToken, refresh_token: newRefreshToken } },
      { upsert: true }
    );

    console.log('Access token updated.');
  } catch (error) {
    console.error('Error in refreshAccessToken:', error);
    return null;
  }
}


async function getTokens() {
  try {
    const tokenData = await collection.findOne({});
    if (tokenData) {
      return { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token };
    } else {
      console.error('No data retrieved from the database.');
      return null;
    }
  } catch (error) {
    console.error('Error in getTokens:', error);
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

async function addModerator(userId) {
    let refreshTOKEN;
    try {
        const tokens = await getTokens(); 
        const { accessToken, refreshToken } = tokens;    
        refreshTOKEN = refreshToken;
        const broadcasterId = await getBroadcasterId(accessToken);
        const url = 'https://api.twitch.tv/helix/moderation/moderators';
        const headers = {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        const data = {
            broadcaster_id: broadcasterId,
            user_id: userId
        };

        await axios.post(url, data, { headers });
    } catch (error) {
            if (error.response && error.response.status === 401) {
      try {
        await refreshAccessToken(refreshTOKEN); // Use refreshTOken here
        await addModerator(userId);
      } catch (refreshError) {
        console.error('Error updating channel title:', refreshError.message);
        // Handle the error appropriately or throw it if needed
        throw refreshError;
      }
    } else if (error.response && error.response.status === 422) {
            // Check the specific error message if possible to confirm the user is a VIP
            await removeVIP(userId);
            await addModerator(userId);
        } else {
            console.error('Error in addModerator:', error.message);
            throw error;
        }
  }
}
async function removeModerator(userId) {
    let refreshTOKEN;
    try {
        const tokens = await getTokens();
        const { accessToken, refreshToken } = tokens;
        refreshTOKEN = refreshToken;
        const broadcasterId = await getBroadcasterId(accessToken);
        const url = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&user_id=${userId}`;
        const headers = {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        await axios.delete(url, { headers });
    } catch (error) {
        if (error.response && error.response.status === 401) {
            try {
                await refreshAccessToken(refreshTOKEN);
                await removeModerator(userId);
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError.message);
                throw refreshError;
            }
        } else {
            console.error('Error in removeModerator:', error.message);
            throw error;
        }
    }
}
    


async function removeVIP(userId) {
    try {
        const { accessToken, refreshToken } = await getTokens(); 
        const broadcasterId = await getBroadcasterId(accessToken);
        const url = `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`;
        const headers = {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
        await axios.delete(url, { headers });
    } catch (error) {
        throw error;
    }
}

async function verifyTokenScopes() {
	const tokens = await getTokens(); 
        const { accessToken, refreshToken } = tokens;  
    try {
        const response = await axios.get('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `OAuth ${accessToken}`
            }
        });
        console.log('Token details:', response.data);
        // Here, you can check if 'response.data.scopes' includes 'channel:manage:moderators'
    } catch (error) {
        console.error('Error verifying token:', error);
    }
}
let intervalBot;
twitchClientMain.on("message", (channel, userstate, message, self) => {
  const command = message.trim().split(" ")[0];
  if(command==='[nowamod' && userstate["username"] === 'bakabot1135'){
	  addModerator(message.trim().split(" ")[1]);
	  removeModerator(message.trim().split(" ")[2].slice(0, -1))
  }
  if(command==='checktoken' && userstate["username"] === 'bakabot1135'){
	  verifyTokenScopes()
  }
 
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
        `/me bot stopped by ${userstate["username"]}`
    );
    steamClient.chatMessage(
        "76561198392179703",
        `/me bot stopped by ${userstate["username"]}`
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






