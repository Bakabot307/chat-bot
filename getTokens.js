const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const clientSecret = 'l39js4ios95bjxstrvsans0cb50wi5';
const redirectUri = 'http://localhost:3000'; // Update with your redirect URI
const mysql = require('mysql');

// Create a connection to the database
const connection = mysql.createConnection({
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12676136',
  password: 'xAq42LntFh',
  database: 'sql12676136'
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});


app.get('/auth', (req, res) => {
  // Redirect the user to the Twitch authorization URL
  res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=channel:manage:broadcast`);
});

app.get('/', async (req, res) => {
  // Handle the callback from Twitch
  const code = req.query.code;

  // Exchange the authorization code for tokens
  const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    },
  });

  // Extract tokens from the response
  const accessToken = tokenResponse.data.access_token;
  const refreshToken = tokenResponse.data.refresh_token;
  
let sql = `INSERT INTO token_twitch (access_token, refresh_token) VALUES (?, ?)`;
let sql2 = "DELETE FROM token_twitch";
let data = [accessToken, refreshToken];
connection.connect(function(err) {	
  if (err) throw err;  
  con.query(sql2, function (err, result) {
    if (err) throw err;
    console.log("Number of records deleted: " + result.affectedRows);
  });
});
connection.query(sql, data, (error, results, fields) => {
  if (error) return console.error(error.message);
  console.log('Rows affected:', results.affectedRows);
});


  // You can now use accessToken and refreshToken as needed
  console.log('Access Token:', accessToken);
  console.log('Refresh Token:', refreshToken);

  res.send('Tokens obtained successfully!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});