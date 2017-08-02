'use strict';

import sdpTransform from 'sdp-transform';
import Logger from '../../Logger';
import * as utils from '../../utils';

const logger = new Logger('RemotePlanBSdp');

class SendRemoteSdp
{
	constructor(rtpParametersByKind)
	{
		// Generic sending RTP parameters for audio and video.
		// @type {Object}
		this._rtpParametersByKind = rtpParametersByKind;

		// Local parameters, including DTLS parameteres.
		// @type {Object}
		this._localParameters = null;

		// Remote parameters, including ICE parameters, ICE candidates and DTLS
		// parameteres.
		// @type {Object}
		this._remoteParameters = null;

		// SDP global fields.
		// @type {Object}
		this._sdpGlobalFields =
		{
			id      : utils.randomNumber(),
			version : 0
		};
	}

	setLocalParameters(localParameters)
	{
		logger.debug(
			'setLocalParameters() [localParameters:%o]', localParameters);

		this._localParameters = localParameters;
	}

	setRemoteParameters(remoteParameters)
	{
		logger.debug(
			'setRemoteParameters() [remoteParameters:%o]', remoteParameters);

		this._remoteParameters = remoteParameters;
	}

	createAnswerSdp(localSdpObj)
	{
		logger.debug('createAnswerSdp() [localSdpObj:%o]', localSdpObj);

		if (!this._localParameters)
			throw new Error('no local parameters');
		else if (!this._remoteParameters)
			throw new Error('no remote parameters');

		const localDtlsParameters = this._localParameters.dtlsParameters;
		const remoteIceParameters = this._remoteParameters.iceParameters;
		const remoteIceCandidates = this._remoteParameters.iceCandidates;
		const remoteDtlsParameters = this._remoteParameters.dtlsParameters;
		const sdpObj = {};
		const mids = (localSdpObj.media || [])
			.map((m) => m.mid);

		// Increase our SDP version.
		this._sdpGlobalFields.version++;

		sdpObj.version = 0;
		sdpObj.origin =
		{
			address        : '0.0.0.0',
			ipVer          : 4,
			netType        : 'IN',
			sessionId      : this._sdpGlobalFields.id,
			sessionVersion : this._sdpGlobalFields.version,
			username       : 'mediasoup-client'
		};
		sdpObj.name = '-';
		sdpObj.timing = { start: 0, stop: 0 };
		sdpObj.icelite = remoteIceParameters.iceLite ? 'ice-lite' : null;
		sdpObj.msidSemantic =
		{
			semantic : 'WMS',
			token    : '*'
		};
		sdpObj.groups =
		[
			{
				type : 'BUNDLE',
				mids : mids.join(' ')
			}
		];
		sdpObj.media = [];

		sdpObj.fingerprint =
		{
			type : remoteDtlsParameters.fingerprints[0].algorithm,
			hash : remoteDtlsParameters.fingerprints[0].value
		};

		for (let localMediaObj of (localSdpObj.media || []))
		{
			const kind = localMediaObj.type;
			const codecs = this._rtpParametersByKind[kind].codecs;
			const headerExtensions = this._rtpParametersByKind[kind].headerExtensions;
			const remoteMediaObj = {};

			remoteMediaObj.type = localMediaObj.type;
			remoteMediaObj.port = 7;
			remoteMediaObj.protocol = 'RTP/SAVPF';
			remoteMediaObj.connection = { ip: '127.0.0.1', version: 4 };
			remoteMediaObj.mid = localMediaObj.mid;

			remoteMediaObj.iceUfrag = remoteIceParameters.usernameFragment;
			remoteMediaObj.icePwd = remoteIceParameters.password;
			remoteMediaObj.candidates = [];

			for (let candidate of remoteIceCandidates)
			{
				let candidateObj = {};

				// mediasoup does not support non rtcp-mux so candidates component is
				// always RTP (1).
				candidateObj.component = 1;
				candidateObj.foundation = candidate.foundation;
				candidateObj.ip = candidate.ip;
				candidateObj.port = candidate.port;
				candidateObj.priority = candidate.priority;
				candidateObj.transport = candidate.protocol;
				candidateObj.type = candidate.type;
				if (candidate.tcpType)
					candidateObj.tcptype = candidate.tcpType;

				remoteMediaObj.candidates.push(candidateObj);
			}

			remoteMediaObj.endOfCandidates = 'end-of-candidates';

			// Announce support for ICE renomination.
			// https://tools.ietf.org/html/draft-thatcher-ice-renomination
			remoteMediaObj.iceOptions = 'renomination';

			switch (localDtlsParameters.role)
			{
				case 'client':
					remoteMediaObj.setup = 'active';
					break;
				case 'server':
					remoteMediaObj.setup = 'passive';
					break;
			}

			switch (localMediaObj.direction)
			{
				case 'sendrecv':
				case 'sendonly':
					remoteMediaObj.direction = 'recvonly';
					break;
				case 'recvonly':
				case 'inactive':
					remoteMediaObj.direction = 'inactive';
					break;
			}

			remoteMediaObj.rtp = [];
			remoteMediaObj.rtcpFb = [];
			remoteMediaObj.fmtp = [];

			for (let codec of codecs)
			{
				const rtp =
				{
					payload : codec.payloadType,
					codec   : codec.name,
					rate    : codec.clockRate
				};

				if (codec.numChannels > 1)
					rtp.encoding = codec.numChannels;

				remoteMediaObj.rtp.push(rtp);

				// If codec has parameters add them into a=fmtp attributes.
				if (codec.parameters)
				{
					const paramFmtp =
					{
						payload : codec.payloadType,
						config  : ''
					};

					for (let key of Object.keys(codec.parameters))
					{
						if (paramFmtp.config)
							paramFmtp.config += ';';

						paramFmtp.config += `${key}=${codec.parameters[key]}`;
					}

					if (paramFmtp.config)
						remoteMediaObj.fmtp.push(paramFmtp);
				}

				// Set RTCP feedback.
				if (codec.rtcpFeedback)
				{
					for (let fb of codec.rtcpFeedback)
					{
						remoteMediaObj.rtcpFb.push(
							{
								payload : codec.payloadType,
								type    : fb.type,
								subtype : fb.parameter
							});
					}
				}
			}

			remoteMediaObj.payloads = codecs
				.map((codec) => codec.payloadType)
				.join(' ');

			remoteMediaObj.ext = [];

			for (let ext of headerExtensions)
			{
				remoteMediaObj.ext.push(
					{
						uri   : ext.uri,
						value : ext.id
					});
			}

			remoteMediaObj.rtcpMux = 'rtcp-mux';
			remoteMediaObj.rtcpRsize = 'rtcp-rsize';

			// Push it.
			sdpObj.media.push(remoteMediaObj);
		}

		const sdp = sdpTransform.write(sdpObj);

		return sdp;
	}
}

export default class RemotePlanBSdp
{
	constructor(direction, rtpParametersByKind)
	{
		logger.debug(
			'constructor() [direction:%s, rtpParametersByKind:%o]',
			direction, rtpParametersByKind);

		switch (direction)
		{
			case 'send':
				return new SendRemoteSdp(rtpParametersByKind);
			case 'recv':
				// TODO:
				break;
		}
	}
}