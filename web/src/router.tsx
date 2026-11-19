import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router';
import { useAuth } from './lib/auth/AuthProvider';
import { AppShell } from './components/layout/AppShell';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Wallet } from './pages/Wallet';
import { Groups } from './pages/Groups';
import { GroupNew } from './pages/GroupNew';
import { GroupDetail } from './pages/GroupDetail';
import { Join } from './pages/Join';
import { LedgerTransaction } from './pages/LedgerTransaction';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { FakeCheckout } from './pages/FakeCheckout';
import { NotFound } from './pages/NotFound';

function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'anonymous') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const next = searchParams.get('next');
  const target = next && next.startsWith('/app') ? next : '/app';

  if (status === 'authenticated') {
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
    ],
  },
  {
    path: '/dev/fake-checkout',
    element: <FakeCheckout />,
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'wallet',
            element: <Wallet />,
          },
          {
            path: 'groups',
            element: <Groups />,
          },
          {
            path: 'groups/new',
            element: <GroupNew />,
          },
          {
            path: 'groups/:groupId',
            element: <GroupDetail />,
          },
          {
            path: 'join',
            element: <Join />,
          },
          {
            path: 'transactions/:transactionId',
            element: <LedgerTransaction />,
          },
          {
            path: 'notifications',
            element: <Notifications />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
