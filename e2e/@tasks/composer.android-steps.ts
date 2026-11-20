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
    const name = composerName(this.page);
    await name.scrollIntoViewIfNeeded();
    const bounds = await name.boundingBox();
    if (!bounds) throw new Error('The task name is not visible');
    const session = await this.page.context().newCDPSession(this.page);
    try {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        ],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    } finally {
      await session.detach();
    }
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
