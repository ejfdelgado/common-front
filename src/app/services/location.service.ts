import { Injectable } from '@angular/core';

export interface GeoLocationResult {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class LocationService {

    /**
     * Check geolocation permission state (if supported)
     */
    async checkPermission(): Promise<PermissionState | 'unsupported'> {
        if (!navigator.permissions) {
            return 'unsupported';
        }

        try {
            const status = await navigator.permissions.query({
                name: 'geolocation'
            } as PermissionDescriptor);

            return status.state;
        } catch {
            return 'unsupported';
        }
    }

    /**
     * Get current GPS position
     * MUST be triggered from a user action (click/tap)
     */
    getCurrentPosition(
        timeoutMs = 15000
    ): Promise<GeoLocationResult> {

        return new Promise((resolve, reject) => {

            if (!('geolocation' in navigator)) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = position.coords;

                    resolve({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        accuracy: coords.accuracy,
                        altitude: coords.altitude,
                        speed: coords.speed,
                        heading: coords.heading,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    reject(this.mapGeoError(error));
                },
                {
                    enableHighAccuracy: true, // important for mobile GPS
                    timeout: timeoutMs,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Continuous GPS tracking (optional)
     */
    watchPosition(
        onUpdate: (pos: GeoLocationResult) => void,
        onError?: (err: Error) => void
    ): number {

        if (!('geolocation' in navigator)) {
            throw new Error('Geolocation not supported');
        }

        return navigator.geolocation.watchPosition(
            (position) => {
                const c = position.coords;
                onUpdate({
                    latitude: c.latitude,
                    longitude: c.longitude,
                    accuracy: c.accuracy,
                    altitude: c.altitude,
                    speed: c.speed,
                    heading: c.heading,
                    timestamp: position.timestamp
                });
            },
            (err) => onError?.(this.mapGeoError(err)),
            {
                enableHighAccuracy: true
            }
        );
    }

    stopWatching(watchId: number): void {
        navigator.geolocation.clearWatch(watchId);
    }

    private mapGeoError(error: GeolocationPositionError): Error {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return new Error('Location permission denied');
            case error.POSITION_UNAVAILABLE:
                return new Error('Location unavailable');
            case error.TIMEOUT:
                return new Error('Location request timed out');
            default:
                return new Error('Unknown geolocation error');
        }
    }
}
