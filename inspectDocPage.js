const axios = require('axios');
const fs = require('fs');

async function inspectDocPage() {
  const shortLink = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAfqoG74EQ55emof9nl74Qbk?e=aacOLV";
  let currentUrl = shortLink;
  let cookies = [];

  for (let step = 1; step <= 5; step++) {
    try {
      const res = await axios.get(currentUrl, {
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cookie': cookies.join('; ')
        }
      });

      if (res.headers['set-cookie']) {
        const newCookies = res.headers['set-cookie'].map(c => c.split(';')[0]);
        cookies = [...cookies, ...newCookies];
      }

      if (res.headers.location) {
        currentUrl = res.headers.location;
        if (!currentUrl.startsWith('http')) {
          const origin = new URL(shortLink).origin;
          currentUrl = origin + currentUrl;
        }
      } else {
        fs.writeFileSync('doc_page.html', res.data);
        console.log("Saved doc_page.html! Length:", res.data.length);
        
        // Search for download or xlsx endpoints inside doc_page.html
        const downloadMatches = res.data.match(/https?:\\?\/\\?\/[^\s"'<>]+/gi) || [];
        console.log(`Found ${downloadMatches.length} total URLs.`);

        const interesting = downloadMatches.filter(u => 
          u.toLowerCase().includes('download') || 
          u.toLowerCase().includes('export') || 
          u.toLowerCase().includes('file') || 
          u.toLowerCase().includes('wac') || 
          u.toLowerCase().includes('excel') ||
          u.toLowerCase().includes('stream')
        );

        console.log("\nFiltered URLs in page:", interesting.slice(0, 15));
        break;
      }
    } catch (e) {
      console.error(e.message);
      break;
    }
  }
}

inspectDocPage();
