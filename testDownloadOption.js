const axios = require('axios');
const XLSX = require('xlsx');

async function testFormat(name, url) {
  try {
    console.log(`Testing [${name}]: ${url}`);
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log(`  -> Response status: ${res.status}, size: ${res.data.byteLength}`);
    const wb = XLSX.read(res.data, { type: 'buffer' });
    console.log(`  🎉 SUCCESS! SheetNames: ${wb.SheetNames}`);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    console.log(`  📦 Rows (${rows.length}):`, rows);
    return true;
  } catch (err) {
    console.log(`  ❌ Failed [${name}]:`, err.message);
    return false;
  }
}

async function runAllTests() {
  const shortUrl = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo";
  
  // Format 1: append download=1 to initial redirect
  await testFormat("Format 1 (download=1)", "https://onedrive.live.com/:x:/g/personal/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo?download=1");
  
  // Format 2: replace :x:/g/ with :x:/s/ or download
  await testFormat("Format 2 (download.aspx)", "https://onedrive.live.com/download.aspx?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850");

  // Format 3: append &download=1 to full redirect
  await testFormat("Format 3 (full redirect with download=1)", "https://onedrive.live.com/:x:/g/personal/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo?resid=38C13EBA4B8DF0EA!sb1b7c677e24b4d6ea8de7ce9252d7850&ithint=file%2cxlsx&download=1");

  // Format 4: SharePoint/OneDrive personal download endpoint
  await testFormat("Format 4 (download=1 on shortlink)", "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAaZ8Kzhb_znzhvh4gbevDZo?download=1");
}

runAllTests();
