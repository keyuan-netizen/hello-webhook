const express = require('express');
const app = express();

app.use(express.json());          // parse JSON bodies
app.use(express.urlencoded({ extended: true }));

app.post('/', (req, res) => {
  const text = (req.body?.text || '').trim().toLowerCase();
  if (text === 'hello') {
    return res.json({ text: 'world' });
  }
  res.status(400).json({ error: 'Send { "text": "hello" }' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Webhook listening on ${port}`));