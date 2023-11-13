const SteamUser = require("steam-user");
require("dotenv").config();
const request = require("request");
const steamTotp = require("steam-totp");
const express = require("express");
const catApi = require("random-cat-img");
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  const challengeNumber = req.query["hub.challenge"];
  res.send(challengeNumber);
});
app.post("/", (req, res) => {
  console.log(req)
})
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
const receivers = [
  '76561198392179703', //IDs for example
  '22222222222222222',
]
const steamClient = new SteamUser();

const loginDetails = {
  accountName: process.env.STEAM_USER_NAME,
  password: process.env.STEAM_PASSWORD,
  twoFactorCode: steamTotp.generateAuthCode(process.env.STEAM_SHARED_SECRET),
  rememberPassword: true,
};

steamClient.logOn(loginDetails);

steamClient.on("loggedOn", function () {
  console.log("Logged into Steam");
});

steamClient.on('playingState', function(blocked, playingApp) {
  if(blocked){
    console.log("playing: ", playingApp)
    steamClient.setPersona(SteamUser.EPersonaState.Busy);
  } else{
    console.log("not playing anything")
    steamClient.setPersona(SteamUser.EPersonaState.Busy);
    steamClient.gamesPlayed([570])
  }
});
steamClient.on("error", function (e) {
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
    steamClient.logOn(loginDetails);
  }, delay);
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

});
