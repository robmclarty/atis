import { expect, test } from 'vitest';

import { CORE } from '../index.js';

test('core smoke', () => {
  expect(CORE).toBe('core');
});
