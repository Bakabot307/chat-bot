const mysql = require('mysql');
const axios = require('axios');

const twitchTokenRefreshUrl = 'https://id.twitch.tv/oauth2/token';
const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const clientSecret = 'l39js4ios95bjxstrvsans0cb50wi5';

// Create a connection pool to the database
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12676136',
  password: 'xAq42LntFh',
  database: 'sql12676136'
});

// Function to save the new access token (replace this with your actual logic)
function saveNewAccessToken(newAccessToken) {
  // Example: Update the 'token_twitch' table with the new access token
  const updateSql = 'UPDATE token_twitch SET access_token = ?';
  const updateData = [newAccessToken];

  pool.query(updateSql, updateData, (updateError, updateResults) => {
    if (updateError) {
      return console.error("Error updating access token:", updateError.message);
    }

    console.log('Access token updated. Rows affected:', updateResults.affectedRows);
  });
}

// Fetch access token and refresh token from the database
pool.query('SELECT access_token, refresh_token FROM token_twitch', (selectError, selectResults) => {
  if (selectError) {
    return console.error("Error retrieving data:", selectError.message);
  }

  // Assuming you want to save the values to JavaScript variables
  const accessToken = selectResults[0].access_token;
  const refreshToken = selectResults[0].refresh_token;

  console.log('Retrieved Access Token:', accessToken);
  console.log('Retrieved Refresh Token:', refreshToken);

  // Request parameters for token refresh
  const refreshParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  // Perform the token refresh request
  axios.post(twitchTokenRefreshUrl, refreshParams)
    .then((response) => {
      // Extract the new access token from the response
      const newAccessToken = response.data.access_token;

      console.log('New Access Token:', newAccessToken);
      saveNewAccessToken(newAccessToken);
    })
    .catch((error) => {
      console.error("Error refreshing access token:", error);
    });
});
