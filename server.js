const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = 5000;

// =====================
// Middleware
// =====================
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static frontend files from sih-bluemarin-web folder
app.use(express.static(path.join(__dirname, "../sih-bluemarin-web")));

// =====================
// File paths
// =====================
const ngoDataPath = path.join(__dirname, "ngos.json");
const auditorDataPath = path.join(__dirname, "auditors.json");
const projectsFile = path.join(__dirname, "projects.json");
const uploadDir = path.join(__dirname, "uploads");

// =====================
// Landing Page
// =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../sih-bluemarin-web/landing-page.html"));
});

// =====================
// NGO Login
// =====================
app.post("/ngo-login", (req, res) => {
  const { email, password } = req.body;

  if (!fs.existsSync(ngoDataPath)) {
    return res.status(500).json({ success: false, message: "NGO data not found" });
  }

  const ngos = JSON.parse(fs.readFileSync(ngoDataPath));
  const ngo = ngos.find((n) => n.email === email && n.password === password);

  if (!ngo) {
    return res.json({ success: false, message: "Invalid email or password" });
  }

  res.json({ success: true, redirect: "/ngo-page.html" });
});

// =====================
// Auditor Login
// =====================
app.post("/auditor-login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!fs.existsSync(auditorDataPath)) {
      return res
        .status(500)
        .json({ success: false, message: "Auditor data not found" });
    }

    const auditors = JSON.parse(fs.readFileSync(auditorDataPath));
    const auditor = auditors.find(
      (a) => a.username === username && a.password === password
    );

    if (!auditor) {
      return res.json({ success: false, message: "Invalid username or password" });
    }

    res.json({ success: true, redirect: "/auditor-page.html" });
  } catch (err) {
    console.error("❌ Error in /auditor-login:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =====================
// File Upload (NGO Page)
// =====================
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Upload route
app.post("/upload", upload.array("files"), (req, res) => {
  console.log("✅ Files uploaded:", req.files);

  res.json({
    message: "✅ Files uploaded successfully!",
    files: req.files.map((f) => f.filename),
  });
});

// Auditor can view uploaded files
app.get("/auditor-files", (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: "Error reading uploaded files" });
    }
    res.json({ files });
  });
});

// =====================
// Project Submission
// =====================
if (!fs.existsSync(projectsFile)) {
  fs.writeFileSync(projectsFile, JSON.stringify([]));
}

// Add new project
app.post("/api/projects", (req, res) => {
  const { projectName, ngoName, trees, coordinates, photoUrl } = req.body;

  if (!projectName || !ngoName || !trees || !coordinates) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const projects = JSON.parse(fs.readFileSync(projectsFile));
  const newProject = {
    projectName,
    ngoName,
    trees,
    coordinates,
    photoUrl,
    verified: false, // default false until auditor verifies
  };

  projects.push(newProject);

  fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
  res.json({ message: "✅ Project added successfully", project: newProject });
});

// Get all projects
app.get("/api/projects", (req, res) => {
  const projects = JSON.parse(fs.readFileSync(projectsFile));
  res.json(projects);
});

// =====================
// Verify Project (Auditor)
// =====================
app.post("/api/verify-project/:id", (req, res) => {
  const projectId = parseInt(req.params.id);

  if (!fs.existsSync(projectsFile)) {
    return res.status(500).json({ message: "Projects file not found" });
  }

  let projects = JSON.parse(fs.readFileSync(projectsFile));

  if (!projects[projectId]) {
    return res.status(404).json({ message: "Project not found" });
  }

  projects[projectId].verified = true;

  fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));

  res.json({ message: "✅ Project verified successfully!" });
});

// =====================
// Start Server
// =====================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
