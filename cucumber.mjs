const shared = {
  paths: ['e2e/@*/*.feature'],
  format: ['progress'],
  strict: true,
};

export default {};

export const browser = {
  ...shared,
  parallel: 4,
  tags: 'not @todo',
  import: ['e2e/common.steps.ts', 'e2e/@*/*.steps.ts'],
};

export const android = {
  ...shared,
  tags: '@android and not @todo',
  import: ['e2e/common.android-steps.ts', 'e2e/@*/*.android-steps.ts'],
};
