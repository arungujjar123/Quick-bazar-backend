const axios = require('axios');
const XLSX = require('xlsx');

async function testOneDriveAuthkeyFormat() {
  const cid = "38C13EBA4B8DF0EA";
  const resid = "38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850";
  const authkey = "!AfqoG74EQ55emof9nl74Qbk";

  const testUrls = [
    `https://onedrive.live.com/download?cid=${cid}&resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`,
    `https://onedrive.live.com/download?resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`,
    `https://onedrive.live.com/download.aspx?cid=${cid}&resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`,
    `https://onedrive.live.com/download.aspx?resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(authkey)}`,
  ];

  for (const url of testUrls) {
    console.log("Testing URL:", url);
    try {
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      console.log("  Status:", res.status, "Bytes:", res.data.byteLength);
      const wb = XLSX.read(res.data, { type: 'buffer' });
      console.log("  🎉🎉🎉 BINGO! EXCEL PARSE SUCCESS! Sheet Names:", wb.SheetNames);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      console.log("  📦 ROWS:", rows);
      return;
    } catch (e) {
      console.log("  Failed:", e.message);
    }
  }
}

testOneDriveAuthkeyFormat();
