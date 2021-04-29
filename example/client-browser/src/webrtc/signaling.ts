import socketClient from "socket.io-client";

export class Signaling {
  constructor(public socket?: SocketIOClient.Socket) {}
}

export const defaultAddress = "http://127.0.0.1:20000";

export const createSocket = (address: string) =>
  socketClient(address, {
    secure: true,
    ca: `-----BEGIN CERTIFICATE-----
  MIIDDjCCAfYCCQDqDUfd6WFBTTANBgkqhkiG9w0BAQsFADBJMQswCQYDVQQGEwJD
  QTELMAkGA1UECAwCUUMxFjAUBgNVBAoMDUNvbXBhbnksIEluYy4xFTATBgNVBAMM
  DG15ZG9tYWluLmNvbTAeFw0yMDA1MjYwNzAyNDNaFw0yMTA1MjYwNzAyNDNaMEkx
  CzAJBgNVBAYTAkNBMQswCQYDVQQIDAJRQzEWMBQGA1UECgwNQ29tcGFueSwgSW5j
  LjEVMBMGA1UEAwwMbXlkb21haW4uY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
  MIIBCgKCAQEA2IHIHtLFNivnS33X4jMAl4WGuYjxM4TBBYco99I9L70hgKqzi2kd
  X8qpiGUizcxu56VkHfv9ciz940vLed7pR4Wb5V81zsC68cjHHpFs1xvixod9kDVy
  9dQFhEKgDldWFy6aCsEBnLsokkswCA98VCoji9MLp210JEgg01z+j1Qu8QE6JC+P
  c8Cpm0NAbgUxDhb2TyMeYxHbRJ2EN71wsj2xBo1ynxctpF/aNCm255sHEPTJWnoq
  IV9mS8LeUnvA/LpOM0e1NRHlidi2uB2TDrJv1fdf9PcZRsLbinJKt4Kfz4j67/Mu
  kbVEsCUxegUhDcAcz/5IUEvmzNC9ZIBouQIDAQABMA0GCSqGSIb3DQEBCwUAA4IB
  AQDEvFQ2Zxfft1EEN8EXMpu+Oi7Fb16soiVxA5Yq0Akak+uyIiTNZUzvcgH4zt0h
  DEEaUyoQuT4Og5NKTZrJXMvX0mY+jb6rSp55SoBooX1AyD2nVzqubRQLj8BaF3D6
  bXgMYwQ5BlMMykHlCbIon6WStGGhf58ly598127HPWlZQpbFbjU2W1NVR8m/oQXT
  Bd/96rmmm+G7LsL1g7MOEcutEmz0QaODQ7kUVMWDKWa00Hz4TMsxuukqSMAjRyUM
  5RSaPeYTo9HvG/xINE3a1lTQmac2dQaHUDpLtW1F0Z0ePz7hq0+4p1Ve3QflyTU5
  myUftdybX1U4xb6OVTMpyt9f
  -----END CERTIFICATE-----
  `,
  });

export const signaling = new Signaling(createSocket(defaultAddress));
