import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCRtpTransceiver,
} from "werift";
import * as sdpTransform from "sdp-transform";
import * as sdpCommonUtils from "./sdp/commonUtils";
import * as ortc from "../ortc";
import { RemoteSdp } from "./sdp/RemoteSdp";
import { Logger } from "../Logger";
import {
  HandlerInterface,
  HandlerReceiveDataChannelOptions,
  HandlerReceiveDataChannelResult,
  HandlerReceiveOptions,
  HandlerReceiveResult,
  HandlerRunOptions,
  HandlerSendDataChannelOptions,
  HandlerSendDataChannelResult,
  HandlerSendOptions,
  HandlerSendResult,
} from "./HandlerInterface";
import { SctpCapabilities } from "../SctpParameters";
import { RtpCapabilities, RtpParameters } from "../RtpParameters";
import { DtlsRole, IceParameters } from "../Transport";

const logger = new Logger("werift");

const SCTP_NUM_STREAMS = { OS: 1024, MIS: 1024 };

export class Werift extends HandlerInterface {
  // Handler direction.
  private _direction?: "send" | "recv";
  // Remote SDP handler.
  private _remoteSdp?: RemoteSdp;
  // Generic sending RTP parameters for audio and video.
  private _sendingRtpParametersByKind?: { [key: string]: RtpParameters };
  // Generic sending RTP parameters for audio and video suitable for the SDP
  // remote answer.
  private _sendingRemoteRtpParametersByKind?: { [key: string]: RtpParameters };
  private _pc!: RTCPeerConnection;
  // Map of RTCTransceivers indexed by MID.
  private readonly _mapMidTransceiver: Map<
    string,
    RTCRtpTransceiver
  > = new Map();
  private _transportReady = false;

  static createFactory() {
    return () => new Werift();
  }

  constructor() {
    super();
  }

  get name() {
    return "werift";
  }

  close(): void {
    logger.debug("close()");

    // Close RTCPeerConnection.
    if (this._pc) {
      try {
        this._pc.close();
      } catch (error) {}
    }
  }

