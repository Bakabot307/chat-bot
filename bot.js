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
    if (message.length !==5) {
        // Return without further processing and send a response indicating that the message was skipped
        console.log("Message is longer than 5 characters. Skipping processing.");
        res.status(400).send("Message is longer than 5 characters. Skipping processing.");
        return; // Exit the function
    }
    try {
        await twitchClientMain.say("bakabot1235", `!setmmr ${message.replace(/\,/g,'')}`);
        res.send("Successfully");
    } catch (error) {
        console.error("Error sending message to Twitch chat:", error);
        res.status(500).send("Error sending message to Twitch chat");
    }
});
app.get("/receive-gameName", async (req, res) => {
    const message = req.query.message;    
    await twitchClient.say("bakabot1235", `/me playing ${message}`); 
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
	
	steamClientMain.on("steamGuard", function(domain, callback, lastCodeWrong) {
	if(lastCodeWrong) {
		console.log("Last code wrong, try again!");
		setTimeout(function() {
		    callback(SteamTotp.getAuthCode(process.env.STEAM_SHARED_SECRET));
		}, 30000);
	}	
});
	
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
            stopBot();	
            console.log('Stopping bot functionalities because a non-Dota 2 game is being played.');          
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
	steamClientMain.setPersona(SteamUser.EPersonaState.Snooze);     
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
  console.log(`Will attempt to relog after ${delay / 60000} seconds.`);
  setTimeout(() => {
    relogSteam();
  }, delay);
}

function  resetGame(){
	steamClientMain.gamesPlayed([570]); // Launch Dota 2   
	steamClientMain.setPersona(SteamUser.EPersonaState.Snooze);}
function relogSteam(){
	// Check if the client is already logged in and Dota 2 was not launched manually before attempting to relog
    if (!steamClientMain.loggedOn) {
	@@ -498,7 +502,7 @@ function relogSteam(){
    }
		if (command === "!restartBot" && (userstate.mod || userstate["username"] === channel.slice(1))) {
    console.log('relogging steam with twitch');
    resetGame();
}
