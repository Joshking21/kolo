import { Link } from 'react-router';
import { useAuth } from '../lib/auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { PublicLayout } from '../components/layout/PublicLayout';

export function NotFound() {
  const { status } = useAuth();
  const target = status === 'authenticated' ? '/app' : '/';

  return (
    <PublicLayout>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="font-mono text-[56px] font-bold text-primary mb-2">
          404
        </span>
        <h1 className="text-[28px] font-[650] font-display text-ink mb-2">
          Page not found
        </h1>
        <p className="text-[15px] text-muted max-w-sm mb-6 leading-relaxed">
          The page you're looking for doesn't exist, has been removed, or has moved.
        </p>
        <Link to={target}>
          <Button size="md">
            {status === 'authenticated' ? 'Back to Dashboard' : 'Back to Home'}
          </Button>
        </Link>
      </div>
    </PublicLayout>
  );
}