  async getNativeRtpCapabilities(): Promise<RtpCapabilities> {
    const caps: RtpCapabilities = {
      codecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
          rtcpFeedback: [
            { type: "ccm", parameter: "fir" },
            { type: "nack" },
            { type: "nack", parameter: "pli" },
            { type: "goog-remb" },
          ],
        },
      ],
    };
    return caps;
  }

  async getNativeSctpCapabilities(): Promise<SctpCapabilities> {
    logger.debug("getNativeSctpCapabilities()");

    return {
      numStreams: SCTP_NUM_STREAMS,
    };
  }

  run({
    direction,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    iceServers,
    iceTransportPolicy,
    additionalSettings,
    proprietaryConstraints,
    extendedRtpCapabilities,
  }: HandlerRunOptions): void {
    logger.debug("run()");

    this._direction = direction;

    this._remoteSdp = new RemoteSdp({
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
    });

    this._sendingRtpParametersByKind = {
      audio: ortc.getSendingRtpParameters("audio", extendedRtpCapabilities),
      video: ortc.getSendingRtpParameters("video", extendedRtpCapabilities),
    };

    this._sendingRemoteRtpParametersByKind = {
      audio: ortc.getSendingRemoteRtpParameters(
        "audio",
        extendedRtpCapabilities
      ),
      video: ortc.getSendingRemoteRtpParameters(
        "video",
        extendedRtpCapabilities
      ),
    };

    this._pc = new (RTCPeerConnection as any)(
      {
        iceServers: iceServers || [],
        iceTransportPolicy: iceTransportPolicy || "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
        sdpSemantics: "unified-plan",
        ...additionalSettings,
      },
      proprietaryConstraints
    );

    // Handle RTCPeerConnection connection status.
    this._pc.connectionStateChange.subscribe((state) => {
      switch (state) {
        case "connecting":
          this.emit("@connectionstatechange", "connecting");
          break;
        case "connected":
          this.emit("@connectionstatechange", "connected");
          break;
      }
    });
  }

  // todo impl
  async updateIceServers(iceServers: RTCIceServer[]): Promise<void> {}

  // todo impl
  async restartIce(iceParameters: IceParameters): Promise<void> {}

  // todo impl
  //@ts-expect-error
  async getTransportStats(): Promise<RTCStatsReport> {}

  // todo impl
  async send({
    track,
    encodings,
    codecOptions,
    codec,
  }: //@ts-expect-error
  HandlerSendOptions): Promise<HandlerSendResult> {}

  // todo impl
  async stopSending(localId: string): Promise<void> {}

  // todo impl
  async replaceTrack(
    localId: string,
    track: MediaStreamTrack | null
  ): Promise<void> {}

  // todo impl
  async setMaxSpatialLayer(
    localId: string,
    spatialLayer: number
  ): Promise<void> {}

  // todo impl
  async setRtpEncodingParameters(localId: string, params: any): Promise<void> {}

  // todo impl
  //@ts-expect-error
  async getSenderStats(localId: string): Promise<RTCStatsReport> {}

  // todo impl
  async sendDataChannel({
    ordered,
    maxPacketLifeTime,
    maxRetransmits,
    label,
    protocol,
    priority,
  }: //@ts-expect-error
  HandlerSendDataChannelOptions): Promise<HandlerSendDataChannelResult> {}

  async receive({
    trackId,
    kind,
    rtpParameters,
  }: HandlerReceiveOptions): Promise<HandlerReceiveResult> {
    this._assertRecvDirection();

    logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);

    const localId = rtpParameters.mid || String(this._mapMidTransceiver.size);

    this._remoteSdp!.receive({
      mid: localId,
      kind,
      offerRtpParameters: rtpParameters,
      streamId: rtpParameters.rtcp!.cname!,
      trackId,
    });

    const offer = new RTCSessionDescription(this._remoteSdp!.getSdp(), "offer");

    logger.debug(
      "receive() | calling pc.setRemoteDescription() [offer:%o]",
      offer
    );

    await this._pc.setRemoteDescription(offer);

    let answer = await this._pc.createAnswer();
    const localSdpObject = sdpTransform.parse(answer.sdp);
    const answerMediaObject = localSdpObject.media.find(
      (m: any) => String(m.mid) === localId
    );

    // May need to modify codec parameters in the answer based on codec
    // parameters in the offer.
    sdpCommonUtils.applyCodecParameters({
      offerRtpParameters: rtpParameters,
      answerMediaObject,
    });

    answer = { type: "answer", sdp: sdpTransform.write(localSdpObject) };

    if (!this._transportReady)
      await this._setupTransport({ localDtlsRole: "client", localSdpObject });

    logger.debug(
      "receive() | calling pc.setLocalDescription() [answer:%o]",
      answer
    );

    await this._pc.setLocalDescription(answer);

    const transceiver = this._pc
      .getTransceivers()
      .find((t) => t.mid === localId);

    if (!transceiver) throw new Error("new RTCRtpTransceiver not found");

    // Store in the map.
    this._mapMidTransceiver.set(localId, transceiver);

    return {
      localId,
      // todo fix
      track: (transceiver.receiver.tracks[0] as unknown) as MediaStreamTrack,
      // todo fix
      rtpReceiver: (transceiver.receiver as unknown) as RTCRtpReceiver,
    };
  }

  async stopReceiving(localId: string): Promise<void> {
    this._assertRecvDirection();

    logger.debug("stopReceiving() [localId:%s]", localId);

    const transceiver = this._mapMidTransceiver.get(localId);

    if (!transceiver) throw new Error("associated RTCRtpTransceiver not found");

    this._remoteSdp!.closeMediaSection(transceiver.mid!);

    const offer = new RTCSessionDescription(this._remoteSdp!.getSdp(), "offer");

    logger.debug(
      "stopReceiving() | calling pc.setRemoteDescription() [offer:%o]",
      offer
    );

    await this._pc.setRemoteDescription(offer);

    const answer = await this._pc.createAnswer();

    logger.debug(
      "stopReceiving() | calling pc.setLocalDescription() [answer:%o]",
      answer
    );

    await this._pc.setLocalDescription(answer);
  }

  // todo impl
  // @ts-expect-error
  async getReceiverStats(localId: string): Promise<RTCStatsReport> {}

  // todo impl
  async receiveDataChannel({
    sctpStreamParameters,
    label,
    protocol,
  }: //@ts-expect-error
  HandlerReceiveDataChannelOptions): Promise<HandlerReceiveDataChannelResult> {}

  private async _setupTransport({
    localDtlsRole,
    localSdpObject,
  }: {
    localDtlsRole: DtlsRole;
    localSdpObject?: any;
  }): Promise<void> {
    if (!localSdpObject)
      localSdpObject = sdpTransform.parse(this._pc.localDescription!.sdp);

    // Get our local DTLS parameters.
    const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
      sdpObject: localSdpObject,
    });

    // Set our DTLS role.
    dtlsParameters.role = localDtlsRole;

    // Update the remote DTLS role in the SDP.
    this._remoteSdp!.updateDtlsRole(
      localDtlsRole === "client" ? "server" : "client"
    );

    // Need to tell the remote transport about our parameters.
    await this.safeEmitAsPromise("@connect", { dtlsParameters });

    this._transportReady = true;
  }

  private _assertSendDirection(): void {
    if (this._direction !== "send") {
      throw new Error(
        'method can just be called for handlers with "send" direction'
      );
    }
  }

  private _assertRecvDirection(): void {
    if (this._direction !== "recv") {
      throw new Error(
        'method can just be called for handlers with "recv" direction'
      );
    }
  }
}
