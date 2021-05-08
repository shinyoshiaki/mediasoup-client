export declare type Kind = "audio" | "video" | "application" | "unknown";
export declare const SignalingStates: readonly ["stable", "have-local-offer", "have-remote-offer", "have-local-pranswer", "have-remote-pranswer", "closed"];
export declare type SignalingState = typeof SignalingStates[number];
export declare const ConnectionStates: readonly ["closed", "failed", "disconnected", "new", "connecting", "connected"];
export declare type ConnectionState = typeof ConnectionStates[number];
