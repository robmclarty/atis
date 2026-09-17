import { expect, test } from 'vitest';

import { SCHEMA_VERSION } from '../index.js';

test('core owns the map.json schema version', () => {
  expect(SCHEMA_VERSION).toBe(1);
});
