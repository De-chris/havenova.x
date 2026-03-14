const https = require('https');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const options = {
    hostname: 'catbox.moe',
    path: '/user/api.php',
    method: 'POST',
    headers: {
      'Content-Type': req.headers['content-type'],
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error(e);
    res.status(500).send('Error uploading');
  });

  req.pipe(proxyReq);
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};