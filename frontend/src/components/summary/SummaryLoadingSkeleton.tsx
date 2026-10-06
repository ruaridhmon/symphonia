import { createElement } from 'react';
import { useAuth } from '../../AuthContext';
import SummaryHeader from './SummaryHeader';
import { renderConsultationLoading } from '../../utils/consultationLoading';

export default function SummaryLoadingSkeleton() {
  const { user, logout, role } = useAuth();
  return renderConsultationLoading(createElement, createElement(SummaryHeader, {
    email: user?.email || '', viewers: [], onLogout: logout, showAdminLinks: role === 'platform_admin',
  }));
}
