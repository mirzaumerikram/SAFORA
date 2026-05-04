import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../utils/constants';

class SocketService {
    private socket: Socket | null = null;
    private serverUrl = API_CONFIG.BASE_URL.replace('/api', '');

    async connect(): Promise<void> {
        if (this.socket?.connected) return;
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        this.socket = io(this.serverUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });
        this.socket.on('connect', () => console.log('[Socket] Connected:', this.socket?.id));
        this.socket.on('disconnect', (r) => console.log('[Socket] Disconnected:', r));
        this.socket.on('connect_error', (e) => console.log('[Socket] Error:', e.message));
    }

    joinRide(rideId: string): void {
        this.socket?.emit('join:ride', { rideId });
    }

    onDriverLocation(cb: (data: { lat: number; lng: number; heading?: number }) => void): void {
        this.socket?.on('driver:location', cb);
    }

    onRideStatus(cb: (data: { rideId: string; status: string }) => void): void {
        this.socket?.on('ride-status-updated', cb);
    }

    onRideAccepted(cb: (data: { rideId: string; driverId: string }) => void): void {
        this.socket?.on('ride:accepted', cb);
    }

    onDeviationAlert(cb: (data: {
        rideId: string;
        type: string;
        description: string;
        distance?: number;
        duration?: number;
        location?: { lat: number; lng: number };
        timestamp: string;
    }) => void): void {
        this.socket?.on('safety:deviation-alert', cb);
    }

    emitSOS(rideId: string): void {
        this.socket?.emit('sos:trigger', { rideId, timestamp: new Date().toISOString() });
    }

    onRideRequest(cb: (data: any) => void): void {
        this.socket?.on('ride:request', cb);
    }

    joinChat(rideId: string): void {
        this.socket?.emit('chat:join', { rideId });
    }

    sendChatMessage(rideId: string, text: string, sender: string, senderName: string): void {
        this.socket?.emit('chat:send', { rideId, text, sender, senderName });
    }

    onChatMessage(cb: (msg: {
        id: string; text: string;
        sender: 'passenger' | 'driver';
        senderName: string; timestamp: string;
    }) => void): void {
        this.socket?.on('chat:message', cb);
    }

    emitSOS(rideId: string): void {
        this.socket?.emit('sos:trigger', { rideId, timestamp: new Date().toISOString() });
    }

    emitDriverOnline(driverId: string): void {
        this.socket?.emit('join:driver', { driverId });
    }

    emitDriverOffline(driverId: string): void {
        this.socket?.emit('driver:offline', { driverId });
    }

    emitLocationUpdate(rideId: string, lat: number, lng: number): void {
        this.socket?.emit('driver:location-update', { rideId, lat, lng });
    }

    offAll() {
        this.socket?.off('ride:request');
        this.socket?.off('ride:accepted');
        this.socket?.off('ride-status-updated');
        this.socket?.off('driver:location');
        this.socket?.off('chat:message');
        this.socket?.off('safety:deviation-alert');
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    get isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export default new SocketService();
