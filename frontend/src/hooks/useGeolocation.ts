import { useState, useCallback } from "react";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string;
  addressUnavailable: boolean;
  loading: boolean;
  error: string | null;
  success: boolean;
}

function formatReverseGeocodeAddress(data: any): string {
  if (!data) return "";
  const addr = data.address;
  if (addr && typeof addr === "object") {
    const parts: string[] = [];

    // Specific location / road
    const specific = addr.amenity || addr.building || addr.hospital;
    const road = [addr.house_number, addr.road].filter(Boolean).join(" ");
    if (specific) parts.push(specific);
    if (road && road !== specific) parts.push(road);

    // Neighbourhood / Suburb
    const locality = addr.neighbourhood || addr.suburb || addr.residential || addr.subdistrict;
    if (locality && !parts.includes(locality)) parts.push(locality);

    // City / Town / Village / District
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district;
    if (city && !parts.includes(city)) parts.push(city);

    // State
    if (addr.state && !parts.includes(addr.state)) parts.push(addr.state);

    // Postcode
    if (addr.postcode && !parts.includes(addr.postcode)) parts.push(addr.postcode);

    // Country
    if (addr.country && !parts.includes(addr.country)) parts.push(addr.country);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  if (typeof data.display_name === "string" && data.display_name.trim()) {
    return data.display_name.trim();
  }

  return "";
}

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: "",
    addressUnavailable: false,
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
      addressUnavailable: false,
      success: false,
    }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        let detectedAddress = "";
        let addrUnavailable = false;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            {
              headers: { Accept: "application/json" },
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            detectedAddress = formatReverseGeocodeAddress(data);
          }
        } catch {
          // Network or timeout failure on reverse geocoding
        }

        if (!detectedAddress) {
          addrUnavailable = true;
        }

        setState({
          latitude: lat,
          longitude: lng,
          address: detectedAddress,
          addressUnavailable: addrUnavailable,
          loading: false,
          error: null,
          success: true,
        });
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
          addressUnavailable: false,
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
    setState((prev) => ({ ...prev, address, addressUnavailable: false }));
  }, []);

  return {
    ...state,
    requestLocation,
    setManualAddress,
  };
}
