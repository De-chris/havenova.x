export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    // For multipart form data, we need to read the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    const catboxRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'multipart/form-data',
      },
      body: body,
    });

    const text = await catboxRes.text();

    // Check if we got a valid URL back
    if (catboxRes.ok && text.trim().startsWith('http')) {
      return res.status(200).send(text.trim());
    } else {
      console.error('Catbox error:', text);
      return res.status(500).send('Upload failed: ' + text);
    }
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).send('Error uploading: ' + err.message);
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};