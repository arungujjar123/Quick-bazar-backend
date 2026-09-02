const axios = require('axios');
const XLSX = require('xlsx');

async function testNewLink() {
  const link = "https://1drv.ms/x/c/38C13EBA4B8DF0EA/IQB3xrexS-JuTajefOklLXhQAfqoG74EQ55emof9nl74Qbk?e=WIEKIY";
  console.log("Testing New OneDrive Link:", link);

  // 1. Let's trace redirects
  try {
    const res1 = await axios.get(link, {
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s < 400
    });
    console.log("Redirect 1 Location:", res1.headers.location);

    const redirectUrl = res1.headers.location;
    
    // Convert to download link formats
    const downloadUrl1 = link.includes('?') ? link + "&download=1" : link + "?download=1";
    const downloadUrl2 = redirectUrl.replace('/:x:/g/', '/download?').replace('/view.aspx', '/download');

    console.log("\nDownload URL 1:", downloadUrl1);
    console.log("Download URL 2:", downloadUrl2);

    // Test downloadUrl1
    try {
      const dRes = await axios.get(downloadUrl1, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      console.log("Download 1 Bytes:", dRes.data.byteLength);
      const wb = XLSX.read(dRes.data, { type: 'buffer' });
      console.log("🎉 SUCCESS Download 1! Sheets:", wb.SheetNames);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      console.log("Rows:", rows);
    } catch (e) {
      console.log("Download 1 Error:", e.message);
    }

    // Test downloadUrl2
    try {
      const dRes2 = await axios.get(downloadUrl2, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      console.log("Download 2 Bytes:", dRes2.data.byteLength);
      const wb2 = XLSX.read(dRes2.data, { type: 'buffer' });
      console.log("🎉 SUCCESS Download 2! Sheets:", wb2.SheetNames);
      const rows2 = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]]);
      console.log("Rows 2:", rows2);
    } catch (e) {
      console.log("Download 2 Error:", e.message);
    }

  } catch (e) {
    console.error("Link test error:", e.message);
  }
}

testNewLink();
