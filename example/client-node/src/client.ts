import * as mediasoup from "../../../src";
import {
  PictureLossIndication,
  RtcpPayloadSpecificFeedback,
  RTCRtpCodecParameters,
  useAbsSendTime,
  useFIR,
  useNACK,
  usePLI,
  useREMB,
  useSdesMid,
} from "../../../src";
import {
  Consumer,
  DataConsumer,
  RtpCapabilities,
  Transport,
  WeriftRtpCapabilities,
} from "../../../src/types";
import { socketPromise } from "./socket.io-promise";
import Event from "rx.mini";

export class Client {
  device!: mediasoup.Device;
  onProduceMedia = new Event<[string]>();
  onProduceData = new Event<[string]>();

  constructor(
    private socket: SocketIOClient.Socket,
    private weriftCaps: WeriftRtpCapabilities = {
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
    }
  ) {}

  init = async () => {
    const data = await socketPromise(this.socket)("getRouterRtpCapabilities");
    await this.loadDevice(data);

    this.socket.on("disconnect", () => {});

    this.socket.on("connect_error", (error: Error) => {
      console.error("could not connect to %s%s (%s)", error.message);
    });

    this.socket.on("newProducer", () => {
      console.log("newProducer");
    });

    this.socket.on("produce", async (target: string) => {
      this.onProduceMedia.execute(target);
    });

    this.socket.on("produceData", async (target: string) => {
      this.onProduceData.execute(target);
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
    const producer = await this.sendTransport.produce(params);
    return producer;
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
    this.device = new mediasoup.Device(this.weriftCaps);
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
    return consumer;
  };

  unConsume = async (consumer: Consumer) => {
    await socketPromise(this.socket)("unConsume", {
      consumerId: consumer.id,
    });
    consumer.close();
  };

  consumeData = async (target: string) => {
    const params: any = await socketPromise(this.socket)("consumeData", {
      producerId: target,
    });

    const consumer = await this.recvTransport.consumeData(params);
    return consumer;
  };

  unConsumeData = async (consumer: DataConsumer) => {
    await socketPromise(this.socket)("unConsumeData", {
      consumerId: consumer.id,
    });
    consumer.close();
  };
}
