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
    this.sfu.onProduce.subscribe((id) => {
      console.log("produce", id);
      this.guestsSockets
        .filter((socket) => socket.id != id)
        .forEach((socket) => {
          console.log("emit produce", socket.id);
          socket.emit("produce", socket.id);
        });
    });
  }

  addGuest(guestSocket: Socket) {
    this.guests[guestSocket.id] = guestSocket;

    guestSocket.on("disconnect", () => {
      console.log("on disconnect")
      delete this.guests[guestSocket.id];
      this.sfu.disconnect(guestSocket.id)
    });

    this.sfu.listen(guestSocket);
  }
}
