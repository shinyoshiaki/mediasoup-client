// Adds support for Promise to socket.io-client
export const socketPromise = (socket: SocketIOClient.Socket) => <T>(type: any, data = {}) =>
  new Promise<T>((resolve) => {
    socket.emit(type, data, resolve);
  });
