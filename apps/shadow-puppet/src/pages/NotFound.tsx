import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'hsl(25 40% 6%)' }}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl theater-title">四零四</h1>
        <p className="mb-4 text-xl text-muted-foreground font-song">此路不通</p>
        <a href="/" className="text-gold underline hover:text-gold/80 font-song">
          返回首页
        </a>
      </div>
    </div>
  );
};

export default NotFound;
