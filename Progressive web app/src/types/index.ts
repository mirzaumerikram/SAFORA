export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'passenger' | 'driver' | 'admin';
    pinkPassEnrolled?: boolean;
    emergencyContacts?: EmergencyContact[];
}

export interface EmergencyContact {
    name: string;
    phone: string;
    relationship: string;
}

export interface Ride {
    id: string;
    passenger: User;
    driver?: User;
    pickup: Location;
    dropoff: Location;
    status: 'requested' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
    fare?: number;
    distance?: number;
    duration?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Location {
    lat: number;
    lng: number;
    address?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
