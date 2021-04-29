import * as mediasoup from "mediasoup-client";
import { socketPromise } from "./socket.io-promise";
import { Producer } from "mediasoup-client/lib/types";
import { Subject } from "rxjs";

export class Client {
  device: mediasoup.Device;
  producer: Producer;
  onSubscribe = new Subject<MediaStream>();

  constructor(private socket: SocketIOClient.Socket) {
    this.connect();
  }

  private connect = async () => {
    const data = await socketPromise(this.socket)("getRouterRtpCapabilities");
    console.log(data);
    await this.loadDevice(data);

    this.socket.on("disconnect", () => {
      console.log("Disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("could not connect to %s%s (%s)", error.message);
    });

    this.socket.on("newProducer", () => {
      console.log("newProducer");
    });

    this.socket.on("produce", async (target) => {
      console.log("produce");
      const stream = await this.subscribe(target);
      this.onSubscribe.next(stream);
    });
  };

  publish = (stream: MediaStream) =>
    new Promise<void>(async (r) => {
      console.log("publish");
      const transportInfo: any = await socketPromise(this.socket)(
        "createTransport",
        {
          forceTcp: false,
          rtpCapabilities: this.device.rtpCapabilities,
        }
      );
      if (transportInfo.error) {
        console.error(transportInfo.error);
        return;
      }
      console.log({ transportInfo });
      transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
      const transport = this.device.createSendTransport(transportInfo);
      transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        console.log("connect");
        socketPromise(this.socket)("connectProducerTransport", {
          dtlsParameters,
        })
          .then((v) => {
            console.log({ v });
            callback(v);
          })
          .catch(errback);
      });

      transport.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          try {
            const { id } = (await socketPromise(this.socket)("produce", {
              transportId: transport.id,
              kind,
              rtpParameters,
            })) as any;
            console.log("produce");
            callback({ id });
          } catch (err) {
            errback(err);
          }
        }
      );

      transport.on("connectionstatechange", (state) => {
        console.log({ state });
        switch (state) {
          case "connecting":
            break;

          case "connected":
            r();
            break;

          case "failed":
            transport.close();
            break;

          default:
            break;
        }
      });

      try {
        const track = stream.getVideoTracks()[0];
        const params = { track };
        this.producer = await transport.produce(params);
      } catch (err) {}
    });

  subscribe = (target: string) =>
    new Promise<MediaStream>(async (r) => {
      const data: any = await socketPromise(this.socket)("createTransport", {
        forceTcp: false,
      });
      if (data.error) {
        console.error(data.error);
        return;
      }
      console.log({ data });

      const transport = this.device.createRecvTransport(data);
      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        socketPromise(this.socket)("connectConsumerTransport", {
          id: target,
          dtlsParameters,
        })
          .then((v) => {
            console.log({ v });
            callback(v);
          })
          .catch(errback);
      });

      transport.on("connectionstatechange", async (state) => {
        console.log({ state });
        switch (state) {
          case "connecting":
            break;

          case "connected":
            r(await stream);
            await socketPromise(this.socket)("resume");
            break;

          case "failed":
            transport.close();

            break;

          default:
            break;
        }
      });

      const stream = this.consume(target, transport);
    });

  private loadDevice = async (routerRtpCapabilities) => {
    this.device = new mediasoup.Device();
    await this.device.load({ routerRtpCapabilities });
  };

  private consume = async (target: string, transport) => {
    const { rtpCapabilities } = this.device;
    const data: any = await socketPromise(this.socket)("consume", {
      id: target,
      rtpCapabilities,
    });
    const { producerId, id, kind, rtpParameters } = data;

    let codecOptions = {};
    const consumer = await transport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      codecOptions,
    });
    const stream = new MediaStream();
    stream.addTrack(consumer.track);
    return stream;
  };
}
