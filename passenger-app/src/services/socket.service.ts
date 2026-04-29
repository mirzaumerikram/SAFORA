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

    onRideRequest(cb: (data: any) => void): void {
        this.socket?.on('ride:request', cb);
    }

    emitDriverOnline(driverId: string): void {
        this.socket?.emit('driver:online', { driverId });
    }

    emitDriverOffline(driverId: string): void {
        this.socket?.emit('driver:offline', { driverId });
    }

    emitLocationUpdate(rideId: string, lat: number, lng: number): void {
        this.socket?.emit('driver:location-update', { rideId, lat, lng });
    }

    offAll(): void {
        this.socket?.off('driver:location');
        this.socket?.off('ride-status-updated');
        this.socket?.off('ride:accepted');
        this.socket?.off('ride:request');
    }

    disconnect(): void {
        this.offAll();
        this.socket?.disconnect();
        this.socket = null;
    }

    get isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export default new SocketService();
