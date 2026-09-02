const axios = require('axios');
const fs = require('fs');

async function testFetchHtml() {
  const url = "https://onedrive.live.com/:x:/g/personal/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850";
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    fs.writeFileSync("onedrive_page.html", res.data);
    console.log("Saved page HTML. Length:", res.data.length);
    
    // Look for download / embed / stream URLs in the HTML
    const matches = res.data.match(/https?:\\?\/\\?\/[^\s"'<>]+/g);
    if (matches) {
      console.log(`Found ${matches.length} URLs in HTML.`);
      const downloadUrls = matches.filter(u => u.toLowerCase().includes('download') || u.toLowerCase().includes('content') || u.toLowerCase().includes('stream') || u.toLowerCase().includes('export') || u.toLowerCase().includes('xlsx'));
      console.log("Filtered download/content URLs:", downloadUrls.slice(0, 10));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testFetchHtml();
