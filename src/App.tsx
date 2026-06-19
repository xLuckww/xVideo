import { Sidebar } from './components/layout/Sidebar';
import { DownloadPage } from './pages/DownloadPage';
import { BatchPage } from './pages/BatchPage';
import { HistoryPage } from './pages/HistoryPage';
import { SubtitlePage } from './pages/SubtitlePage';
import { SettingsPage } from './pages/SettingsPage';
import { DonatePage } from './pages/DonatePage';
import { useAppStore } from './stores/useAppStore';

function App() {
  const currentPage = useAppStore((s) => s.currentPage);

  const renderPage = () => {
    switch (currentPage) {
      case 'download':
        return <DownloadPage />;
      case 'batch':
        return <BatchPage />;
      case 'history':
        return <HistoryPage />;
      case 'subtitle':
        return <SubtitlePage />;
      case 'settings':
        return <SettingsPage />;
      case 'donate':
        return <DonatePage />;
      default:
        return <DownloadPage />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-bg-secondary">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 32px 48px 32px' }}>
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;