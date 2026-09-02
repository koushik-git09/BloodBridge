import { useState } from 'react';
import type { Page } from './types';
import LandingPage from './pages/LandingPage';
import RoleSelectorPage from './pages/RoleSelectorPage';
import HospitalDashboard from './pages/HospitalDashboard';
import BloodBankDashboard from './pages/BloodBankDashboard';
import DonorDashboard from './pages/DonorDashboard';

export default function App() {
  const [page, setPage] = useState<Page>('landing');

  const navigate = (p: Page) => setPage(p);

  return (
    <div className="h-full">
      {page === 'landing' && <LandingPage onNavigate={navigate} />}
      {page === 'role-select' && <RoleSelectorPage onNavigate={navigate} />}
      {page === 'hospital' && <HospitalDashboard onNavigate={navigate} />}
      {page === 'blood-bank' && <BloodBankDashboard onNavigate={navigate} />}
      {page === 'donor' && <DonorDashboard onNavigate={navigate} />}
    </div>
  );
}
