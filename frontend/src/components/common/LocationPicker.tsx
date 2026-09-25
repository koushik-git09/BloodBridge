import React, { useState, useEffect, useRef } from "react";
import { useGeolocation } from "../../hooks/useGeolocation";

interface LocationPickerProps {
  onLocationChange: (location: { latitude: number; longitude: number; address: string }) => void;
  initialAddress?: string;
  required?: boolean;
}

export default function LocationPicker({
  onLocationChange,
  initialAddress = "",
  required = true,
}: LocationPickerProps) {
  const {
    latitude,
    longitude,
    address: geoAddress,
    addressUnavailable,
    loading,
    error,
    success,
    requestLocation,
  } = useGeolocation();

  const [manualAddress, setManualAddress] = useState(initialAddress);
  const [addressTouched, setAddressTouched] = useState(false);
  const lastReportedRef = useRef<string>("");

  // Auto-fill manual address from reverse geocoding only if the user hasn't manually edited it yet
  useEffect(() => {
    if (success && geoAddress && !addressTouched && !manualAddress) {
      setManualAddress(geoAddress);
    }
  }, [success, geoAddress, addressTouched, manualAddress]);

  // Report changes to parent whenever lat, lng, or manualAddress updates
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      const activeAddress = manualAddress.trim() || geoAddress || "";
      const key = `${latitude},${longitude},${activeAddress}`;
      if (lastReportedRef.current !== key) {
        lastReportedRef.current = key;
        onLocationChange({
          latitude,
          longitude,
          address: activeAddress,
        });
      }
    }
  }, [latitude, longitude, manualAddress, geoAddress, onLocationChange]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setAddressTouched(true);
    const val = e.target.value;
    setManualAddress(val);
    if (latitude !== null && longitude !== null) {
      onLocationChange({
        latitude,
        longitude,
        address: val,
      });
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-bb-border bg-white/80 p-5 shadow-sm backdrop-blur-md">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-bb-text flex items-center gap-1.5">
            <span>Location & Address Details</span>
            {required && <span className="text-bb-crimson">*</span>}
          </label>
          <span className="text-[11px] font-medium text-bb-muted">
            Used for GPS distance matching & dispatch
          </span>
        </div>
        <p className="mt-0.5 text-xs text-bb-muted">
          Your location coordinates ensure emergency distance calculations work accurately, while your verified address helps donors and hospitals navigate directly to you.
        </p>
      </div>

      {/* 1. Location Detection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-bb-muted">
          Step 1: Detect Location
        </label>

        {!success && !loading && (
          <button
            type="button"
            onClick={requestLocation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-bb-crimson px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-bb-crimson-bright active:scale-[0.99]"
          >
            <svg className="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Use My Current Location
          </button>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            <svg className="size-4 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Detecting location & resolving address...</span>
          </div>
        )}

        {success && latitude !== null && longitude !== null && (
          <div className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
            <div className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black mt-0.5">
                ✓
              </span>
              <div className="space-y-1">
                <p className="font-bold text-emerald-950">Location Detected</p>
                {geoAddress ? (
                  <p className="text-xs text-emerald-900 font-medium flex items-start gap-1">
                    <span className="text-bb-crimson shrink-0">📍</span>
                    <span className="leading-snug">{geoAddress}</span>
                  </p>
                ) : (
                  <div className="rounded-lg bg-amber-100/70 border border-amber-300/60 p-2 text-amber-900 space-y-0.5">
                    <p className="font-bold">Address unavailable</p>
                    <p className="text-[11px] text-amber-800">
                      Please try detecting your location again or type your address below.
                    </p>
                  </div>
                )}
                <p className="text-[11px] text-emerald-700">Location enabled successfully.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestLocation}
              className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 shrink-0 ml-2"
            >
              Re-detect
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1.5">
            <p className="font-bold">{error}</p>
            <p className="text-[11px] text-red-600">
              Please allow location permission in your browser to calculate proximity distance.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700 transition"
            >
              Retry Location
            </button>
          </div>
        )}
      </div>

      {/* 2. Manual Physical Address Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-bb-muted">
            Step 2: Enter Physical Address / Landmark {required && <span className="text-bb-crimson">*</span>}
          </label>
          {success && geoAddress && (
            <button
              type="button"
              onClick={() => {
                setManualAddress(geoAddress);
                setAddressTouched(true);
                if (latitude !== null && longitude !== null) {
                  onLocationChange({ latitude, longitude, address: geoAddress });
                }
              }}
              className="text-[11px] font-semibold text-bb-teal hover:underline"
            >
              Use Detected Address
            </button>
          )}
        </div>
        <textarea
          rows={2}
          value={manualAddress}
          onChange={handleAddressChange}
          required={required}
          placeholder="e.g. Apollo Hospital Campus, Greams Road, Thousand Lights, Chennai - 600006"
          className="w-full rounded-xl border border-bb-border bg-white p-3 text-xs sm:text-sm text-bb-text outline-none transition focus:border-bb-crimson focus:ring-2 focus:ring-bb-crimson/20"
        />
        <p className="text-[11px] text-bb-muted">
          Provide complete details: Building name, street, area, city, and pincode.
        </p>
      </div>
    </div>
  );
}
