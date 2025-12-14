// export function parseCSV(text) {
//   console.log("Parsing CSV text:", text);
//   // if (!text || typeof text !== "string") return [];
//   const lines = text
//     .trim()
//     .split("\n")
//     .map(l => l.trim())
//     .filter(Boolean)
//     .map(l => l.split(",").map(v => v.trim()));

  
//   // const lines = text
//   //   .trim()
//   //   .split(/\r?\n/)          // รองรับ Windows / Mac
//   //   .map(l => l.trim())
//   //   .filter(l => l.length > 0)
//   //   .map(l => l.split(",").map(v => v.trim()));

//   if (lines.length === 0) return [];

//   const headers = lines[0];

//   return lines.slice(1).map(row => {
//     const obj = {};

//     headers.forEach((h, i) => {
//       obj[h] = row[i] || "";
//     });

//     return obj;
//   });
// }


export function parseCSV(text, callback) {
  // กัน error: text ไม่ใช่ string
  if (typeof text !== "string") {
    console.error("parseCSV expects string but got:", text);
    callback([]);
    return;
  }

  const lines = text
    .trim()
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split(",").map(v => v.trim()));

  if (lines.length === 0) {
    callback([]);
    return;
  }

  const headers = lines[0].map(h => h.replace(/\r/g, ""));

  const rows = lines.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });

  // ส่งข้อมูลกลับด้วย callback
  callback(rows);
}
