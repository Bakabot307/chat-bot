const SteamUser = require("steam-user");
const client = new SteamUser();
require("dotenv").config();

const tmi = require("tmi.js");
let stop = false;
let fromTwitch = true;
const clientTwitch = new tmi.Client({
  channels: ["bakabot1235"],
  identity: {
    username: "bakabot1235",
    password: "yhmglcavn5uxszj7tw8150yjzd0wfp",
  },
});

const logOnOptions = {
  accountName: "bakabot1235",
  password: "Thang123.",
};

client.logOn(logOnOptions);

client.on("loggedOn", () => {
  console.log("logged on");
  client.setPersona(SteamUser.EPersonaState.Busy);
});

client.on("friendMessage", function (steamId, message) {
  fromTwitch = false;
  clientTwitch.say("bakabot1235", message);
  fromTwitch = true;
});

clientTwitch.connect();

clientTwitch.on("message", (channel, tags, message, self) => {
  if (message === "!stop" && `${tags["display-name"]}` === "Bakabot1235") {
    stop = true;
  }
  if ((message === "!start" && `${tags["display-name"]}`) === "Bakabot1235") {
    stop = false;
  }

  if (fromTwitch === true && stop === false) {
    console.log("sent");
    client.chatMessage(
      "76561198392179703",
      `${tags["display-name"]}: ${message}`
    );
  }
});
