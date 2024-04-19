const express = require('express');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = 3000;

const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const clientSecret = 'l39js4ios95bjxstrvsans0cb50wi5';
const redirectUri = 'http://localhost:3000'; // Update with your redirect URI

// MongoDB Atlas connection string
const uri = "mongodb+srv://thangptpk01991:1nQRFJ2MMB4RKiBT@bottokens.vsdhnuw.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1
});

app.get('/auth', (req, res) => {
  res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=channel:manage:broadcast+channel:manage:moderators+channel:manage:vips+channel:moderate`);
});

app.get('/', async (req, res) => {
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

    // Replace or insert the new token
    await collection.updateOne({}, { $set: { access_token: accessToken, refresh_token: refreshToken } }, { upsert: true });

    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    res.send('Tokens obtained successfully!');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
