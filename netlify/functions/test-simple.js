exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      test: 'working',
      timestamp: new Date().toISOString(),
      method: event.httpMethod 
    })
  };
};
