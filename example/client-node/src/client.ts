import * as mediasoup from "../../../src";
import { DataConsumer, RtpCapabilities, Transport } from "../../../src/types";
import { socketPromise } from "./socket.io-promise";
import Event from "rx.mini";
import {
  RTCRtpCodecParameters,
  useAbsSendTime,
  useFIR,
  useNACK,
  usePLI,
  useREMB,
  useSdesMid,
} from "../../../src";

export class Client {
  device!: mediasoup.Device;
  onSubscribeMedia = new Event<[MediaStreamTrack]>();
  onSubscribeData = new Event<[DataConsumer]>();

  //@ts-ignore
  constructor(private socket: SocketIOClient.Socket) {}

  connect = async () => {
    const data = await socketPromise(this.socket)("getRouterRtpCapabilities");
    console.log(data);
    await this.loadDevice(data);

    this.socket.on("disconnect", () => {
      console.log("Disconnected");
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("could not connect to %s%s (%s)", error.message);
    });

    this.socket.on("newProducer", () => {
      console.log("newProducer");
    });

    this.socket.on("produce", async (target: string) => {
      const track = await this.consume(target);
      this.onSubscribeMedia.execute(track);
    });

    this.socket.on("produceData", async (target: string) => {
      const consumer = await this.consumeData(target);
      this.onSubscribeData.execute(consumer);
    });

    return this;
  };

  sendTransport!: Transport;
  setupProducerTransport = async () => {
    const transportInfo: any = await socketPromise(this.socket)(
      "createProducerTransport",
      {
        forceTcp: false,
        rtpCapabilities: this.device.rtpCapabilities,
      }
    );
    if (transportInfo.error) {
      console.error(transportInfo.error);
      return;
    }
    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    this.sendTransport = this.device.createSendTransport(transportInfo);
    this.sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          const res = await socketPromise(this.socket)(
            "connectProducerTransport",
            {
              dtlsParameters,
            }
          );
          callback(res);
        } catch (error) {
          errback(error);
        }
      }
    );

    this.sendTransport.on("produce", async (params, callback, errback) => {
      try {
        const { id } = (await socketPromise(this.socket)(
          "produce",
          params
        )) as any;
        callback({ id });
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on("producedata", async (params, callback, errback) => {
      try {
        const { id } = (await socketPromise(this.socket)(
          "produceData",
          params
        )) as any;
        callback({ id });
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on("connectionstatechange", (state) => {
      console.log({ state });
      switch (state) {
        case "connecting":
          break;
        case "connected":
          break;
        case "failed":
          this.sendTransport.close();
          break;
        default:
          break;
      }
    });
  };

  async publishMedia(track: MediaStreamTrack) {
    const params = { track };
    await this.sendTransport.produce(params);
  }

  async publishData() {
    const producer = await this.sendTransport.produceData();
    return producer;
  }

  recvTransport!: Transport;
  async setupConsumerTransport() {
    const data: any = await socketPromise(this.socket)(
      "createConsumerTransport",
      {
        forceTcp: false,
      }
    );
    if (data.error) {
      console.error(data.error);
      return;
    }

    this.recvTransport = this.device.createRecvTransport(data);
    this.recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          const res = await socketPromise(this.socket)(
            "connectConsumerTransport",
            {
              dtlsParameters,
            }
          );
          callback(res);
        } catch (error) {
          errback(error);
        }
      }
    );

    this.recvTransport.on("connectionstatechange", async (state) => {
      console.log({ state });
      switch (state) {
        case "connecting":
          break;
        case "connected":
          break;
        case "failed":
          this.recvTransport.close();
          break;
        default:
          break;
      }
    });
  }

  private loadDevice = async (routerRtpCapabilities: RtpCapabilities) => {
    this.device = new mediasoup.Device({
      headerExtensions: {
        video: [useSdesMid(), useAbsSendTime()],
      },
      codecs: {
        video: [
          new RTCRtpCodecParameters({
            mimeType: "video/VP8",
            clockRate: 90000,
            payloadType: 98,
            rtcpFeedback: [useFIR(), useNACK(), usePLI(), useREMB()],
          }),
        ],
      },
    });
    await this.device.load({
      routerRtpCapabilities,
    });
  };

  consume = async (target: string) => {
    const { rtpCapabilities } = this.device;
    const data: any = await socketPromise(this.socket)("consume", {
      producerId: target,
      rtpCapabilities,
    });
    const { producerId, id, kind, rtpParameters } = data;

    const consumer = await this.recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
    });
    return consumer.track;
  };

  consumeData = async (target: string) => {
    const params: any = await socketPromise(this.socket)("consumeData", {
      producerId: target,
    });
    console.warn({ params });

    const consumer = await this.recvTransport.consumeData(params);
    return consumer;
  };
}
