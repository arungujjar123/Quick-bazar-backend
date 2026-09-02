const axios = require('axios');
const XLSX = require('xlsx');

async function testCookieRedirects() {
  const shortLink = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAfqoG74EQ55emof9nl74Qbk?e=aacOLV";
  console.log("Testing with Cookie Tracking...");

  let currentUrl = shortLink;
  let cookies = [];

  for (let step = 1; step <= 5; step++) {
    console.log(`\nStep ${step}: ${currentUrl}`);
    try {
      const cookieHeader = cookies.join('; ');
      const res = await axios.get(currentUrl, {
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cookie': cookieHeader
        }
      });

      // Save cookies
      if (res.headers['set-cookie']) {
        const newCookies = res.headers['set-cookie'].map(c => c.split(';')[0]);
        cookies = [...cookies, ...newCookies];
        console.log("  New Cookies set:", newCookies.length);
      }

      if (res.headers.location) {
        currentUrl = res.headers.location;
        if (!currentUrl.startsWith('http')) {
          const origin = new URL(shortLink).origin;
          currentUrl = origin + currentUrl;
        }
      } else {
        console.log("  Final page reached! Status:", res.status, "Length:", res.data.length);
        
        // Try requesting download URL with collected cookies
        const residMatch = currentUrl.match(/resid=([^&]+)/);
        if (residMatch) {
          const downloadUrl = `https://onedrive.live.com/download?resid=${residMatch[1]}`;
          console.log("\nAttempting download with session cookies:", downloadUrl);
          const dRes = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Cookie': cookies.join('; ')
            }
          });
          console.log("Download response size:", dRes.data.byteLength);
          const wb = XLSX.read(dRes.data, { type: 'buffer' });
          console.log("🎉 SUCCESS WITH COOKIES! Sheet Names:", wb.SheetNames);
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          console.log("📦 ROWS:", rows);
        }
        break;
      }
    } catch (e) {
      console.error("Step failed:", e.message);
      break;
    }
  }
}

testCookieRedirects();
