import { useNavigate } from "react-router-dom";


export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bb-network-bg flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md glass rounded-3xl p-8 sm:p-12 shadow-2xl border border-bb-border">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl bg-red-100/80 text-bb-crimson">
          <span className="text-4xl font-extrabold">404</span>
        </div>
        <h1 className="text-2xl font-bold text-bb-text sm:text-3xl">Page Not Found</h1>
        <p className="mt-3 text-sm text-bb-muted">
          The requested page route does not exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 inline-flex w-full justify-center rounded-xl bg-bb-crimson px-5 py-3 text-sm font-semibold text-white transition hover:bg-bb-crimson-bright shadow-md"
        >
          Return to Safety
        </button>
      </div>
    </div>
  );
}
