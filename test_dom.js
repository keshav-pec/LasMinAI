const http = require('http');

async function testFullDOM() {
  const text = `Homework: Complete the math assignment by tomorrow 5 PM.`;
  
  // Create an HTTP request to the local API
  const postData = JSON.stringify({ text, url: "http://classroom.google.com" });

  const options = {
    hostname: 'localhost',
    port: 5050,
    path: '/api/extension/parse-dom',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      // We don't have a valid token, but we just want to see if the socket hangs up before auth middleware or after.
      // Wait, we need auth to reach extractTasksFromDOM.
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testFullDOM();
