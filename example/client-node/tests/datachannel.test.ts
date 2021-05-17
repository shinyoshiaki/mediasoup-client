import io from "socket.io-client";
import { Client } from "../src/client";
import { socketPromise } from "../src/socket.io-promise";
import { Counter, waitFor } from "./fixture";

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

  test("produce(data) produce(data) consume consume", async (done) => {
    const socket = io.connect("http://127.0.0.1:20000");

    await socketPromise(socket)("join");

    const client = await new Client(socket).init();
    await client.setupConsumerTransport();
    await client.setupProducerTransport();

    const counter = new Counter(2, async () => {
      socket.close();
      await new Promise((r) => setTimeout(r, waitFor));
      done();
    });

    let index = 1;
    client.onProduceData.subscribe(async (target) => {
      const toBe = index++;
      const consumer = await client.consumeData(target);
      consumer.on("message", async (data) => {
        expect(data).toBe(toBe.toString());
        counter.done();
      });
    });

    {
      const producer = await client.publishData();
      setInterval(() => {
        producer.send("1");
      }, 100);
    }
    {
      const producer = await client.publishData();
      setInterval(() => {
        producer.send("2");
      }, 100);
    }
  });
});
