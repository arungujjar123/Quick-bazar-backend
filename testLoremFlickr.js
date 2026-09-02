const axios = require('axios');

async function testLoremFlickr() {
  const items = ["Atta", "Milk", "Noodles", "Chocolate"];
  for (const item of items) {
    const url = `https://loremflickr.com/500/500/${encodeURIComponent(item)}`;
    console.log(`Querying ${item} -> ${url}`);
    try {
      const res = await axios.get(url, { maxRedirects: 5 });
      console.log(`  -> Final Image URL for "${item}":`, res.request.res.responseUrl || res.config.url);
    } catch (e) {
      console.error("  Failed:", e.message);
    }
  }
}

testLoremFlickr();
