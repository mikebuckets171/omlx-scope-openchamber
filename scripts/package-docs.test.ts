import { expect, test } from 'bun:test';
import { missingPackageLinks } from './package-docs.ts';
const files = new Set(['README.md', 'LICENSE', 'docs/METRICS.md', 'docs/With spaces.md']);

test('packaged documentation resolves paths from the linking document', () => {
  expect(missingPackageLinks('README.md', '[Metrics](docs/METRICS.md#rates)', files)).toEqual([]);
  expect(missingPackageLinks('docs/METRICS.md', '[Home](../README.md) · [License](../LICENSE)', files)).toEqual([]);
});
test('unshipped source documents and images fail validation', () => {
  expect(missingPackageLinks('README.md', '[Setup](docs/RELEASING.md) ![Preview](local.png)', files)).toEqual(['docs/RELEASING.md', 'local.png']);
});
test('remote URLs, mail and anchors do not become local file claims', () => {
  expect(missingPackageLinks('README.md', '[Guide](https://example.org/a) [Email](mailto:a@example.org) [Top](#top)', files)).toEqual([]);
});
test('reference links and encoded filenames are checked', () => {
  expect(missingPackageLinks('README.md', '[Guide][g]\n[g]: docs/With%20spaces.md\n[x]: missing.md', files)).toEqual(['missing.md']);
});
test('malformed paths and paths outside the package are rejected', () => {
  expect(missingPackageLinks('README.md', '[x](../../private) [y](file:///tmp/a) [z](%XX)', files)).toEqual(['../../private', 'file:///tmp/a', '%XX']);
});
test('fenced code examples are not mistaken for documentation links', () => {
  expect(missingPackageLinks('README.md', '```md\n[Example](unshipped.md)\n```', files)).toEqual([]);
});
