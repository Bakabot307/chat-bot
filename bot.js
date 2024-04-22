const tmi = require("tmi.js");
const SteamUser = require("steam-user");
require("dotenv").config();
const steamTotp = require("steam-totp");
const express = require("express");
const WebSocket = require('ws');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const redirectUri = process.env.APP_URL || 'http://localhost:3000';
const port = process.env.PORT || 3000;

const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const clientSecret = 'l39js4ios95bjxstrvsans0cb50wi5';
const twitchTokenRefreshUrl = 'https://id.twitch.tv/oauth2/token';

const uri = "mongodb+srv://thangptpk01991:1nQRFJ2MMB4RKiBT@bottokens.vsdhnuw.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1
});
const database = client.db('bot_twitch');
const collection = database.collection('token_twitch');

let tokens;
let broadcasterId;
let accessToken;
let refreshToken;
let username;

(async () => {
	tokens = await getTokens();
})().then(() => {
	broadcasterId = tokens.broadcastId;
	accessToken = tokens.accessToken;
	refreshToken = tokens.refreshToken;
	username = tokens.username;
	openWebSocketEvent();
});

async function refreshAccessToken() {
	try {
		const refreshParams = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
		});

		const response = await axios.post(twitchTokenRefreshUrl, refreshParams);
		const newAccessToken = response.data.access_token;
		const newRefreshToken = response.data.refresh_token;

		await collection.updateOne(
			{ refresh_token: refreshToken },
			{ $set: { access_token: newAccessToken, refresh_token: newRefreshToken } },
			{ upsert: true }
		);
		accessToken = newAccessToken;
		refreshToken = newRefreshToken;

		console.log('Access token updated.');
	} catch (error) {
		console.error('Error in refreshAccessToken:', error.message);
		if (error.response && error.response.status === 400) {
			console.log('refresh token expired');
		}
		throw error;
	}
}


async function getTokens() {
	try {
		const tokenData = await collection.findOne({});

		if (tokenData) {
			return { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token, username: tokenData.username, broadcastId: tokenData.broadcastId };
		} else {
			console.error('No data retrieved from the database.');
			return null;
		}
	} catch (error) {
		console.error('Error in getTokens:', error.message);
		throw error;
	}
}

async function updateChannelTitle() {
	try {
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			'Client-Id': clientId,
			'Content-Type': 'application/json',
		};

		const responseEmote = await axios.get('https://7tv.io/v3/emote-sets/659e7fd78bea51fbcfe11e35');

		if (responseEmote.status === 200) {
			const emotes = responseEmote.data.emotes;
			const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];

			const data = {
				title: randomEmote.name,
			};

			const response = await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, data, { headers });

			if (response.status === 204) {
				console.log('Channel title updated successfully:', data.title);
			} else {
				console.error('Error updating channel title:', response.statusText);
			}
		} else {
			console.error('Error fetching emotes:', responseEmote.statusText);
		}
	} catch (error) {
		console.error('Error updating channel title:', error.message);
		if (error.response && error.response.status === 401) {
			try {
				await refreshAccessToken(); // Use refreshTOken here
				await updateChannelTitle();
			} catch (refreshError) {
				console.error('Error updating channel title:', refreshError.message);
				throw refreshError;
			}
		} else {
			throw error;
		}
	}
}

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

steamClientMain.on("steamGuard", function (domain, callback, lastCodeWrong) {
	if (lastCodeWrong) {
		console.log("Last code wrong, try again!");
		setTimeout(function () {
			callback(steamTotp.getAuthCode(process.env.STEAM_SHARED_SECRET));
		}, 30000);
	}
});

