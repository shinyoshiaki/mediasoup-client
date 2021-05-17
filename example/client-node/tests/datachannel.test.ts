import io from "socket.io-client";
import { Client } from "../src/client";
import { socketPromise } from "../src/socket.io-promise";
import { waitFor } from "./fixture";

describe("datachannel", () => {
  test("produce(data) consume", async (done) => {
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket).init();
    await client.setupConsumerTransport();
    await client.setupProducerTransport();

    client.onProduceData.subscribe(async (target) => {
      const consumer = await client.consumeData(target);
      consumer.on("message", async (data) => {
        expect(data).toBe("data");
        socket.close();
        await new Promise((r) => setTimeout(r, waitFor));
        done();
      });
    });

    const producer = await client.publishData();
    setInterval(() => {
      producer.send("data");
    }, 100);
  });
});
