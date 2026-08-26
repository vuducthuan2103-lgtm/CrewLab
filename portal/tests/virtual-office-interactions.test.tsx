import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficeCanvas } from '@/features/virtual-office/components/OfficeCanvas';
import { AgentFocusPopup } from '@/features/virtual-office/components/AgentFocusPopup';
import { useOfficeStore } from '@/features/virtual-office/state/office-store';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => <img {...props} alt={props.alt || ''} />,
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('Virtual Office interactions', () => {
  beforeEach(() => {
    push.mockReset();
    useOfficeStore.getState().selectAgent(null);
  });

  it('opens the live agent inspector from a campus hotspot and closes it', () => {
    render(<><OfficeCanvas /><AgentFocusPopup /></>);

    fireEvent.click(screen.getByTestId('office-agent-D02'));

    expect(screen.getByTestId('agent-focus-popup')).toHaveTextContent('Thiết kế Hình ảnh & Visual');
    expect(screen.getByText('Cần bạn xử lý')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông tin agent' }));
    expect(screen.queryByTestId('agent-focus-popup')).not.toBeInTheDocument();
  });
});
