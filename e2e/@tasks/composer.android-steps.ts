import { Then } from '@cucumber/cucumber';
import { composerName } from './task.shared';
import type { AppWorld } from '../world';
import { initialViewportHeights } from './composer.shared';

Then(
  'the focused task name and composer actions fit above the keyboard',
  async function (this: AppWorld) {
    const fullHeight = initialViewportHeights.get(this);
    if (!fullHeight)
      throw new Error(
        'Missing the viewport height before opening the keyboard',
      );
    await composerName(this.page).tap();
    await this.page.waitForFunction((height) => {
      const viewport = window.visualViewport;
      const composer = document.querySelector('[data-task-composer]');
      const action = composer?.querySelector('[data-composer-action]');
      return (
        viewport &&
        viewport.height < height - 120 &&
        composer &&
        action &&
        document.activeElement === composer.querySelector('textarea') &&
        action.getBoundingClientRect().bottom <=
          viewport.offsetTop + viewport.height
      );
    }, fullHeight);
  },
);
