// Adds support for Promise to socket.io-client
export function socketPromise(socket: any) {
  return function request(type: any, data = {}) {
    return new Promise<any>((resolve) => {
      socket.emit(type, data, resolve);
    });
  };
}
