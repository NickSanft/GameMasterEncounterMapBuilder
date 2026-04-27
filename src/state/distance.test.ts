import { describe, it, expect } from 'vitest';
import {
  chebyshevDistance,
  alternatingDistance,
  euclideanDistance,
  gridDistance,
  formatDistance,
} from './distance.js';

describe('chebyshevDistance', () => {
  it('is 0 for no movement', () => {
    expect(chebyshevDistance(0, 0)).toBe(0);
  });

  it('uses max(|dx|, |dy|) — diagonals are free', () => {
    expect(chebyshevDistance(3, 0)).toBe(3);
    expect(chebyshevDistance(0, 5)).toBe(5);
    expect(chebyshevDistance(3, 4)).toBe(4);
    expect(chebyshevDistance(4, 4)).toBe(4);
  });

  it('is symmetric across sign', () => {
    expect(chebyshevDistance(-3, -4)).toBe(4);
    expect(chebyshevDistance(-3, 4)).toBe(4);
  });

  it('rounds fractional deltas to nearest integer', () => {
    expect(chebyshevDistance(2.4, 3.5)).toBe(4);
    expect(chebyshevDistance(2.6, 2.4)).toBe(3);
  });
});

describe('alternatingDistance', () => {
  it('is 0 for no movement', () => {
    expect(alternatingDistance(0, 0)).toBe(0);
  });

  it('counts orthogonal movement normally', () => {
    expect(alternatingDistance(5, 0)).toBe(5);
    expect(alternatingDistance(0, 3)).toBe(3);
  });

  it('alternates diagonals 1, 2, 1, 2, ... (5e optional rule)', () => {
    // Pure diagonal moves: 1 diagonal = 1, 2 = 3, 3 = 4, 4 = 6, 5 = 7
    expect(alternatingDistance(1, 1)).toBe(1);
    expect(alternatingDistance(2, 2)).toBe(3);
    expect(alternatingDistance(3, 3)).toBe(4);
    expect(alternatingDistance(4, 4)).toBe(6);
    expect(alternatingDistance(5, 5)).toBe(7);
  });

  it('handles mixed diagonal + straight legs', () => {
    // Move 3 right + 2 up: 2 diagonals (1+2=3) + 1 straight = 4
    expect(alternatingDistance(3, 2)).toBe(4);
    // Move 6 right + 2 up: 2 diagonals (3) + 4 straight = 7
    expect(alternatingDistance(6, 2)).toBe(7);
  });

  it('is symmetric across sign and axis', () => {
    expect(alternatingDistance(-3, 2)).toBe(alternatingDistance(3, 2));
    expect(alternatingDistance(2, 3)).toBe(alternatingDistance(3, 2));
  });
});

describe('Phase 115 — euclideanDistance', () => {
  it('is 0 for no movement', () => {
    expect(euclideanDistance(0, 0)).toBe(0);
  });

  it('reduces to orthogonal distance on cardinal moves', () => {
    expect(euclideanDistance(5, 0)).toBe(5);
    expect(euclideanDistance(0, 7)).toBe(7);
  });

  it('returns the rounded hypotenuse on diagonal moves', () => {
    // 3-4-5 right triangle is the canonical exact case.
    expect(euclideanDistance(3, 4)).toBe(5);
    // 1×1 diagonal = sqrt(2) ≈ 1.41 → rounds to 1
    expect(euclideanDistance(1, 1)).toBe(1);
    // 2×2 diagonal = sqrt(8) ≈ 2.83 → rounds to 3
    expect(euclideanDistance(2, 2)).toBe(3);
  });

  it('is symmetric across sign and axis', () => {
    expect(euclideanDistance(-3, -4)).toBe(5);
    expect(euclideanDistance(4, 3)).toBe(5);
  });
});

describe('gridDistance', () => {
  it('defaults to chebyshev', () => {
    expect(gridDistance(3, 3)).toBe(chebyshevDistance(3, 3));
    expect(gridDistance(3, 3)).toBe(3);
  });

  it('dispatches to the alternating rule when requested', () => {
    expect(gridDistance(3, 3, 'alternating')).toBe(4);
  });

  it('dispatches to the euclidean rule when requested', () => {
    // Three rules can disagree on the same delta: 3×4 box.
    // Chebyshev = max(3, 4) = 4; alternating = 3 diagonals (1+2+1) = 4 + 1 straight = 5;
    // euclidean = round(hypot(3, 4)) = 5.
    expect(gridDistance(3, 4, 'chebyshev')).toBe(4);
    expect(gridDistance(3, 4, 'alternating')).toBe(5);
    expect(gridDistance(3, 4, 'euclidean')).toBe(5);
  });

  it('falls back to chebyshev for an unknown rule string', () => {
    expect(gridDistance(3, 4, 'bogus' as never)).toBe(4);
  });
});

describe('formatDistance', () => {
  it('prints N sq for squares', () => {
    expect(formatDistance(0, 'squares', 5)).toBe('0 sq');
    expect(formatDistance(7, 'squares', 5)).toBe('7 sq');
    // feetPerSquare is ignored for squares
    expect(formatDistance(4, 'squares', 10)).toBe('4 sq');
  });

  it('multiplies cells by feetPerSquare for feet', () => {
    expect(formatDistance(0, 'feet', 5)).toBe('0 ft');
    expect(formatDistance(3, 'feet', 5)).toBe('15 ft');
    expect(formatDistance(4, 'feet', 10)).toBe('40 ft');
  });

  it('clamps non-finite/zero feetPerSquare to the 5e default (5 ft)', () => {
    expect(formatDistance(4, 'feet', 0)).toBe('20 ft');
    expect(formatDistance(4, 'feet', NaN)).toBe('20 ft');
    expect(formatDistance(4, 'feet', -3)).toBe('20 ft');
  });

  it('rounds fractional cell counts for display', () => {
    expect(formatDistance(3.4, 'squares', 5)).toBe('3 sq');
    expect(formatDistance(3.6, 'feet', 5)).toBe('20 ft');
  });
});
