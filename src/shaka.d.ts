// Minimal type declarations for shaka-player loaded from CDN

declare namespace shaka {
  function polyfill(): void;

  namespace polyfill {
    function installAll(): void;
  }

  namespace Player {
    function isBrowserSupported(): boolean;
  }

  class Player {
    constructor(video: HTMLVideoElement);
    configure(config: object): void;
    load(manifestUri: string): Promise<void>;
    destroy(): Promise<void>;
    addEventListener(type: string, listener: (event: PlayerEvent) => void): void;
    getNetworkingEngine(): shaka.net.NetworkingEngine;
  }

  namespace net {
    class NetworkingEngine {
      registerRequestFilter(filter: (type: number, request: any) => void): void;
    }
  }

  interface PlayerEvent extends Event {
    detail?: {
      severity?: number;
      code?: number;
      message?: string;
    };
  }

  namespace util {
    namespace Error {
      enum Severity {
        RECOVERABLE = 1,
        CRITICAL = 2,
      }
    }
  }
}
