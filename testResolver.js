const axios = require('axios');
const XLSX = require('xlsx');

async function testAuthkeyDownload() {
  const shareUrl = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo";
  
  // Follow initial 301
  const redirectRes = await axios.get(shareUrl, {
    maxRedirects: 0,
    validateStatus: s => s >= 200 && s < 400
  });

  const targetUrl = redirectRes.headers.location;
  console.log("Target URL:", targetUrl);

  const urlObj = new URL(targetUrl);
  const resid = urlObj.searchParams.get("resid");
  const redeem = urlObj.searchParams.get("redeem");
  const cid = targetUrl.split("/personal/")[1]?.split("/")[0];

  console.log("cid:", cid, "resid:", resid, "redeem:", redeem);

  const testUrls = [
    `https://onedrive.live.com/download?cid=${cid}&resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(redeem)}`,
    `https://onedrive.live.com/download?resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(redeem)}`,
    `https://onedrive.live.com/download?resid=${encodeURIComponent(resid)}&redeem=${encodeURIComponent(redeem)}`,
    `https://onedrive.live.com/download.aspx?cid=${cid}&resid=${encodeURIComponent(resid)}&authkey=${encodeURIComponent(redeem)}`,
    `https://onedrive.live.com/download.aspx?resid=${encodeURIComponent(resid)}&redeem=${encodeURIComponent(redeem)}`,
    // Graph API with redeem
    `https://api.onedrive.com/v1.0/shares/u!${Buffer.from(shareUrl).toString('base64').replace(/=/g,'').replace(/\//g,'_').replace(/\+/g,'-')}?authkey=${encodeURIComponent(redeem)}`,
  ];

  for (const u of testUrls) {
    try {
      console.log("\nTesting URL:", u);
      const res = await axios.get(u, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      console.log("  Status:", res.status, "Length:", res.data.byteLength);
      const wb = XLSX.read(res.data, { type: 'buffer' });
      console.log("  🎉 EXCEL SUCCESS! Sheet names:", wb.SheetNames);
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      console.log("  Data:", data);
      return;
    } catch (e) {
      console.log("  Failed:", e.message);
    }
  }
}

testAuthkeyDownload();
