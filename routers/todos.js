import mongoose from "mongoose";
import Todo from "../models/Todo.js";

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function getTodoId(pathname) {
  if (!pathname.startsWith("/todos/") || pathname.length <= 7) return null;
  const id = pathname.slice(7);
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

export async function handleTodos(req, res, pathname, method) {
  const todoId = getTodoId(pathname);

  if (pathname === "/todos") {
    if (method === "GET") {
      try {
        const todos = await Todo.find().sort({ order: 1, createdAt: -1 });
        sendJson(res, 200, todos);
      } catch (err) {
        sendJson(res, 500, { error: "서버 오류가 발생했습니다." });
      }
      return true;
    }

    if (method === "POST") {
      try {
        const body = await parseBody(req);
        const { title } = body;
        if (!title || typeof title !== "string") {
          sendJson(res, 400, { error: "할일 내용(title)을 입력해주세요." });
          return true;
        }
        const todo = await Todo.create({ title: title.trim() });
        sendJson(res, 201, todo);
      } catch (err) {
        if (err.name === "ValidationError") {
          sendJson(res, 400, { error: err.message });
          return true;
        }
        sendJson(res, 500, { error: "서버 오류가 발생했습니다." });
      }
      return true;
    }
    return false;
  }

  if (todoId && (method === "PUT" || method === "PATCH")) {
    try {
      const body = await parseBody(req);
      const update = {};
      if (body.title !== undefined) {
        if (typeof body.title !== "string") {
          sendJson(res, 400, { error: "title은 문자열이어야 합니다." });
          return true;
        }
        update.title = body.title.trim();
      }
      if (body.completed !== undefined) update.completed = Boolean(body.completed);
      if (body.order !== undefined) update.order = Number(body.order);

      const todo = await Todo.findByIdAndUpdate(
        todoId,
        { $set: update },
        { new: true, runValidators: true }
      );
      if (!todo) {
        sendJson(res, 404, { error: "할일을 찾을 수 없습니다." });
        return true;
      }
      sendJson(res, 200, todo);
    } catch (err) {
      if (err.name === "ValidationError") {
        sendJson(res, 400, { error: err.message });
        return true;
      }
      sendJson(res, 500, { error: "서버 오류가 발생했습니다." });
    }
    return true;
  }

  if (todoId && method === "DELETE") {
    try {
      const todo = await Todo.findByIdAndDelete(todoId);
      if (!todo) {
        sendJson(res, 404, { error: "할일을 찾을 수 없습니다." });
        return true;
      }
      sendJson(res, 200, { message: "삭제되었습니다." });
    } catch (err) {
      sendJson(res, 500, { error: "서버 오류가 발생했습니다." });
    }
    return true;
  }

  return false;
}
