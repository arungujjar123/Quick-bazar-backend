const axios = require('axios');
const XLSX = require('xlsx');

async function testEmbed() {
  const targetUrl = "https://onedrive.live.com/:x:/g/personal/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850&ithint=file%2cxlsx&migratedtospo=true&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8zOEMxM0VCQTRCOERGMEVBL0lRQjN4cmV4Uy1KdVRhamVmT2tsTFhoUUFhWjhLemhiX3puemh2aDRnYmV2RFpv";

  const embedUrl = "https://onedrive.live.com/embed?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850&authkey=!AIQB3xrexS-JuTa&em=2";
  const downloadUrl2 = "https://onedrive.live.com/download?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850&authkey=!AIQB3xrexS-JuTa";

  console.log("Testing embed URL:", embedUrl);
  try {
    const res = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("Embed status:", res.status, "HTML length:", res.data.length);
    // Check if HTML contains table data or download link
    const downloadMatch = res.data.match(/https?:\\?\/\\?\/[^\s"'<>]*download[^\s"'<>]*/i);
    if (downloadMatch) console.log("Found download match in embed HTML:", downloadMatch[0]);
  } catch (e) {
    console.log("Embed error:", e.message);
  }

  console.log("\nTesting downloadUrl2:", downloadUrl2);
  try {
    const res2 = await axios.get(downloadUrl2, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("DownloadUrl2 status:", res2.status, "Length:", res2.data.byteLength);
    const wb = XLSX.read(res2.data, { type: 'buffer' });
    console.log("🎉 SUCCESS! SheetNames:", wb.SheetNames);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log("Rows parsed:", rows);
  } catch (e) {
    console.log("DownloadUrl2 error:", e.message);
  }
}

testEmbed();
