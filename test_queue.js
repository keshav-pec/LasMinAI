async function testQueue() {
  console.log("Starting Concurrent Requests Test...");
  const start = Date.now();
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch('http://localhost:5050/api/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "test" }) 
      })
      .then(res => {
        const time = Date.now() - start;
        console.log(`Request ${i + 1} completed at ${time}ms with status: ${res.status}`);
      })
    );
  }
  await Promise.all(promises);
  console.log("All requests completed.");
}
testQueue();
