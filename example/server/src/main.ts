import socketio from "socket.io";
import http from "http";
import { Room } from "./room";

console.log("start");

export type RoomObj = {
  roomId: string;
};

class Server {
  roomList: { [key: string]: Room } = {};
  io: socketio.Server;

  constructor() {
    const srv = new http.Server();
    this.io = socketio(srv);
    srv.listen(20000);
    this.io.on("connection", (socket) => {
      this.listen(socket);
    });
  }

  async listen(guestSocket: socketio.Socket) {
    guestSocket.on("join", async (data: RoomObj) => {
      const { roomId } = data;
      const room = this.roomList[roomId];
      if (!room) {
        const room = new Room(roomId);
        await room.init();
        room.addGuest(guestSocket);
        this.roomList[roomId] = room;
        guestSocket.emit("join", { create: true });
        return;
      }
      room.guestsSockets.forEach((socket) => {
        socket.emit("join", { id: guestSocket.id });
      });
      guestSocket.emit("join", {
        guests: room.guestsIds,
      });
      room.addGuest(guestSocket);
      room.onDestroy.subscribe(() => {
        delete this.roomList[roomId];
      });
    });
  }
}

new Server();
