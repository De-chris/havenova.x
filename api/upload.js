export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const body = await req.arrayBuffer();

    const catboxRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'],
      },
      body: Buffer.from(body),
    });

    const text = await catboxRes.text();
    return res.status(catboxRes.status).send(text);
  } catch (err) {
    console.error('Catbox upload error:', err);
    return res.status(500).send('Error uploading');
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};