import { Then } from '@cucumber/cucumber';
import type { AppWorld } from '../world';

Then(
  'the focused task name and composer actions fit above the keyboard',
  async function (this: AppWorld) {
    await this.page.setViewportSize({ width: 390, height: 400 });
    await this.page.waitForFunction(() => {
      const composer = document.querySelector('[data-task-composer]');
      const action = composer?.querySelector('[data-composer-action]');
      return (
        action &&
        document.activeElement === composer?.querySelector('textarea') &&
        action.getBoundingClientRect().bottom <= window.innerHeight
      );
    });
  },
);
