import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for Backend Meta Rendering
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  const fbApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
}

async function injectMetaTags(url: string, template: string) {
  let title = "Shastovsky.Photo — Collections";
  let desc = "Minimalist photography portfolio and travel stories.";
  let image = "https://photo.shastovsky.ru/favicon.svg";

  if (url.startsWith('/post/') && db) {
    const postId = url.split('/post/')[1]?.split('?')[0]; // clean up url params
    if (postId) {
      try {
        const postSnap = await getDoc(doc(db, 'posts', postId));
        if (postSnap.exists()) {
          const data = postSnap.data();
          title = data.title ? `${data.title} | Shastovsky.Photo` : title;
          desc = data.description ? data.description.substring(0, 160) + "..." : desc;
          const cover = data.cover;
          if (cover) {
            image = cover.startsWith('http') ? cover : `https://photo.shastovsky.ru${cover}`;
          }
        }
      } catch(e) {
        console.error("Meta inject Firebase error:", e);
      }
    }
  }

  const metaTags = `
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://photo.shastovsky.ru${url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${image}" />
  `;

  return template.replace(/<title>.*?<\/title>/s, metaTags);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Multer setup for uploads
  const uploadDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Use memory storage for processing with Sharp
  const storage = multer.memoryStorage();

  const upload = multer({ 
    storage,
    limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
  });

  app.use(express.json());

  // API Route for file uploads
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filenameBase = uniqueSuffix;
      
      const fullFilename = `${filenameBase}.webp`;
      const thumbFilename = `${filenameBase}-thumb.webp`;
      
      const fullPath = path.join(uploadDir, fullFilename);
      const thumbPath = path.join(uploadDir, thumbFilename);

      // Process and save full resolution (compressed webp)
      const info = await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toFile(fullPath);

      // Process and save thumbnail
      // Usually keeping it around ~600-800px width for bento grid cards is good for fast loading
      await sharp(req.file.buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 60 })
        .toFile(thumbPath);

      const fileUrl = `/uploads/${fullFilename}`;
      const thumbUrl = `/uploads/${thumbFilename}`;
      const sizeMb = info.size / (1024 * 1024);
      
      res.json({ url: fileUrl, thumbUrl, sizeMb });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  // Recompress oversized images route
  app.post("/api/recompress", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) return res.status(400).json({ error: "Filename required" });

      const basename = path.basename(filename);
      const fullPath = path.join(uploadDir, basename);
      
      if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "File not found" });

      const buffer = fs.readFileSync(fullPath);
      const metadata = await sharp(buffer).metadata();
      
      // Reduce dimensions by 30% and drop quality
      const newWidth = Math.round((metadata.width || 2000) * 0.7);
      
      const info = await sharp(buffer)
        .resize({ width: newWidth, withoutEnlargement: true })
        .webp({ quality: 70 })
        .toFile(fullPath);

      res.json({ 
        url: `/uploads/${basename}`, 
        sizeMb: info.size / (1024 * 1024) 
      });
    } catch (error) {
      console.error("Error recompressing:", error);
      res.status(500).json({ error: "Optimization failed" });
    }
  });

  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        allowedHosts: true,
        port: 3000,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fix: Catch-all route for dev mode to handle direct linking
    app.use('*', async (req, res, next) => {
      // Don't catch api or uploads
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        template = await injectMetaTags(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production: serve built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false })); // Disable default index serving to allow meta injection
    app.get("*", async (req, res) => {
      let template = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
      template = await injectMetaTags(req.originalUrl, template);
      res.send(template);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
