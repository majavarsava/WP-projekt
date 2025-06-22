const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "polerine-mv.appspot.com"
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/api/elements', async (req, res) => {
  try {
    const snapshot = await db.collection('elements').get();
    const elements = [];
    snapshot.forEach(doc => elements.push({ id: doc.id, ...doc.data() }));
    res.json(elements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/elements', async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.level) {
      return res.status(400).json({ error: "Name and level are required." });
    }
    const id = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    await db.collection('elements').doc(id).set(data);
    res.status(201).json({ id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/elements/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    await db.collection('elements').doc(id).update(data);
    res.json({ id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/elements/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const docRef = db.collection('elements').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Element not found." });
    }
    const data = doc.data();

    // Helper to extract storage path from download URL
    function extractStoragePath(url) {
      const match = url.match(/\/o\/(.*?)\?/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      return null;
    }

    // Delete image from storage if exists
    if (data.image && typeof data.image === "string") {
      let filePath = null;
      if (data.image.startsWith('http') && data.image.includes("firebasestorage.googleapis.com")) {
        filePath = extractStoragePath(data.image);
      } else {
        filePath = data.image;
      }
      if (filePath) {
        console.log("Deleting image from storage:", filePath);
        await admin.storage().bucket().file(filePath).delete().catch((e) => {
          console.warn("Failed to delete image from storage:", e.message);
        });
      }
    }

    // Delete video from storage if exists
    if (data.video && typeof data.video === "string") {
      let filePath = null;
      if (data.video.startsWith('http') && data.video.includes("firebasestorage.googleapis.com")) {
        filePath = extractStoragePath(data.video);
      } else {
        filePath = data.video;
      }
      if (filePath) {
        console.log("Deleting video from storage:", filePath);
        await admin.storage().bucket().file(filePath).delete().catch((e) => {
          console.warn("Failed to delete video from storage:", e.message);
        });
      }
    }
    await db.collection('elements').doc(id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});