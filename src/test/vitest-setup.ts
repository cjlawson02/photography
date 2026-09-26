import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL: prefer async userEvent over fireEvent unless user-event cannot model the interaction.
afterEach(() => {
  cleanup();
});
