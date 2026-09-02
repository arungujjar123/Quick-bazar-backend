const axios = require('axios');
const XLSX = require('xlsx');

async function testBase64GraphApi() {
  const shareUrls = [
    "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo",
    "https://onedrive.live.com/:x:/g/personal/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo"
  ];

  for (const url of shareUrls) {
    console.log("\nTesting Graph API Base64 for URL:", url);
    
    // Standard unpadded base64 encoding according to MS Graph spec
    let b64 = Buffer.from(url).toString('base64');
    b64 = "u!" + b64.replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
    
    const apiUrl = `https://api.onedrive.com/v1.0/shares/${b64}/root/content`;
    console.log("Generated API URL:", apiUrl);

    try {
      const res = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      console.log("  -> Status:", res.status, "Bytes:", res.data.byteLength);
      const wb = XLSX.read(res.data, { type: 'buffer' });
      console.log("  🎉 SUCCESS! SheetNames:", wb.SheetNames);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      console.log("  📦 Rows:", rows);
      return;
    } catch (e) {
      console.log("  ❌ Failed:", e.response?.status || e.message);
    }
  }
}

testBase64GraphApi();
