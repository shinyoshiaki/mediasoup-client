import { Socket } from "socket.io";
import { SFU } from "./sfu";
import { Subject } from "rxjs";

export class Room {
  guests: { [id: string]: Socket } = {};
  get guestsIds() {
    return Object.keys(this.guests);
  }
  get guestsSockets() {
    return Object.values(this.guests);
  }

  sfu = new SFU();
  onDestroy = new Subject();

  constructor(private roomId: string) {}

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
      delete this.guests[guestSocket.id];
      if (this.guestsSockets.length === 0) this.onDestroy.next();
    });

    guestSocket.on("sdp", (data: { sdp: string; target: string }) => {
      console.log("sdp", data, guestSocket.id);
      const { sdp, target } = data;
      if (!sdp || !target) return;

      const targetSocket = this.guests[target];
      if (!targetSocket) return;
      targetSocket.emit("sdp", { sdp, id: guestSocket.id });
    });

    guestSocket.on("", () => {});

    this.sfu.listen(guestSocket);
  }
}
