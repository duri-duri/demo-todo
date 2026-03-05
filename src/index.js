import http from "http";

const PORT = process.env.PORT ?? 3000;

const todos = [
  { id: 1, text: "example todo", done: false }
];

const server = http.createServer((req, res) => {

  if (req.url === "/todos" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(todos));
    return;
  }

  if (req.url === "/api/todos" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(todos));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");

});

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});