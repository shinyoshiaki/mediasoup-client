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
  DataProducer,
  DataConsumer,
  DataProducerOptions,
  RtpParameters,
  MediaKind,
  DtlsParameters,
} from "mediasoup/lib/types";
import config from "./config";
import Event from "rx.mini";

export class SFU {
  worker?: Worker;
  webServer?: http.Server;
  socketProducers = new Map<string, string[]>();
  producers = new Map<string, Producer>();
  dataProducers = new Map<string, DataProducer>();
  socketConsumers = new Map<string, string[]>();
  consumers = new Map<string, Consumer>();
  dataConsumers = new Map<string, DataConsumer>();
  producerTransports = new Map<string, WebRtcTransport>();
  consumerTransports = new Map<string, WebRtcTransport>();
  mediasoupRouter?: Router;
  onProduce = new Event<[string]>();
  onProduceData = new Event<[string]>();

  listen(socket: Socket) {
    this.socketProducers.set(socket.id, []);
    this.socketConsumers.set(socket.id, []);

    socket.on("getRouterRtpCapabilities", (_, callback) => {
      callback(this.mediasoupRouter?.rtpCapabilities);
    });

    socket.on("producerList", (_, callback) => {
      callback([...this.producers.keys()]);
    });

    socket.on("dataProducerList", (_, callback) => {
      callback([...this.dataProducers.keys()]);
    });

    socket.on("createProducerTransport", async (_, callback) => {
      try {
        const { transport, params } = await this.createWebRtcTransport();
        this.producerTransports.set(socket.id, transport);
        callback(params);
      } catch (err) {
        console.error(err);
        callback({ error: err.message });
      }
    });

    socket.on("createConsumerTransport", async (_, callback) => {
      try {
        const { transport, params } = await this.createWebRtcTransport();
        this.consumerTransports.set(socket.id, transport);
        callback(params);
      } catch (err) {
        console.error(err);
        callback({ error: err.message });
      }
    });

    socket.on("connectProducerTransport", async (data, callback) => {
      await this.producerTransports
        .get(socket.id)
        ?.connect({
          dtlsParameters: data.dtlsParameters,
        })
        .catch(console.log);
      callback();
    });

    socket.on(
      "connectConsumerTransport",
      async (
        { dtlsParameters }: { dtlsParameters: DtlsParameters },
        callback
      ) => {
        await this.consumerTransports
          .get(socket.id)
          ?.connect({
            dtlsParameters: dtlsParameters,
          })
          .catch(console.log);
        callback();
      }
    );

    socket.on(
      "produce",
      async (
        {
          kind,
          rtpParameters,
        }: {
          kind: MediaKind;
          rtpParameters: RtpParameters;
        },
        callback
      ) => {
        const producer = await this.producerTransports.get(socket.id)!.produce({
          kind,
          rtpParameters,
        });
        // producer.enableTraceEvent(["keyframe"]);
        producer.on("trace", (trace) => {
          console.log("trace", trace);
        });

        this.producers.set(producer.id, producer);
        this.socketProducers.get(socket.id)?.push(producer.id);
        callback({ id: producer.id });

        this.onProduce.execute(producer.id);
      }
    );

    socket.on("produceData", async (data: DataProducerOptions, callback) => {
      const producer = await this.producerTransports
        .get(socket.id)!
        .produceData(data);
      this.dataProducers.set(producer.id, producer);
      this.socketProducers.get(socket.id)?.push(producer.id);
      callback({ id: producer.id });

      this.onProduceData.execute(producer.id);
    });

    socket.on(
      "consume",
      async (
        {
          producerId,
          rtpCapabilities,
        }: { producerId: string; rtpCapabilities: RtpCapabilities },
        callback
      ) => {
        callback(
          await this.createConsumer(
            socket.id,
            this.producers.get(producerId)!,
            rtpCapabilities
          )
        );
      }
    );

    socket.on(
      "unConsume",
      async ({ consumerId }: { consumerId: string }, callback) => {
        this.unConsume(consumerId);
        callback();
      }
    );

    socket.on(
      "consumeData",
      async ({ producerId }: { producerId: string }, callback) => {
        callback(
          await this.createDataConsumer(
            socket.id,
            this.dataProducers.get(producerId)!
          )
        );
      }
    );

    socket.on(
      "unConsumeData",
      async ({ consumerId }: { consumerId: string }, callback) => {
        this.unConsumeData(consumerId);
        callback();
      }
    );
  }

  disconnect(socketId: string) {
    this.producerTransports.delete(socketId);
    this.consumerTransports.delete(socketId);
    this.socketProducers.get(socketId)?.forEach((id) => {
      this.producers.delete(id);
      this.dataProducers.delete(id);
    });
    this.socketProducers.delete(socketId);
    this.socketConsumers.get(socketId)?.forEach((id) => {
      this.consumers.delete(id);
      this.dataConsumers.delete(id);
    });
    console.log("client disconnected");
  }

  async runMediasoupWorker() {
    this.worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel as WorkerLogLevel,
      logTags: config.mediasoup.worker.logTags as any,
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
    const { maxIncomingBitrate, initialAvailableOutgoingBitrate, listenIps } =
      config.mediasoup.webRtcTransport;

    const transport = await this.mediasoupRouter?.createWebRtcTransport({
      listenIps: listenIps as any,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate,
      enableSctp: true,
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
        sctpParameters: transport.sctpParameters,
      },
    };
  }

  private async createConsumer(
    socketId: string,
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
      const consumer = await this.consumerTransports.get(socketId)?.consume({
        producerId: producer.id,
        rtpCapabilities,
      })!;

      this.socketConsumers.get(socketId)?.push(consumer.id);
      this.consumers.set(consumer.id, consumer);

      return {
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      console.error("consume failed", error);
      return;
    }
  }

  private unConsume(consumerId: string) {
    const consumer = this.consumers.get(consumerId);
    consumer?.close();
    this.consumers.delete(consumerId);
  }

  private async createDataConsumer(socketId: string, producer: DataProducer) {
    try {
      const consumer = await this.consumerTransports
        .get(socketId)
        ?.consumeData({
          dataProducerId: producer.id,
        })!;

      this.socketConsumers.get(socketId)?.push(consumer.id);
      this.dataConsumers.set(consumer.id, consumer);

      return {
        dataProducerId: producer.id,
        id: consumer.id,
        sctpStreamParameters: consumer.sctpStreamParameters,
      };
    } catch (error) {
      console.error("consume failed", error);
      return;
    }
  }

  private unConsumeData(consumerId: string) {
    const consumer = this.dataConsumers.get(consumerId);
    consumer?.close();
    this.dataConsumers.delete(consumerId);
  }
}
