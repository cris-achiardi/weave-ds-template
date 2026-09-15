/** One registry for repository-wide backend readers and parity checks. */
export const BACKENDS = ['react', 'vue', 'angular', 'wc'].map((framework) => ({
  framework,
  dir: `packages/${framework}`,
  suffix: `.${framework}.json`,
}));
