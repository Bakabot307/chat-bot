const request = require("request");
request(
                {
                  url: "https://7tv.io/v3/emote-sets/61e39d5677175547b4256a70",
                  json: true,
                },
                (error, response, body) => {
                  if (!error && response.statusCode === 200) {                   
                    console.log(body.emotes[Math.floor(Math.random()*Object.keys(body.emotes).length)].name)   

                  } else {
                    console.error(`Error getting cat image: ${error}`);
                  }
                }
            );
