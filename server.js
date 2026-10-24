const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();
const HOST = "127.0.0.1"; // Accessible uniquement depuis ce PC
const PORT = 3000;
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, "uploads");
const PUBLIC_DIR = path.join(ROOT, "public");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(PUBLIC_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".apk") {
      return cb(new Error("Sélectionne un fichier dont l’extension est .apk."));
    }
    cb(null, true);
  }
});

function runAdb(args, callback) {
  execFile("adb", args, {
    timeout: 60000,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  }, (error, stdout, stderr) => {
    callback({
      ok: !error,
      output: (stdout || stderr || (error && error.message) || "").trim()
    });
  });
}

function getAdbDevices(callback) {
  runAdb(["devices"], result => {
    if (!result.ok) return callback({ ok: false, connected: false, output: result.output });
    const lines = result.output.split(/\r?\n/).slice(1);
    const devices = lines.filter(line => /\tdevice$/.test(line));
    const unauthorized = lines.filter(line => /\tunauthorized$/.test(line));
    callback({
      ok: true,
      connected: devices.length > 0,
      devices: devices.length,
      unauthorized: unauthorized.length > 0,
      output: result.output
    });
  });
}

app.get("/api/status", (_req, res) => {
  getAdbDevices(result => {
    res.json({
      adbAvailable: !/not recognized|not found|cannot find/i.test(result.output),
      connected: result.connected,
      devices: result.devices || 0,
      unauthorized: result.unauthorized || false,
      output: result.output
    });
  });
});

app.get("/api/apks", (_req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(name => name.toLowerCase().endsWith(".apk"))
      .map(name => {
        const stat = fs.statSync(path.join(UPLOAD_DIR, name));
        return { name, size: stat.size, uploadedAt: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
    res.json(files);
  } catch {
    res.status(500).json({ error: "Impossible de lire le dossier des APK." });
  }
});

app.post("/api/upload", upload.single("apk"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucun fichier APK reçu." });
  res.json({ message: "APK importé.", name: req.file.filename, size: req.file.size });
});

app.post("/api/install", (req, res) => {
  const name = req.body && req.body.name;
  if (typeof name !== "string" || !/^[a-zA-Z0-9._-]+\.apk$/i.test(name)) {
    return res.status(400).json({ error: "Nom de fichier APK invalide." });
  }

  const fullPath = path.resolve(UPLOAD_DIR, name);
  if (path.dirname(fullPath) !== path.resolve(UPLOAD_DIR) || !fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "APK introuvable dans le dossier uploads." });
  }

  getAdbDevices(status => {
    if (!status.ok) {
      return res.status(503).json({
        error: "ADB est introuvable. Installe les Android Platform Tools et ajoute adb.exe au PATH.",
        details: status.output
      });
    }
    if (!status.connected) {
      return res.status(503).json({
        error: status.unauthorized
          ? "L’appareil Android n’est pas autorisé. Accepte la demande d’autorisation ADB dans Android."
          : "Aucun appareil Android connecté. Démarre Android et connecte-le à ADB.",
        details: status.output
      });
    }

    runAdb(["install", "-r", fullPath], result => {
      res.status(result.ok ? 200 : 500).json({
        message: result.ok ? "Installation réussie dans Android." : "Échec de l’installation.",
        details: result.output
      });
    });
  });
});

app.use((err, _req, res, _next) => {
  const message = err && err.message ? err.message : "Erreur inconnue.";
  res.status(400).json({ error: message });
});

app.listen(PORT, HOST, () => {
  console.log("");
  console.log("========================================");
  console.log(" APK Player est prêt !");
  console.log(` Ouvre : http://${HOST}:${PORT}`);
  console.log(" Garde cette fenêtre ouverte.");
  console.log("========================================");
  console.log("");
});
