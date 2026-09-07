import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { register } from "../services/authService";
import type { BloodGroup, Role } from "../types";
import LocationPicker from "../components/common/LocationPicker";

const roleNames: Record<Role, string> = {
  HOSPITAL: "Hospital",
  BLOOD_BANK: "Blood Bank",
  DONOR: "Donor",
};
const roleFromPath = (value?: string): Role | undefined =>
  value === "blood-bank"
    ? "BLOOD_BANK"
    : value === "hospital" || value === "donor"
      ? (value.toUpperCase() as Role)
      : undefined;

export default function RegisterPage() {
  const navigate = useNavigate();
  const role = roleFromPath(useParams<{ role: string }>().role);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    bloodGroup: "",
    hospitalName: "",
  });
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>({
    latitude: null,
    longitude: null,
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  if (!role) return <Navigate to="/roles" replace />;
  const loginPath = `/login/${role === "BLOOD_BANK" ? "blood-bank" : role.toLowerCase()}`;

  const handleLocationChange = (loc: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setLocation(loc);
    setError("");
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (location.latitude === null || location.longitude === null) {
      setError("Please click 'Use My Current Location' to enable location detection.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
        },
        ...(role === "DONOR" ? { bloodGroup: form.bloodGroup } : {}),
        ...(role === "HOSPITAL" ? { hospitalName: form.hospitalName } : {}),
      });
      navigate(loginPath);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }


  const input = (field: keyof typeof form, label: string, type = "text") => (
    <label className="block text-sm font-semibold text-bb-text">
      {label}
      <input
        type={type}
        value={form[field]}
        onChange={(event) => update(field, event.target.value)}
        required
        className="mt-2 w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm text-bb-text outline-none focus:ring-2 focus:ring-bb-crimson"
      />
    </label>
  );
  return (
    <div className="min-h-screen bb-network-bg flex flex-col">
      <nav className="glass border-b border-bb-border px-4 sm:px-6 h-14 flex items-center">
        <button
          onClick={() => navigate(loginPath)}
          className="flex items-center gap-2 text-bb-muted hover:text-bb-text"
        >
          <span aria-hidden="true">←</span>
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-7 object-contain"
          />
          <span className="font-bold">
            Blood<span className="text-bb-crimson-bright">Bridge</span>
          </span>
        </button>
      </nav>
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <p className="font-mono text-xs uppercase tracking-widest text-bb-muted mb-3">
              Join the Network
            </p>
            <h1 className="text-3xl font-bold text-bb-text">
              Register as a{" "}
              <span className="text-gradient-crimson">{roleNames[role]}</span>
            </h1>
          </div>
          <form
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-6 sm:p-8 space-y-5"
          >
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {input("name", "Name")}
            {input("email", "Email Address", "email")}
            {input("phone", "Phone")}
            {input("password", "Password", "password")}
            {role === "HOSPITAL" && input("hospitalName", "Hospital Name")}
            {role === "DONOR" && (
              <label className="block text-sm font-semibold text-bb-text">
                Blood Group
                <select
                  value={form.bloodGroup}
                  onChange={(event) => update("bloodGroup", event.target.value)}
                  required
                  className="mt-2 w-full rounded-xl border border-bb-border bg-white px-4 py-3 text-sm"
                >
                  <option value="">Select blood group</option>
                  {(
                    [
                      "A+",
                      "A-",
                      "B+",
                      "B-",
                      "AB+",
                      "AB-",
                      "O+",
                      "O-",
                    ] as BloodGroup[]
                  ).map((group) => (
                    <option key={group}>{group}</option>
                  ))}
                </select>
              </label>
            )}
            <LocationPicker onLocationChange={handleLocationChange} />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-bb-crimson px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
            <p className="text-center text-sm text-bb-dim">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate(loginPath)}
                className="font-semibold text-bb-crimson"
              >
                Login
              </button>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
