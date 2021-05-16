/* eslint-disable */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCRtpTransceiver,
  MediaStreamTrack,
  RTCRtpCodecParameters,
  RTCRtpHeaderExtensionParameters,
} from "werift";
import * as utils from "../utils";
import * as sdpTransform from "sdp-transform";
import * as sdpCommonUtils from "./sdp/commonUtils";
import * as sdpUnifiedPlanUtils from "./sdp/unifiedPlanUtils";
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
import { SctpCapabilities, SctpStreamParameters } from "../SctpParameters";
import {
  RtpCapabilities,
  RtpCodecCapability,
  RtpEncodingParameters,
  RtpHeaderExtension,
  RtpParameters,
} from "../RtpParameters";
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
  _pc!: RTCPeerConnection;
  // Map of RTCTransceivers indexed by MID.
  private readonly _mapMidTransceiver: Map<string, RTCRtpTransceiver> =
    new Map();
  private _hasDataChannelMediaSection = false;
  private _nextSendSctpStreamId = 0;
  private _transportReady = false;

  static createFactory(nativeRtpCapabilities: {
    codecs: Partial<{
      audio: RTCRtpCodecParameters[];
      video: RTCRtpCodecParameters[];
    }>;
    headerExtensions: Partial<{
      audio: RTCRtpHeaderExtensionParameters[];
      video: RTCRtpHeaderExtensionParameters[];
    }>;
  }) {
    return () => new Werift(nativeRtpCapabilities);
  }

  constructor(
    public nativeRtpCapabilities: {
      codecs: Partial<{
        audio: RTCRtpCodecParameters[];
        video: RTCRtpCodecParameters[];
      }>;
      headerExtensions: Partial<{
        audio: RTCRtpHeaderExtensionParameters[];
        video: RTCRtpHeaderExtensionParameters[];
      }>;
    }
  ) {
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
    let preferredPayloadType = 96;
    const codecs: RtpCodecCapability[] = [
      ...(this.nativeRtpCapabilities.codecs.video || []).map(
        ({ mimeType, clockRate, rtcpFeedback }) => {
          const codec: RtpCodecCapability = {
            kind: "video",
            mimeType,
            clockRate,
            rtcpFeedback,
            preferredPayloadType: preferredPayloadType++,
          };
          return codec;
        }
      ),
      ...(this.nativeRtpCapabilities.codecs.audio || []).map(
        ({ mimeType, clockRate, channels }) => {
          const codec: RtpCodecCapability = {
            kind: "audio",
            mimeType,
            clockRate,
            channels,
            preferredPayloadType: preferredPayloadType++,
          };
          return codec;
        }
      ),
    ];
    let preferredId = 1;
    const headerExtensions: RtpHeaderExtension[] = [
      ...(this.nativeRtpCapabilities.headerExtensions.audio || []).map(
        ({ uri }) => {
          const ext: RtpHeaderExtension = { uri, preferredId: preferredId++ };
          return ext;
        }
      ),
      ...(this.nativeRtpCapabilities.headerExtensions.video || []).map(
        ({ uri }) => {
          const ext: RtpHeaderExtension = { uri, preferredId: preferredId++ };
          return ext;
        }
      ),
    ];

    const caps: RtpCapabilities = {
      codecs,
      headerExtensions,
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

    this._pc = new RTCPeerConnection({
      iceServers: iceServers || [],
      iceTransportPolicy: iceTransportPolicy || "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      sdpSemantics: "unified-plan",
      ...this.nativeRtpCapabilities,
      ...additionalSettings,
    });

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
  // @ts-expect-error
  async getTransportStats(): Promise<RTCStatsReport> {}

  async send({
    track,
    encodings,
    codecOptions,
    codec,
  }: HandlerSendOptions): Promise<HandlerSendResult> {
    this._assertSendDirection();

    logger.debug("send() [kind:%s, track.id:%s]", track.kind, track.id);

    if (encodings && encodings.length > 1) {
      encodings.forEach((encoding: RtpEncodingParameters, idx: number) => {
        encoding.rid = `r${idx}`;
      });
    }

    const sendingRtpParameters = utils.clone(
      this._sendingRtpParametersByKind![track.kind],
      {}
    );

    // This may throw.
    sendingRtpParameters.codecs = ortc.reduceCodecs(
      sendingRtpParameters.codecs,
      codec
    );

    const sendingRemoteRtpParameters = utils.clone(
      this._sendingRemoteRtpParametersByKind![track.kind],
      {}
    );

    // This may throw.
    sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(
      sendingRemoteRtpParameters.codecs,
      codec
    );

    const mediaSectionIdx = this._remoteSdp!.getNextMediaSectionIdx();
    const transceiver = this._pc.addTransceiver(
      track as unknown as MediaStreamTrack,
      {
        direction: "sendonly",
      }
    );
    const offer = await this._pc.createOffer();
    let localSdpObject = sdpTransform.parse(offer.sdp);
    let offerMediaObject;

    if (!this._transportReady) {
      await this._setupTransport({ localDtlsRole: "server", localSdpObject });
    }

    logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);

    await this._pc.setLocalDescription(offer);

    // We can now get the transceiver.mid.
    const localId = transceiver.mid;

    // Set MID.
    sendingRtpParameters.mid = localId;

    localSdpObject = sdpTransform.parse(this._pc.localDescription!.sdp);
    offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];

    // Set RTCP CNAME.
    sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
      offerMediaObject,
    });

    // Set RTP encodings by parsing the SDP offer if no encodings are given.
    if (!encodings) {
      sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
        offerMediaObject,
      });
    }
    // Set RTP encodings by parsing the SDP offer and complete them with given
    // one if just a single encoding has been given.
    else if (encodings.length === 1) {
      const newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({
        offerMediaObject,
      });

      Object.assign(newEncodings[0], encodings[0]);

      sendingRtpParameters.encodings = newEncodings;
    }
    // Otherwise if more than 1 encoding are given use them verbatim.
    else {
      sendingRtpParameters.encodings = encodings;
    }

    this._remoteSdp!.send({
      offerMediaObject,
      reuseMid: mediaSectionIdx.reuseMid,
      offerRtpParameters: sendingRtpParameters,
      answerRtpParameters: sendingRemoteRtpParameters,
      codecOptions,
      extmapAllowMixed: true,
    });

    const answer = { type: "answer", sdp: this._remoteSdp!.getSdp() } as const;

    logger.debug(
      "send() | calling pc.setRemoteDescription() [answer:%o]",
      answer
    );
    await this._pc.setRemoteDescription(answer);

    // Store in the map.
    this._mapMidTransceiver.set(localId!, transceiver);

    return {
      localId: localId!,
      rtpParameters: sendingRtpParameters,
      rtpSender: transceiver.sender as any,
    };
  }

  // todo impl
  async stopSending(localId: string): Promise<void> {}

  // todo impl
  async replaceTrack(
    localId: string,
    track: globalThis.MediaStreamTrack | null
  ): Promise<void> {}

  // todo impl
  async setMaxSpatialLayer(
    localId: string,
    spatialLayer: number
  ): Promise<void> {}

  // todo impl
  async setRtpEncodingParameters(localId: string, params: any): Promise<void> {}

  // todo impl
  // @ts-expect-error
  async getSenderStats(localId: string): Promise<RTCStatsReport> {}

  async sendDataChannel({
    ordered,
    maxPacketLifeTime,
    maxRetransmits,
    label,
    protocol,
    priority,
  }: HandlerSendDataChannelOptions): Promise<HandlerSendDataChannelResult> {
    this._assertSendDirection();

    const options = {
      negotiated: true,
      id: this._nextSendSctpStreamId,
      ordered,
      maxPacketLifeTime,
      maxRetransmits,
      protocol,
      priority,
    };

    logger.debug("sendDataChannel() [options:%o]", options);

    const dataChannel = this._pc.createDataChannel(label || "", options);

    // Increase next id.
    this._nextSendSctpStreamId =
      ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;

    // If this is the first DataChannel we need to create the SDP answer with
    // m=application section.
    if (!this._hasDataChannelMediaSection) {
      const offer = await this._pc.createOffer();
      const localSdpObject = sdpTransform.parse(offer.sdp);
      const offerMediaObject = localSdpObject.media.find(
        (m: any) => m.type === "application"
      );

      if (!this._transportReady)
        await this._setupTransport({ localDtlsRole: "server", localSdpObject });

      logger.debug(
        "sendDataChannel() | calling pc.setLocalDescription() [offer:%o]",
        offer
      );

      await this._pc.setLocalDescription(offer);

      this._remoteSdp!.sendSctpAssociation({ offerMediaObject });

      const answer = {
        type: "answer",
        sdp: this._remoteSdp!.getSdp(),
      } as const;

      logger.debug(
        "sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]",
        answer
      );

      await this._pc.setRemoteDescription(answer);

      this._hasDataChannelMediaSection = true;
    }

    const sctpStreamParameters: SctpStreamParameters = {
      streamId: options.id,
      ordered: options.ordered,
      maxPacketLifeTime: options.maxPacketLifeTime,
      maxRetransmits: options.maxRetransmits,
    };

    return { dataChannel: dataChannel as any, sctpStreamParameters };
  }

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

    answer = new RTCSessionDescription(
      sdpTransform.write(localSdpObject),
      "answer"
    );

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
      track: transceiver.receiver.tracks[0] as any,
      // todo fix
      rtpReceiver: transceiver.receiver as unknown as RTCRtpReceiver,
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

  async receiveDataChannel({
    sctpStreamParameters,
    label,
    protocol,
  }: HandlerReceiveDataChannelOptions): Promise<HandlerReceiveDataChannelResult> {
    this._assertRecvDirection();

    const {
      streamId,
      ordered,
      maxPacketLifeTime,
      maxRetransmits,
    }: SctpStreamParameters = sctpStreamParameters;

    const options = {
      negotiated: true,
      id: streamId,
      ordered,
      maxPacketLifeTime,
      maxRetransmits,
      protocol,
    };

    logger.debug("receiveDataChannel() [options:%o]", options);

    const dataChannel = this._pc.createDataChannel(label || "", options);

    // If this is the first DataChannel we need to create the SDP offer with
    // m=application section.
    if (!this._hasDataChannelMediaSection) {
      this._remoteSdp!.receiveSctpAssociation();

      const offer = { type: "offer", sdp: this._remoteSdp!.getSdp() } as const;

      logger.debug(
        "receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]",
        offer
      );

      await this._pc.setRemoteDescription(offer);

      const answer = await this._pc.createAnswer();

      if (!this._transportReady) {
        const localSdpObject = sdpTransform.parse(answer.sdp);

        await this._setupTransport({ localDtlsRole: "client", localSdpObject });
      }

      logger.debug(
        "receiveDataChannel() | calling pc.setRemoteDescription() [answer:%o]",
        answer
      );

      await this._pc.setLocalDescription(answer);

      this._hasDataChannelMediaSection = true;
    }

    return { dataChannel } as any;
  }

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
