import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import PortalLayout from '../components/layout/PortalLayout';

// Mock usePortal
vi.mock('@/lib/store', () => ({
  usePortal: () => ({
    clientName: 'Bardinh Coffee',
    portalUserEmail: 'test@crewlab.vn',
    brandLogoUrl: 'https://example.com/bardinh-logo.png',
    notifications: [],
    unreadCount: 0,
    error: null,
    isLoading: false,
    refreshData: vi.fn(),
    markNotificationRead: vi.fn(),
    uploadBrandLogo: vi.fn(),
    setBrandLogoUrl: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Hover-to-Expand & Clean Sidebar Tests', () => {
  it('starts in compact mode and expands when mouse hovers over sidebar', () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-[68px]');

    // Hover over sidebar
    fireEvent.mouseEnter(sidebar);
    expect(sidebar).toHaveClass('w-60');

    // Should display CrewLab project logo image & text
    expect(screen.getByAltText('CrewLab Logo')).toBeInTheDocument();
    expect(screen.getByText('Crew')).toBeInTheDocument();
    expect(screen.getByText('Lab')).toBeInTheDocument();
    expect(screen.getByText('Công việc')).toBeInTheDocument();

    // Mouse leaves sidebar
    fireEvent.mouseLeave(sidebar);
    expect(sidebar).toHaveClass('w-[68px]');
  });

  it('automatically collapses when a navigation tab is clicked', () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole('complementary');

    // Hover to open
    fireEvent.mouseEnter(sidebar);
    expect(sidebar).toHaveClass('w-60');

    // Click on "Kế hoạch" tab
    const planTab = screen.getByText('Kế hoạch');
    fireEvent.click(planTab);

    // Sidebar should immediately collapse
    expect(sidebar).toHaveClass('w-[68px]');
  });

  it('renders PortalLayout with spacious main content area and Header with store branding in user menu', () => {
    render(
      <PortalLayout>
        <div>Content Area</div>
      </PortalLayout>
    );

    expect(screen.getByText('Content Area')).toBeInTheDocument();
    expect(screen.getByText('Bardinh Coffee')).toBeInTheDocument();
    expect(document.getElementById('header-sidebar-toggle-btn')).toBeNull();
  });
});
