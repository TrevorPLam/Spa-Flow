/// <reference types="vitest/globals" />

declare var global: {
  fetch: typeof globalThis.fetch;
};
