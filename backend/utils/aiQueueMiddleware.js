const queue = [];
let isProcessing = false;

const processNext = async () => {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }
  isProcessing = true;
  
  const { req, res, next } = queue.shift();
  
  // Wait for the response to finish before processing the next item in the queue
  const onFinish = () => {
    res.removeListener('finish', onFinish);
    res.removeListener('close', onFinish);
    // Wait 250ms between AI requests to respect rate limits
    setTimeout(processNext, 250);
  };
  
  res.on('finish', onFinish);
  res.on('close', onFinish);
  
  try {
    next();
  } catch (err) {
    onFinish();
  }
};

exports.aiQueueMiddleware = (req, res, next) => {
  // If the queue is too long, reject new requests to avoid timeout build-ups
  if (queue.length >= 10) {
    return res.status(429).json({ 
      success: false, 
      error: 'LasMinAI is currently processing many requests. Please try again in a moment.' 
    });
  }
  
  queue.push({ req, res, next });
  
  if (!isProcessing) {
    processNext();
  }
};
