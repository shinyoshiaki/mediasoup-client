import { Socket } from "socket.io";
import { SFU } from "./sfu";

export class Room {
  guests: { [id: string]: Socket } = {};
  get guestsSockets() {
    return Object.values(this.guests);
  }

  sfu = new SFU();

  constructor() {}

  async init() {
    await this.sfu.runMediasoupWorker();
    this.sfu.onProduce.subscribe((producerId) => {
      console.log("produce", producerId);
      this.guestsSockets.forEach((socket) => {
        socket.emit("produce", producerId);
      });
    });
    this.sfu.onProduceData.subscribe((producerId) => {
      console.log("produce", producerId);
      this.guestsSockets.forEach((socket) => {
        socket.emit("produceData", producerId);
      });
    });
  }

  addGuest(socket: Socket) {
    this.guests[socket.id] = socket;

    socket.on("disconnect", () => {
      console.log("on disconnect");
      delete this.guests[socket.id];
      this.sfu.disconnect(socket.id);
    });

    this.sfu.listen(socket);
  }
}
