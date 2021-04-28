import * as mediasoup from "mediasoup";
import * as http from "http";
import { Socket } from "socket.io";
import {
  WorkerLogLevel,
  Worker,
  Router,
  WebRtcTransport,
  Consumer,
  Producer,
  RtpCapabilities,
} from "mediasoup/lib/types";
import config from "./config";
import { Subject } from "rxjs";

export class SFU {
  worker?: Worker;
  webServer?: http.Server;
  producers = new Map<string, Producer>();
  consumers = new Map<string, Consumer>();
  transports = new Map<string, WebRtcTransport>();
  mediasoupRouter?: Router;
  onProduce = new Subject<string>();

  listen(socket: Socket) {
    socket.on("disconnect", () => {
      console.log("client disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("client connection error", err);
    });

    socket.on("getRouterRtpCapabilities", (_, callback) => {
      callback(this.mediasoupRouter?.rtpCapabilities);
    });

    socket.on("transportList", (_, callback) => {
      callback([...this.transports.keys()]);
    });

    socket.on("createTransport", async (_, callback) => {
      try {
        const { transport, params } = await this.createWebRtcTransport();
        this.transports.set(socket.id, transport);
        callback(params);
      } catch (err) {
        console.error(err);
        callback({ error: err.message });
      }
    });

    socket.on("connectProducerTransport", async (data, callback) => {
      await this.transports.get(socket.id)?.connect({
        dtlsParameters: data.dtlsParameters,
      });
      callback();
    });

    socket.on("connectConsumerTransport", async (data, callback) => {
      await this.transports.get(socket.id)?.connect({
        dtlsParameters: data.dtlsParameters,
      });
      callback();
    });

    socket.on("produce", async (data, callback) => {
      const { kind, rtpParameters } = data;
      const producer = await this.transports.get(socket.id)!.produce({
        kind,
        rtpParameters,
      });
      this.producers.set(socket.id, producer);
      callback({ id: producer.id });

      this.onProduce.next(socket.id);
    });

    socket.on("consume", async (data, callback) => {
      callback(
        await this.createConsumer(
          socket.id,
          this.producers.get(data.id)!,
          data.rtpCapabilities
        )
      );
    });

    socket.on("resume", async (data, callback) => {
      await this.consumers.get(socket.id)!.resume();
      callback();
    });
  }

  async runMediasoupWorker() {
    this.worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel as WorkerLogLevel,
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    this.worker.on("died", () => {
      console.error(
        "mediasoup worker died, exiting in 2 seconds... [pid:%d]",
        this.worker?.pid
      );
      setTimeout(() => process.exit(1), 2000);
    });

    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    this.mediasoupRouter = await this.worker.createRouter({ mediaCodecs });
  }

  private async createWebRtcTransport() {
    const {
      maxIncomingBitrate,
      initialAvailableOutgoingBitrate,
    } = config.mediasoup.webRtcTransport;

    const transport = await this.mediasoupRouter?.createWebRtcTransport({
      listenIps: config.mediasoup.webRtcTransport.listenIps as any,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate,
    })!;
    if (maxIncomingBitrate) {
      try {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (error) {}
    }
    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    };
  }

  private async createConsumer(
    id: string,
    producer: Producer,
    rtpCapabilities: RtpCapabilities
  ) {
    if (
      !this.mediasoupRouter?.canConsume({
        producerId: producer.id,
        rtpCapabilities,
      })
    ) {
      console.error("can not consume");
      return;
    }
    try {
      const consumer = await this.transports.get(id)?.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: producer.kind === "video",
      })!;
      this.consumers.set(id, consumer);
      if (consumer.type === "simulcast") {
        await consumer.setPreferredLayers({
          spatialLayer: 2,
          temporalLayer: 2,
        });
      }
      return {
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused,
      };
    } catch (error) {
      console.error("consume failed", error);
      return;
    }
  }
}
