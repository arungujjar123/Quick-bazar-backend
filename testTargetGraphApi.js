const axios = require('axios');
const XLSX = require('xlsx');

async function testTargetBase64GraphApi() {
  const shortLink = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAfqoG74EQ55emof9nl74Qbk?e=aacOLV";
  console.log("Short link:", shortLink);

  try {
    // Step 1: Follow HTTP 301 redirect to get the target URL
    const redRes = await axios.get(shortLink, {
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s < 400
    });

    const targetUrl = redRes.headers.location;
    console.log("Redirect target URL:", targetUrl);

    // Step 2: Base64 encode targetUrl
    let b64 = Buffer.from(targetUrl).toString('base64');
    b64 = "u!" + b64.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');

    const apiUrl = `https://api.onedrive.com/v1.0/shares/${b64}/root/content`;
    console.log("Testing MS Graph API:", apiUrl);

    const res = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    console.log("  -> Status:", res.status, "Bytes:", res.data.byteLength);
    const wb = XLSX.read(res.data, { type: 'buffer' });
    console.log("  🎉🎉🎉 BINGO! EXCEL PARSED SUCCESSFULLY! Sheet names:", wb.SheetNames);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log("  📦 PARSED ROWS:", data);
  } catch (err) {
    console.error("❌ Failed:", err.response?.status || err.message);
  }
}

testTargetBase64GraphApi();
