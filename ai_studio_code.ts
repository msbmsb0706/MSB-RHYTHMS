import { io, Socket } from 'socket.io-client';
import { SyncMessage } from '../types';

// IMPORTANT: Replace 'localhost' with your Computer's IP Address (e.g., 192.168.1.5) if testing on phone via Wi-Fi
const BACKEND_URL = 'http://localhost:4000'; 

type MessageHandler = (msg: SyncMessage) => void;

class NetworkService {
  private socket: Socket | null = null;
  private listeners: Set<MessageHandler> = new Set();
  public userId: string;
  public currentPin: string | null = null;
  private timeOffset: number = 0;

  constructor() {
    this.userId = Math.random().toString(36).substr(2, 9);
  }

  public connect(pin: string, deviceType: 'mobile' | 'desktop') {
    if (this.socket) this.socket.disconnect();
    this.currentPin = pin;
    this.socket = io(BACKEND_URL);

    this.socket.on('connect', () => {
      this.socket?.emit('JOIN_SESSION', { pin, userId: this.userId, deviceType });
      this.startClockSync();
    });

    this.socket.on('PLAY', (p) => this.notify('PLAY', p));
    this.socket.on('PAUSE', () => this.notify('PAUSE', {}));
    this.socket.on('SEEK', (p) => this.notify('SEEK', p));
    this.socket.on('TRACK_CHANGE', (p) => this.notify('TRACK_CHANGE', p));
    this.socket.on('EFFECTS_UPDATE', (p) => this.notify('EFFECTS_UPDATE', p));
    
    this.socket.on('TIME_SYNC_RETURN', (payload) => {
        const now = Date.now();
        const rtt = now - payload.clientSendTime;
        const serverTime = payload.serverReceiveTime + (rtt / 2);
        this.timeOffset = serverTime - now;
    });
  }

  private startClockSync() {
      setInterval(() => {
          if(this.socket?.connected) {
              this.socket.emit('TIME_SYNC', { clientSendTime: Date.now() });
          }
      }, 5000);
  }

  public broadcast(type: SyncMessage['type'], payload?: any) {
    if (!this.socket || !this.currentPin) return;
    this.socket.emit(type, { pin: this.currentPin, ...payload });
  }

  public subscribe(handler: MessageHandler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private notify(type: SyncMessage['type'], payload: any) {
    const msg: SyncMessage = { type, payload, senderId: 'server', timestamp: Date.now() };
    this.listeners.forEach(l => l(msg));
  }
}

export const networkService = new NetworkService();