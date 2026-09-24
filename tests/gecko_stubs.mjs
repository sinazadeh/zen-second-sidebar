// Minimal stand-ins for the Gecko globals that some modules under
// src/second_sidebar/ read as soon as they're imported (e.g. static class
// fields in wrappers/). Import this before any module under test. Anything
// a test actually exercises beyond that should be stubbed in the test
// itself, so a missing stub fails loudly instead of silently passing.

const DEFAULT_USER_CONTEXT_ID = 0;

globalThis.Services ??= {
  scriptSecurityManager: { DEFAULT_USER_CONTEXT_ID },
};

// Cc["@mozilla.org/..."].getService(...) / Ci.nsIFoo at import time.
globalThis.Cc ??= new Proxy({}, { get: () => ({ getService: () => ({}) }) });
globalThis.Ci ??= new Proxy({}, { get: () => ({}) });

export { DEFAULT_USER_CONTEXT_ID };
