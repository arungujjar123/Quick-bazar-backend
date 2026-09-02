const axios = require('axios');

async function testRedirectHeaders() {
  let url = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo";
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Step ${i+1} GET:`, url);
      const res = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      console.log("Status:", res.status);
      if (res.headers.location) {
        url = res.headers.location;
        console.log("-> Redirect to:", url);
      } else {
        console.log("Reached final page! Keys in headers:", Object.keys(res.headers));
        break;
      }
    } catch (err) {
      console.error("Error:", err.message);
      break;
    }
  }
}

testRedirectHeaders();
