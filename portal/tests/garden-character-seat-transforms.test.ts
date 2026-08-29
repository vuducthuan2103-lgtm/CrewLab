import { describe, expect, it } from 'vitest';
import { GARDEN_CHARACTER_SEAT_TRANSFORMS } from '@/features/virtual-office/config/office-layout';
import type { AgentCode } from '@/features/virtual-office/types/office';

const AGENT_CODES: AgentCode[] = ['A01', 'B02', 'B03', 'D01', 'D02', 'E01'];

describe('garden office seated character transforms', () => {
  it.each(AGENT_CODES)('%s faces its keyboard from the measured chair centre', (code) => {
    const transform = GARDEN_CHARACTER_SEAT_TRANSFORMS[code];
    const toKeyboardX = transform.keyboardOffset[0] - transform.seatOffset[0];
    const toKeyboardZ = transform.keyboardOffset[1] - transform.seatOffset[1];
    const distance = Math.hypot(toKeyboardX, toKeyboardZ);
    const facingX = Math.sin(transform.rotationY);
    const facingZ = Math.cos(transform.rotationY);
    const alignment = (facingX * toKeyboardX + facingZ * toKeyboardZ) / distance;

    expect(distance).toBeGreaterThan(1.15);
    expect(alignment).toBeGreaterThan(0.999);
  });

  it('keeps the four diagonal stations mirrored around the office centre', () => {
    expect(GARDEN_CHARACTER_SEAT_TRANSFORMS.B02.seatOffset[0]).toBeCloseTo(-GARDEN_CHARACTER_SEAT_TRANSFORMS.B03.seatOffset[0], 4);
    expect(GARDEN_CHARACTER_SEAT_TRANSFORMS.B02.seatOffset[1]).toBeCloseTo(GARDEN_CHARACTER_SEAT_TRANSFORMS.B03.seatOffset[1], 4);
    expect(GARDEN_CHARACTER_SEAT_TRANSFORMS.D01.seatOffset[0]).toBeCloseTo(-GARDEN_CHARACTER_SEAT_TRANSFORMS.E01.seatOffset[0], 4);
    expect(GARDEN_CHARACTER_SEAT_TRANSFORMS.D01.seatOffset[1]).toBeCloseTo(GARDEN_CHARACTER_SEAT_TRANSFORMS.E01.seatOffset[1], 4);
  });
});
