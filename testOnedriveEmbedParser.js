const axios = require('axios');
const XLSX = require('xlsx');

// Test helper to parse OneDrive embed links or standard Excel links
async function testExcelNativeSync(url) {
  console.log("Input URL:", url);

  // If user passes 1drv.ms link, let's see how we can handle it
  // 1. If user pastes OneDrive Embed URL: https://onedrive.live.com/embed?resid=...&authkey=...
  // 2. Or if we convert /embed to /download
  let downloadUrl = url;
  if (url.includes("/embed?")) {
    downloadUrl = url.replace("/embed?", "/download?");
  }

  console.log("Converted Download URL:", downloadUrl);

  try {
    const res = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    console.log("Response status:", res.status, "Byte length:", res.data.byteLength);

    const wb = XLSX.read(res.data, { type: 'buffer' });
    console.log("🎉 SUCCESS! SheetNames:", wb.SheetNames);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log("📦 Parsed Excel Rows:", data);
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
}

// Test with embed format
testExcelNativeSync("https://onedrive.live.com/embed?resid=38C13EBA4B8DF0EA%21sb1b7c677e24b4d6ea8de7ce9252d7850&authkey=%21AIQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo&em=2");
