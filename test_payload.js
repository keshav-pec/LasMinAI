async function testLimit() {
  try {
    const text = "A".repeat(500000); // 500KB
    const res = await fetch('http://localhost:5050/api/extension/parse-dom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, url: "http://example.com" })
    });
    const result = await res.text();
    console.log("Status:", res.status, "Body:", result.substring(0, 100));
  } catch (err) {
    console.log("Error:", err.message);
  }
}
testLimit();
