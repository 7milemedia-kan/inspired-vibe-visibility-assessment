import { createRoot } from 'react-dom/client';
import Home from './app/page';
import './app/globals.css';
import AdminDashboard from './components/admin-dashboard';

createRoot(document.getElementById('root')!).render(window.location.pathname.replace(/\/$/, '') === '/admin' ? <AdminDashboard /> : <Home />);
