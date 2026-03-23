import { Route, Routes } from 'react-router-dom';
import { AdminPage } from './components/AdminPage';
import { HomePage } from './components/HomePage';
import { InvitePage } from './components/InvitePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
