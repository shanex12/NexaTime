export function parseCSV(file, callback) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target.result.trim();
    const lines = text.split("\n");
    const headers = lines[0].split(",");

    const data = lines.slice(1).map(line => {
      const values = line.split(",");
      let obj = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = values[i]?.trim();
      });
      return obj;
    });

    callback(data);
  };

  reader.readAsText(file);
}
