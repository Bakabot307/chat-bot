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
  res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=channel:manage:broadcast+channel:manage:moderators+channel:manage:vips`);
});

app.get('/', async (req, res) => {
  try {
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

	   let deleteSql = "DELETE FROM token_twitch";
		await new Promise((resolve, reject) => {
      connection.query(deleteSql, (error, results) => {
        if (error) return reject(error);
        console.log("Number of records deleted: " + results.affectedRows);
        resolve();
      });
    });

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;
	
	
	
    let sql = `INSERT INTO token_twitch (access_token, refresh_token) VALUES (?, ?) ON DUPLICATE KEY UPDATE access_token = VALUES(access_token), refresh_token = VALUES(refresh_token)`;
    let data = [accessToken, refreshToken];

    connection.query(sql, data, (error, results, fields) => {
      if (error) throw error;
      console.log('Rows affected:', results.affectedRows);
    });

    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);

    res.send('Tokens obtained successfully!');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});