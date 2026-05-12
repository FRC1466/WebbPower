// Minimal NT4 client — connects to the NT4 WebSocket on the roboRIO,
// subscribes to PDH/PDP and FMS topics, and emits decoded samples.
//
// Reference: https://github.com/wpilibsuite/allwpilib/blob/main/ntcore/doc/networktables4.adoc

type Topic = {
  uid: number;
  name: string;
  type: string;
};

export type Nt4Sample = {
  topic: string;
  value: unknown;
  timestamp: number;
};

type Listener = (sample: Nt4Sample) => void;

const SUBSCRIBE_PREFIXES = [
  "/SmartDashboard/Power/",
  "/PowerDistribution/",
  "/CANBus/",
  "/FMSInfo/",
  "/DriverStation/",
  "/SystemStats/",
  "/AdvantageKit/RealOutputs/PowerDistribution/",
];

export class Nt4Client {
  private ws: WebSocket | null = null;
  private url: string;
  private topicsByUid = new Map<number, Topic>();
  private listeners: Listener[] = [];
  private connectedListeners: ((c: boolean) => void)[] = [];
  private clientId = `webbpower-${Math.random().toString(36).slice(2, 8)}`;
  private reconnectTimer: number | null = null;
  private intentionallyClosed = false;
  private subUid = 1;

  constructor(host: string) {
    const hostNoProto = host.replace(/^wss?:\/\//, "").replace(/^https?:\/\//, "");
    this.url = `ws://${hostNoProto}:5810/nt/${this.clientId}`;
  }

  on(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  onConnected(listener: (connected: boolean) => void) {
    this.connectedListeners.push(listener);
    return () => {
      this.connectedListeners = this.connectedListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  connect() {
    this.intentionallyClosed = false;
    this.openSocket();
  }

  close() {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.emitConnected(false);
  }

  private emitConnected(c: boolean) {
    for (const l of this.connectedListeners) l(c);
  }

  private openSocket() {
    try {
      this.ws = new WebSocket(this.url, ["networktables.first.wpi.edu"]);
    } catch (e) {
      console.error("NT4 connect failed:", e);
      this.scheduleReconnect();
      return;
    }
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.emitConnected(true);
      // Subscribe to all power-related prefixes.
      this.send([
        {
          method: "subscribe",
          params: {
            topics: SUBSCRIBE_PREFIXES,
            subuid: this.subUid++,
            options: { periodic: 0.02, all: true, prefix: true },
          },
        },
      ]);
    };

    this.ws.onclose = () => {
      this.emitConnected(false);
      if (!this.intentionallyClosed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will follow.
    };

    this.ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        this.handleText(ev.data);
      } else if (ev.data instanceof ArrayBuffer) {
        this.handleBinary(new Uint8Array(ev.data));
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, 2000);
  }

  private send(messages: unknown[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(messages));
  }

  private handleText(json: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    for (const msg of parsed as Array<{
      method: string;
      params: Record<string, unknown>;
    }>) {
      if (msg.method === "announce") {
        const p = msg.params;
        const uid = p.id as number;
        this.topicsByUid.set(uid, {
          uid,
          name: p.name as string,
          type: p.type as string,
        });
      } else if (msg.method === "unannounce") {
        const uid = msg.params.id as number;
        this.topicsByUid.delete(uid);
      }
    }
  }

  // MessagePack decoder lite: we only need to decode the array form
  // [topicId, timestamp, typeId, value]. Full msgpack support is overkill;
  // we use a tiny inline decoder that covers fixarray + fixstr + uint + int + float + bool + nil.
  private handleBinary(buf: Uint8Array) {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let pos = 0;
    const readValue = (): unknown => {
      const b = view.getUint8(pos++);
      if (b <= 0x7f) return b;
      if (b >= 0xe0) return b - 0x100;
      if (b >= 0x80 && b <= 0x8f) {
        const map: Record<string, unknown> = {};
        const len = b & 0x0f;
        for (let i = 0; i < len; i++) {
          const k = readValue() as string;
          map[k] = readValue();
        }
        return map;
      }
      if (b >= 0x90 && b <= 0x9f) {
        const len = b & 0x0f;
        const arr: unknown[] = [];
        for (let i = 0; i < len; i++) arr.push(readValue());
        return arr;
      }
      if (b >= 0xa0 && b <= 0xbf) {
        const len = b & 0x1f;
        const s = new TextDecoder().decode(
          buf.subarray(pos, pos + len),
        );
        pos += len;
        return s;
      }
      switch (b) {
        case 0xc0:
          return null;
        case 0xc2:
          return false;
        case 0xc3:
          return true;
        case 0xca: {
          const v = view.getFloat32(pos);
          pos += 4;
          return v;
        }
        case 0xcb: {
          const v = view.getFloat64(pos);
          pos += 8;
          return v;
        }
        case 0xcc: {
          const v = view.getUint8(pos);
          pos += 1;
          return v;
        }
        case 0xcd: {
          const v = view.getUint16(pos);
          pos += 2;
          return v;
        }
        case 0xce: {
          const v = view.getUint32(pos);
          pos += 4;
          return v;
        }
        case 0xcf: {
          const hi = view.getUint32(pos);
          const lo = view.getUint32(pos + 4);
          pos += 8;
          return hi * 2 ** 32 + lo;
        }
        case 0xd0: {
          const v = view.getInt8(pos);
          pos += 1;
          return v;
        }
        case 0xd1: {
          const v = view.getInt16(pos);
          pos += 2;
          return v;
        }
        case 0xd2: {
          const v = view.getInt32(pos);
          pos += 4;
          return v;
        }
        case 0xd3: {
          const hi = view.getInt32(pos);
          const lo = view.getUint32(pos + 4);
          pos += 8;
          return hi * 2 ** 32 + lo;
        }
        case 0xd9:
        case 0xda:
        case 0xdb: {
          const len =
            b === 0xd9
              ? view.getUint8(pos)
              : b === 0xda
                ? view.getUint16(pos)
                : view.getUint32(pos);
          pos += b === 0xd9 ? 1 : b === 0xda ? 2 : 4;
          const s = new TextDecoder().decode(buf.subarray(pos, pos + len));
          pos += len;
          return s;
        }
        case 0xdc:
        case 0xdd: {
          const len =
            b === 0xdc ? view.getUint16(pos) : view.getUint32(pos);
          pos += b === 0xdc ? 2 : 4;
          const arr: unknown[] = [];
          for (let i = 0; i < len; i++) arr.push(readValue());
          return arr;
        }
        case 0xde:
        case 0xdf: {
          const len =
            b === 0xde ? view.getUint16(pos) : view.getUint32(pos);
          pos += b === 0xde ? 2 : 4;
          const map: Record<string, unknown> = {};
          for (let i = 0; i < len; i++) {
            const k = readValue() as string;
            map[k] = readValue();
          }
          return map;
        }
      }
      return undefined;
    };

    while (pos < buf.length) {
      const start = pos;
      const v = readValue();
      if (!Array.isArray(v) || v.length < 4) continue;
      const [topicId, timestamp, , value] = v as [number, number, number, unknown];
      const topic = this.topicsByUid.get(topicId);
      if (!topic) continue;
      const sample: Nt4Sample = {
        topic: topic.name,
        value,
        timestamp,
      };
      for (const l of this.listeners) l(sample);
      if (pos === start) break;
    }
  }
}
