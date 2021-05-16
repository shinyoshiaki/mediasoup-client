import socketio from "socket.io";
import http from "http";
import { Room } from "./room";

console.log("start");

(async () => {
  const room = new Room();
  const srv = new http.Server();
  const io = socketio(srv);
  srv.listen(20000);
  await room.init();
  io.on("connection", (socket) => {
    console.log("on connection");
    socket.on("join", (_, cb) => {
      console.log("on join");
      room.addGuest(socket);
      socket.emit("join");
      cb();
    });
  });
})();