let dotaLaunchedByBot = false;
let isBotRunning = false;
let intervalBot;
let currentGameId = 0;
steamClientMain.on('playingState', async function (blocked, playingApp) {
	try {
		steamClientMain.setPersona(SteamUser.EPersonaState.Snooze);
		if (!dotaLaunchedByBot) {
			const gameName = await getGameInfo(playingApp);
			if (gameName) {
				if (playingApp !== 0 && playingApp !== currentGameId) {
					currentGameId = playingApp
					twitchClient.say("bakabot1235", `/me playing ${gameName}`);
				}
			} else {
				console.log("Game information not available.");
			}
		}
		if (playingApp === 0 && !isBotRunning) {
			console.log('No game is currently being played.');
			if (!dotaLaunchedByBot) {
				currentGameId = 0;
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
	} catch (error) {
		console.error('An error occurred:', error);
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

function resetGame() {
	steamClientMain.relog();
}

function relogSteam() {
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
}

steamClient.logOn({
	accountName: process.env.STEAM_USER_NAME_2,
	password: process.env.STEAM_PASSWORD_2,
});


steamClient.on("loggedOn", () => {
	twitchClient.say(
		"bakabot1235",
		`/me steam connected nuhuh`
	);
});

steamClient.on("friendMessage", function (steamId, message) {
	if (isBotRunning === true) {
		twitchClientMain.say("bakabot1235", message);
	}
});

async function updateModInDB(newModId, newModUsername) {
	const collection = database.collection('bot_mod');

	const filter = {}; // Empty filter to match any document
	const updateDocument = { $set: { id: newModId, username: newModUsername } }; // Define the document to update or insert

	const options = { upsert: true, returnOriginal: true }; // Upsert and return the updated document

	try {
		const result = await collection.findOneAndUpdate(filter, updateDocument, options);
		if (result != null) {
			addModerator(newModId)
			if (result.id != null) {
				removeModerator(result.id);
			}
			return true;
		} else {
			console.log('Failed to add or update document');
			return false;
		}
	} catch (error) {
		console.error('Error adding or updating document:', error);
		return false;
	}
}

async function addModerator(userId) {
	try {
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
				await refreshAccessToken(); // Use refreshTOken here
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
		} else if (error.response && error.response.status === 400) {
			throw error.message;
		} else {
			console.error('Error in addModerator:', error.message);
			throw error.message;
		}
	}
}
async function removeModerator(userId) {
	try {
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
				await refreshAccessToken();
				await removeModerator(userId);
			} catch (refreshError) {
				console.error('Error refreshing token:', refreshError.message);
				throw refreshError.message;
			}
		} else if (error.response && error.response.status === 400) {
			console.log(error.message)
		} else {
			console.error('Error in removeModerator:', error.message);
			throw error.message;
		}
	}
}



async function removeVIP(userId) {
	try {
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
	let random = Math.floor(Math.random() * 100) + 1;
	if (random > 1 && message.length > 2 && !userstate["mod"] && userstate["username"] != channel.slice(1) && userstate["username"] != 'bakabot1135') {
		let updated = await updateModInDB(userstate["user-id"], userstate["username"]);
		if (updated) {
			twitchClient.say(channel, `${userstate["username"]} is now a new nice mod startbeingNice`);
		}
	}

	const command = message.trim().split(" ")[0];
	if (command.trim().toLowerCase().startsWith('!vrank')) {
		try {
			// Make the API request to fetch Valorant data
			const response = await axios.get('https://api.kyroskoh.xyz/valorant/v1/mmr/ap/bakabot/7117?show=combo&display=0');

			// Send the API response directly to Twitch chat
			twitchClient.say(channel, `${response.data} :333`);
		} catch (error) {
			console.error('Error fetching Valorant data:', error.message);
			// Handle errors appropriately, such as informing the user or logging the error
		}
	}
	if (command === "!restartBot" && (userstate.mod || userstate["username"] === channel.slice(1))) {
		console.log('relogging steam with twitch');
		resetGame();
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

twitchClientMain.on("subscription", (channel, username, method, message, userstate) => {
	twitchClient.say(channel, `${username} thankyou`);
});
twitchClientMain.on("resub", (channel, username, months, message, userstate, methods) => {
	twitchClient.say(channel, `${username} thankyou`);
});
twitchClientMain.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
	twitchClient.say(channel, `${username} thankyou`);
});

function openWebSocketEvent() {
	const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30');
	ws.on('open', function open() {
		console.log('WebSocket connection opened.');
	});
	ws.on('message', async (event) => {
		try {
			const data = JSON.parse(event);
			const metadata = data.metadata;
			const payload = data.payload;
			if (metadata.message_type === 'session_welcome') {
				await createEventSubSubscription(payload.session.id);
			}

			if (metadata.message_type === 'notification' && metadata.subscription_type === 'channel.moderate'
				&& payload.event.action === 'timeout' && payload.event.moderator_user_login !== username) {
				const timeoutObj = payload.event.timeout;
				const startTime = Date.parse(metadata.message_timestamp);
				const expiredTime = Date.parse(timeoutObj.expires_at);
				const duration = Math.round((expiredTime - startTime) / 1000);
				const modName = payload.event.moderator_user_name;
				const modId = payload.event.moderator_user_id;

				await unTimeoutUser(timeoutObj.user_id);
				await timeoutUser(modName, modId, timeoutObj.user_name, timeoutObj.user_id, duration);
				// /timeout bakabot1234 6969				
			}
			if (metadata.message_type === 'notification' && metadata.subscription_type === 'channel.moderate'
				&& payload.event.action === 'ban' && payload.event.moderator_user_login !== username) {
				const banObj = payload.event.ban;
				const modName = payload.event.moderator_user_name;
				const modId = payload.event.moderator_user_id;
				await unTimeoutUser(banObj.user_id);
				await timeoutUser(modName, modId, banObj.user_name, banObj.user_id, 69);
				// /timeout bakabot1234 6969				
			}
		} catch (err) {
			console.error('Error in message event handler:', err);
		}
	});

	ws.on('error', (err) => {
		console.error('WebSocket error:', err);
	});

	ws.on('close', (code, reason) => {
		console.log('WebSocket connection closed:', code, reason.toString());
	});
}

const createEventSubSubscription = async (sessionID) => {
	const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
	const headers = {
		'Authorization': 'Bearer ' + accessToken,
		'Client-Id': clientId,
		'Content-Type': 'application/json'
	};

	const body = JSON.stringify({
		"type": "channel.moderate",
		"version": 1,
		"condition": {
			"broadcaster_user_id": broadcasterId,
			"moderator_user_id": broadcasterId
		},
		"transport": {
			"method": 'websocket',
			"session_id": sessionID
		}
	});

	const response = await axios.post(url, body, { headers });
	if (response.status === 202) {
		console.log('EventSub subscription created successfully');
	} else {
		console.log('Failed to create EventSub subscription:', response.response);
	}
}

async function timeoutUser(modName, modId, username, userId, duration) {
	const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`;

	try {
		let durationValue;
		if (duration < 10) {
			durationValue = 10;
		} else if (duration > 69) {
			durationValue = 69;
		} else {
			durationValue = duration;
		}

		await axios.post(url, {
			data: {
				user_id: modId,
				reason: 'Bad Mod',
				duration: durationValue
			}
		}, {
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Client-Id': clientId,
				'Content-Type': 'application/json'
			}
		});
		await clearModInDB();
		twitchClient.say("bakabot1235", `${modName} is timed out for being a bad mod stareCat`);
	} catch (error) {
		if (error.response) {
			console.error('Error response:', error.response.data);
		} else if (error.request) {
			console.error('No response received:', error.request);
		} else {
			console.error('Error', error.message);
		}
	}
}

async function unTimeoutUser(userId) {
	const url = `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&user_id=${userId}&moderator_id=${broadcasterId}`;

	try {
		await axios.delete(url, {
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Client-Id': clientId,
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		if (error.response) {
			console.error('Error response:', error.response.data);
		} else if (error.request) {
			console.error('No response received:', error.request);
		} else {
			console.error('Error', error.message);
		}
	}
}

async function clearModInDB() {
	const collection = database.collection('bot_mod');

	try {
		const result = await collection.deleteMany({});
		console.log(`Successfully deleted ${result.deletedCount} documents.`);
	} catch (error) {
		console.error('Error deleting documents:', error);
	}
}


const scopes = [
	'channel:manage:broadcast',
	'channel:manage:moderators',
	'channel:manage:vips',
	'channel:moderate',
	'moderator:read:banned_users',
	'moderator:read:blocked_terms',
	'moderator:read:chat_settings',
	'moderator:read:unban_requests',
	'moderator:read:chat_messages',
	'moderator:read:moderators',
	'moderator:read:vips',
	'moderator:manage:banned_users'
];

const scopesString = scopes.join('+');

app.get('/auth', (req, res) => {
	res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopesString}`);
});

app.get('/callback', async (req, res) => {
	try {
		await client.connect();
		const db = client.db('bot_twitch'); // Replace with your database name
		const collection = db.collection('token_twitch'); // Replace with your collection name

		const code = req.query.code;
		const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
			params: {
				client_id: clientId,
				client_secret: clientSecret,
				code: code,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri,
			},
		});

		const accessToken = tokenResponse.data.access_token;
		const refreshToken = tokenResponse.data.refresh_token;

		const username = await getUsername(accessToken, clientId);
		const broadcastId = await getBroadcasterId(accessToken);

		// Replace or insert the new token
		await collection.updateOne({}, { $set: { access_token: accessToken, refresh_token: refreshToken, username: username, broadcastId: broadcastId } }, { upsert: true });

		console.log('Access Token:', accessToken);
		console.log('Refresh Token:', refreshToken);

		res.send('Tokens obtained successfully!');
	} catch (error) {
		res.status(500).send('This is callback url, stop using this');
	} finally {
		await client.close();
	}
});


app.get("/", (req, res) => {
	res.send("Bakabobo " + port);
});

app.listen(port, () => {
	console.log(`Server is running at ${redirectUri}:${port}`);
});


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


async function getUsername(accessToken, clientId) {
	const url = `https://api.twitch.tv/helix/users`;
	const headers = {
		'Authorization': `Bearer ${accessToken}`,
		'Client-Id': clientId
	};

	const response = await axios.get(url, { headers });
	const data = response.data;

	if (data.data && data.data.length > 0) {
		return data.data[0].login;
	} else {
		throw new Error(`User not found`);
	}
}








