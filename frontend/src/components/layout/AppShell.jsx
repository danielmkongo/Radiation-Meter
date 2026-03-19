import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { alertsApi } from '../../api/api';
import { POLL_INTERVAL } from '../../utils/constants';

export default function AppShell() {
  const [alertCount, setAlertCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function fetchAlerts() {
      alertsApi.unreadCount()
        .then((r) => { if (!cancelled) setAlertCount(r.data.data?.total || 0); })
        .catch(() => {});
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-page)' }}>
      <Sidebar alertCount={alertCount} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          alertCount={alertCount}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto w-full animate-fade-in">
            <Outlet context={{ refreshKey }} />
          </div>
        </main>
      </div>
    </div>
  );
}
