import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm border border-border bg-card text-center">
        <div className="brand-bar h-[3px]" />
        <div className="p-8">
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Página no encontrada</h1>
          <Link
            to="/"
            className="mt-6 inline-flex h-10 items-center bg-primary px-5 text-xs font-medium uppercase tracking-wider text-primary-foreground hover:bg-primary-hover"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
