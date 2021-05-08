declare module "binary-data" {
  type Types = {
    uint16be: number;
    buffer: any;
    uint8: number;
    uint24be: number;
    array: any;
    uint32be: number;
    uint48be: number;
    string: any;
    when: any;
    select: any;
  };
  const types: Types;
  type Encode = (o: object, spec: object) => { slice: () => number[] };
  const encode: Encode;

  type Decode = (buf: Buffer, spec: object) => any;
  const decode: Decode;

  type CreateDecode = (buf: Buffer) => any;
  const createDecode: CreateDecode;

  export { types, encode, decode, createDecode };
}
