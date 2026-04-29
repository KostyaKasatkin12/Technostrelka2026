import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../lib/auth.js";

const UPLOAD_DIR = path.join(process.cwd(), "artifacts", "api-server", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext =
      file.mimetype === "image/png"
        ? ".png"
        : file.mimetype === "image/webp"
          ? ".webp"
          : ".jpg";
    const random = Math.random().toString(36).slice(2, 10);
    cb(null, `${Date.now()}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Допустимы только JPG, PNG или WEBP до 5 МБ"));
      return;
    }
    cb(null, true);
  },
});

const router: Router = Router();

router.post(
  "/uploads/image",
  requireAuth,
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        const message =
          err?.code === "LIMIT_FILE_SIZE"
            ? "Файл слишком большой (максимум 5 МБ)"
            : err?.message ?? "Не удалось загрузить файл";
        res.status(400).json({ error: "upload_failed", message });
        return;
      }
      if (!req.file) {
        res
          .status(400)
          .json({ error: "no_file", message: "Файл не передан" });
        return;
      }
      const url = `/api/uploads/files/${req.file.filename}`;
      res.json({
        url,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    });
  },
);

router.get("/uploads/files/:name", (req: Request, res: Response): void => {
  const name = String(req.params.name);
  if (!/^[\w.-]+$/.test(name)) {
    res.status(400).end();
    return;
  }
  const filePath = path.join(UPLOAD_DIR, name);
  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }
  res.sendFile(filePath);
});

export default router;
