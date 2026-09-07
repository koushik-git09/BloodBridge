import { useNavigate } from "react";
import { useAuth } from "../../hooks/useAuth";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-bb-border px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text.left text-bb-text transition hover:opacity-80"
        >
          <img
            src="/bloodbridge-logo.png"
            alt="BloodBridge logo"
            className="size-8 object-contain"
          />
          <div>
            <div className="font-bold leading-tight">
              Blood<span className="text-bb-crimson-bright">Bridge</span>
            </div>
            {title && (
              <div className="text-[10px] uppercase tracking-wider text-bb-muted">
                {title}
              </div>
            )}
          </div>
        </button>

        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-bb-text">{user.name}</p>
              <p className="text-xs font-medium text-bb-muted uppercase tracking-wider">
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-bb-border bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-bb-text transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
