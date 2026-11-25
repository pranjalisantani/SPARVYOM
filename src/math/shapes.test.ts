import { describe, it, expect } from 'vitest';
import { generateShapeCoordinates } from './shapes';
import { SHAPE_SEQUENCE } from '../config/palettes';

describe('Parametric Shape Generators', () => {
  const TEST_COUNT = 1024;

  SHAPE_SEQUENCE.forEach((shape) => {
    it(`should generate valid coordinates for ${shape}`, () => {
      const coords = generateShapeCoordinates(shape, TEST_COUNT);
      expect(coords).toBeInstanceOf(Float32Array);
      expect(coords.length).toBe(TEST_COUNT * 4);

      let hasNaN = false;
      let hasInfinity = false;

      for (let i = 0; i < coords.length; i++) {
        if (Number.isNaN(coords[i])) hasNaN = true;
        if (!Number.isFinite(coords[i])) hasInfinity = true;
      }

      expect(hasNaN).toBe(false);
      expect(hasInfinity).toBe(false);
    });
  });
});
