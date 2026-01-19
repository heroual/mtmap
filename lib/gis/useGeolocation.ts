import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '../../types';

interface GeolocationState {
  location: Coordinates | null;
  accuracy: number | null; // in meters
  heading: number | null;
  speed: number | null;
  error: string | null;
  loading: boolean;
}

export const useGeolocation = (enableHighAccuracy = true) => {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    accuracy: null,
    heading: null,
    speed: null,
    error: null,
    loading: true,
  });

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      location: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      error: null,
      loading: false,
    });
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation not supported by browser',
        loading: false,
      }));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy,
      timeout: 15000,
      maximumAge: 0,
    };

    // Get initial position quickly
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

    // Watch for updates
    const watcherId = navigator.geolocation.watchPosition(onSuccess, onError, options);

    return () => {
      navigator.geolocation.clearWatch(watcherId);
    };
  }, [enableHighAccuracy, onSuccess, onError]);

  return state;
};
