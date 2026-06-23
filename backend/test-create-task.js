const axios = require('axios');

(async () => {
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTime = new Date().toLocaleString('en-US', { timeZone: userTimezone });

    const response = await axios.post('http://localhost:5050/api/chat', { 
      message: "Leetcode question solving due 3 am",
      history: [],
      userTimezone,
      localTime
    });
    console.log(response.data);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
})();
