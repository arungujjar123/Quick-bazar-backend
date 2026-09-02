const axios = require('axios');
const XLSX = require('xlsx');

async function testOneDriveDownloadUrl() {
  const url1 = "https://onedrive.live.com/download?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850";
  const url2 = "https://onedrive.live.com/download?resid=38C13EBA4B8DF0EA!105";
  
  // Let's test url1
  try {
    console.log("Trying URL1:", url1);
    const res = await axios.get(url1, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("URL1 Bytes:", res.data.byteLength);
    const wb = XLSX.read(res.data, { type: 'buffer' });
    console.log("Sheet names:", wb.SheetNames);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log("Data parsed:", data);
  } catch (err) {
    console.error("URL1 Failed:", err.message);
  }
}

testOneDriveDownloadUrl();
