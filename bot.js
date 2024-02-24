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

app.get("/receive-message", async (req, res) => {
    const message = req.query.message;
    
    // Process the modified message
    console.log("Received message:", message);
    
    // Send the modified message to Twitch chat
    try {
        await twitchClientMain.say("bakabot1235", `!setmmr ${message.replace(/\,/g,'')}`);
        res.send("Successfully");
    } catch (error) {
        console.error("Error sending message to Twitch chat:", error);
        res.status(500).send("Error sending message to Twitch chat");
    }
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
	const loginDetails = {
	  accountName: process.env.STEAM_USER_NAME,
	  password: process.env.STEAM_PASSWORD,
	  twoFactorCode: steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET),
	  rememberPassword: true,
	};
	
	steamClientMain.logOn(loginDetails);
	
	let dotaLaunchedByBot = false; // Flag to indicate if Dota 2 was launched by the bot
	let isBotRunning = false; // Flag to track the bot's operational state
	let intervalBot;
	
steamClientMain.on('playingState', async function (blocked, playingApp) {
	console.log(playingApp)
	steamClientMain.setPersona(SteamUser.EPersonaState.Snooze);
  if (!dotaLaunchedByBot) {  // Check if the game was not launched by the bot
        try {
            const gameName = await getGameInfo(playingApp); // Ensure getGameInfo function is defined and works correctly
            if (gameName) {
                twitchClient.say("bakabot1235", `/me playing ${gameName}`);
            } else {
                console.log("Game information not available.");
            }
        } catch (error) {
            console.error('Error fetching game information:', error);
        }
    }
    if (playingApp === 0 && !isBotRunning) { // No game is currently being played
        console.log('No game is currently being played.');
        if (!dotaLaunchedByBot ) {
            // Automatically launch Dota 2 if it wasn't already launched by the bot and the bot is not running
            launchDota2ByBot();
        }
    } else if (playingApp === 570) { // Dota 2 is now active
        console.log('Dota 2 is now active.');
        if (!dotaLaunchedByBot) {
            // Dota 2 was opened manually, start bot functionalities
            if (!isBotRunning) {
                console.log('Starting bot functionalities due to manual Dota 2 launch...');
		steamClientMain.setPersona(SteamUser.EPersonaState.LookingToPlay);
                startBot();
            }
        } else {
            // If Dota 2 was launched by the bot, no additional action needed
            console.log('Dota 2 was launched by the bot.');
        }
    } else { // A different game is now active
        console.log(`A different game (appId=${playingApp}) is now active.`);
        dotaLaunchedByBot = false; // Reset this flag whenever a new game is launched
        if (isBotRunning) {
            console.log('Stopping bot functionalities because a non-Dota 2 game is being played.');
            stopBot();	
	    launchDota2ByBot();   
        }
    }
});

function launchDota2ByBot() {
    // Delay the execution of the code inside setTimeout by 5000 milliseconds (5 seconds)
    setTimeout(() => {
        dotaLaunchedByBot = true; // Indicate the bot is launching Dota 2
        console.log("Dota 2 is being launched by the bot after a 70-second delay.");             
        steamClientMain.gamesPlayed([570]); // Launch Dota 2     
     
    }, 70000); // 70000 milliseconds delay
}

function startBot() {
    if (!isBotRunning) {
        isBotRunning = true; // Indicate the bot functionalities are starting
        console.log("Bot functionalities started.");
        // Initialize bot's activities, e.g., set intervals for tasks
        intervalBot = setInterval(updateChannelTitle, 300000); // Example task
    }
}

function stopBot() {
    if (isBotRunning) {
        isBotRunning = false; // Indicate the bot functionalities are stopping
        console.log("Bot functionalities stopped.");
        clearInterval(intervalBot); // Clear any ongoing intervals or bot activities
    }
}




	async function getGameInfo(appId) {
	if (appId === 0) {
        console.log('Skipping request for appId 0.');
        return;
    	}
         try {
         const response = await axios.get(`https://store.steampowered.com/api/appdetails/?appids=${appId}`);
    
         // Extract relevant information from the response
         const gameName = response.data[appId].data.name;

         return gameName;
         } catch (error) {
         console.error('Error retrieving game information:', error.message);
         return null;
         }
         }
	steamClientMain.on("error", function (e) {
	  if (e.eresult === SteamUser.EResult.LoggedInElsewhere) {
	    console.log("logged somewhere else");
	    relogAfterDelay();
	  }
	});
	
	function relogAfterDelay() {
  const delay = 60000; // Delay before attempting to relog, in milliseconds
  console.log(`Will attempt to relog after ${delay / 1000} seconds.`);

  setTimeout(() => {
    // Check if the client is already logged in and Dota 2 was not launched manually before attempting to relog
    if (!steamClientMain.loggedOn) {
      console.log("Relogging into Steam...");
      dotaLaunchedByBot = false;
      const loginDetails = {
        accountName: process.env.STEAM_USER_NAME,
        password: process.env.STEAM_PASSWORD,
        twoFactorCode: steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET),
        rememberPassword: true,
      };
      steamClientMain.logOn(loginDetails);
    } else {
      console.log("Already logged into Steam or Dota 2 launched manually, no need to relog.");
    }
  }, delay);
}
	
	steamClient.logOn({
	  accountName: process.env.STEAM_USER_NAME_2,
	  password: process.env.STEAM_PASSWORD_2,
	});
	

	steamClient.on("loggedOn", () => {
	  twitchClient.say(
	      "bakabot1235",
	      `/me steam connected HACKERMANS`
	  );	 
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
	
	twitchClientMain.on("message", async (channel, userstate, message, self) => {
    const command = message.trim().split(" ")[0];
    
    if(command === "[nowamod" && userstate["username"] === "bakabot1135") {
        // Your existing logic for adding and removing moderators
        addModerator(message.trim().split(" ")[1]);
        removeModerator(message.trim().split(" ")[2].slice(0, -1));
    }
    
    if (message.trim().toLowerCase().startsWith('!vrank')) {
        try {
            // Make the API request to fetch Valorant data
            const response = await axios.get('https://api.kyroskoh.xyz/valorant/v1/mmr/ap/bakabot/7117?show=combo&display=0');
            
            // Send the API response directly to Twitch chat
            twitchClient.say(channel, `${response.data} :33`);
        } catch (error) {
            console.error('Error fetching Valorant data:', error.message);
            // Handle errors appropriately, such as informing the user or logging the error
        }
    }
    
    // Additional logic for handling other commands or messages
    if (userstate["username"] === channel.slice(1)) {
        return;
    }
    
    if (isBotRunning === true) {
        steamClient.chatMessage(
            "76561198392179703",
            `${userstate["username"]}: ${message}`
        );
    }
});
    
	
	
	
	
	
	
