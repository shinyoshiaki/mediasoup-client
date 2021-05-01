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
      this.guestsSockets        
        .forEach((socket) => {
          console.log("emit produce", producerId);
          socket.emit("produce", producerId);
        });
    });
    this.sfu.onProduceData.subscribe((producerId) => {
      console.log("produce", producerId);
      this.guestsSockets        
        .forEach((socket) => {
          console.log("emit produceData", producerId);
          socket.emit("produceData", producerId);
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
