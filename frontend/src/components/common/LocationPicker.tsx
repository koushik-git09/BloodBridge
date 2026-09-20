import React from "react";
import { useGeolocation } from "../../hooks/useGeolocation";

interface LocationPickerProps {
  onLocationChange: (location: { latitude: number; longitude: number; address: string }) => void;
  initialAddress?: string;
}

export default function LocationPicker({ onLocationChange, initialAddress = "" }: LocationPickerProps) {
  const { latitude, longitude, address, loading, error, success, requestLocation, setManualAddress } =
    useGeolocation();

  const lastReportedRef = React.useRef<string>("");

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setManualAddress(val);
    if (latitude !== null && longitude !== null) {
      lastReportedRef.current = `${latitude},${longitude},${val}`;
      onLocationChange({
        latitude,
        longitude,
        address: val,
      });
    }
  };

  const handleFetchLocation = () => {
    requestLocation();
  };

  // Trigger parent update when location succeeds without re-render looping
  React.useEffect(() => {
    if (success && latitude !== null && longitude !== null) {
      const key = `${latitude},${longitude},${address}`;
      if (lastReportedRef.current !== key) {
        lastReportedRef.current = key;
        onLocationChange({
          latitude,
          longitude,
          address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        });
      }
    }
  }, [success, latitude, longitude, address, onLocationChange]);

  return (
    <div className="space-y-3 rounded-2xl border border-bb-border bg-white/70 p-4 sm:p-5 backdrop-blur-md">
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-bb-text">
          Location
        </label>
        <p className="text-xs text-bb-muted">
          Please provide the location to continue
        </p>
      </div>

      {!success && !loading && (
        <button
          type="button"
          onClick={handleFetchLocation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-bb-crimson px-4 py-3 font-semibold text-white transition hover:bg-bb-crimson-bright shadow-sm active:scale-[0.99]"
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Use My Current Location
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm font-medium text-amber-700">
          <svg className="size-5 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Acquiring device geolocation...
        </div>
      )}

      {success && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <svg className="size-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>✓ Location detected</span>
            </div>
            <button
              type="button"
              onClick={handleFetchLocation}
              className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
            >
              Re-detect
            </button>
          </div>
          {address && (
            <p className="text-xs text-bb-muted truncate">
              Detected: <span className="font-medium text-bb-text">{address}</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <p className="font-medium">{error}</p>
            <p className="mt-1 text-xs text-red-600">
              Location permission is required to find nearby donors and blood banks.
            </p>
            <button
              type="button"
              onClick={handleFetchLocation}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Location Permission
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-bb-muted mb-1">
          Address / Landmark details (Optional)
        </label>
        <input
          type="text"
          value={address || initialAddress}
          onChange={handleAddressChange}
          placeholder="e.g. Apollo Hospital Campus, Greams Road, Chennai"
          className="w-full rounded-xl border border-bb-border bg-white px-4 py-2.5 text-sm text-bb-text outline-none focus:ring-2 focus:ring-bb-crimson"
        />
      </div>
    </div>
  );
}

