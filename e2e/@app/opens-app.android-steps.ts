import assert from 'node:assert/strict';
import { Then } from '@cucumber/cucumber';
import { AppWorld } from '../world';

Then('I see the FreeZen heading', async function (this: AppWorld) {
  const heading = this.page.getByRole('heading', {
    name: 'FreeZen',
    exact: true,
  });
  await heading.waitFor({ state: 'visible' });
  assert.equal(await heading.count(), 1);
});
