// Adds support for Promise to socket.io-client
export const socketPromise = (socket: SocketIOClient.Socket) => <T>(
  type: any,
  data = {}
) =>
  new Promise<T>((resolve) => {
    console.log("socketPromise", type, data);
    socket.emit(type, data, resolve);
  });
