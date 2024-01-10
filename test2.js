const axios = require('axios');
const clientId = 'qarqfcwzn8owibki0nb0hdc0thwfxb';
const accessToken = 'xaoc74emha2artpm28o2ujg8xps9yq';

async function updateChannelTitle() {
  try {
    // Fetch the broadcaster ID using the access token
    const broadcasterId = await getBroadcasterId(accessToken);

    if (broadcasterId) {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': clientId,
        'Content-Type': 'application/json',
      };

      // Fetch emotes
      const responseEmote = await axios.get('https://7tv.io/v3/emote-sets/61e39d5677175547b4256a70');
      if (responseEmote.status === 200) {
        const emotes = responseEmote.data.emotes;
        const randomEmote = emotes[Math.floor(Math.random() * emotes.length)];

        // Update channel title with the random emote name
        const data = {
          title: randomEmote.name,
        };

        const response = await axios.patch(`https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`, data, { headers });

        console.log('Channel title updated successfully:', response.data);
      } else {
        console.error('Error fetching emotes:', responseEmote.statusText);
      }
    } else {
      console.error('Error: Broadcaster ID not found.');
    }
  } catch (error) {
    console.error('Error updating channel title:', error.message);
    throw error;
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
setInterval(updateChannelTitle, 30000);
// Example usage
updateChannelTitle();
