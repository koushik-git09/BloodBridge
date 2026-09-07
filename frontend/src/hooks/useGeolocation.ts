import { useState, useCallback } from "react";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: "",
    loading: false,
    error: null,
    success: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by your browser.",
        success: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: false,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        const defaultAddr = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        setState({
          latitude: lat,
          longitude: lng,
          address: defaultAddr,
          loading: false,
          error: null,
          success: true,
        });

        // Attempt reverse geocoding to provide human-readable address if possible
        try {
          fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(2500),
            }
          )
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.display_name) {
                const shortAddr =
                  data.address?.city ||
                  data.address?.town ||
                  data.address?.suburb ||
                  data.display_name.split(",").slice(0, 3).join(",").trim();
                setState((prev) => ({
                  ...prev,
                  address: shortAddr || data.display_name,
                }));
              }
            })
            .catch(() => {
              // Fallback remains defaultAddr
            });
        } catch {
          // Fallback remains defaultAddr
        }
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission was denied. Please allow location access and try again.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out. Please try again.";
        }

        setState({
          latitude: null,
          longitude: null,
          address: "",
          loading: false,
          error: errorMessage,
          success: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const setManualAddress = useCallback((address: string) => {
    setState((prev) => ({ ...prev, address }));
  }, []);

  return {
    ...state,
    requestLocation,
    setManualAddress,
  };
}
