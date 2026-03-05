import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import 'dotenv/config';
import http from "http";
import mongoose from "mongoose";
import { URL } from "url";


console.log("BOOT_FROM_FILE:", new URL(import.meta.url).pathname);
console.log("BOOT_TIME:", new Date().toISOString());

const PORT = process.env.PORT ?? 5000;
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/todo_app";

// ====== Model ======
const TodoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Todo = mongoose.model("Todo", TodoSchema);

// ====== Helpers ======
function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {

      console.log("RAW_BODY>>", JSON.stringify(body));
      console.log("RAW_BODY_LEN>>", body.length); 

      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

// ====== Server ======
const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // health
    if (req.method === "GET" && path === "/") {
      return send(res, 200, { message: "Todo API", status: "ok" });
    }

    // GET /todos
    if (req.method === "GET" && path === "/todos") {
      const list = await Todo.find().sort({ createdAt: -1 }).lean();
      return send(res, 200, list);
    }

    // POST /todos  { title }
    if (req.method === "POST" && path === "/todos") {
      const body = await readJson(req);
      const title = (body.title ?? body.text ?? "").toString().trim();
      if (!title) return send(res, 400, { error: "title is required" });

      const doc = await Todo.create({ title, completed: false });
      return send(res, 201, doc);
    }

    // PATCH /todos/:id  { title?, completed? }
    const mPatch = path.match(/^\/todos\/([^/]+)$/);
    if (req.method === "PATCH" && mPatch) {
      const id = mPatch[1];
      const body = await readJson(req);

      const update = {};
      if (body.title != null || body.text != null) {
        const t = (body.title ?? body.text).toString().trim();
        if (!t) return send(res, 400, { error: "title cannot be empty" });
        update.title = t;
      }
      if (body.completed != null || body.done != null) {
        update.completed = Boolean(body.completed ?? body.done);
      }

      const doc = await Todo.findByIdAndUpdate(id, update, { new: true });
      if (!doc) return send(res, 404, { error: "not found" });
      return send(res, 200, doc);
    }

    // DELETE /todos/:id
    const mDel = path.match(/^\/todos\/([^/]+)$/);
    if (req.method === "DELETE" && mDel) {
      const id = mDel[1];
      const doc = await Todo.findByIdAndDelete(id);
      if (!doc) return send(res, 404, { error: "not found" });
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "Not Found" });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err.message || "Server error" });
  }
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Mongo 연결성공:", MONGODB_URI);

    // ↓ 이 두 줄 추가
    console.log("DB_NAME:", mongoose.connection.name);
    console.log("DB_HOST:", mongoose.connection.host);

    server.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  })
  .catch((e) => {
    console.error("Mongo 연결 실패:", e);
    process.exit(1);
  });