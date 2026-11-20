import { Then, When } from '@cucumber/cucumber';
import type { AppWorld } from '../world';
import { taskComposer } from './task.shared';

When(
  'I create and select {string} in the waiting contact picker',
  async function (this: AppWorld, name: string) {
    await taskComposer(this.page)
      .getByRole('button', { name: 'for Someone' })
      .click();
    const picker = this.page.getByRole('dialog', {
      name: 'Waiting for',
      exact: true,
    });
    await picker
      .getByRole('textbox', { name: 'Search or create contact…' })
      .fill(name);
    await picker.getByRole('button', { name: `New Contact "${name}"` }).click();
  },
);

Then(
  'the Waiting list shows {string}',
  async function (this: AppWorld, label: string) {
    await this.page.getByText(label, { exact: true }).waitFor();
  },
);

When(
  'I rename the waiting contact {string} to {string} from {string}',
  async function (
    this: AppWorld,
    name: string,
    nextName: string,
    title: string,
  ) {
    const page = this.page;
    page.setDefaultTimeout(8000);
    await page.getByRole('main').getByRole('button', { name: title }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    await editor.getByRole('button', { name, exact: true }).click();
    const picker = page.getByRole('dialog', {
      name: 'Waiting for',
      exact: true,
    });
    await picker
      .getByRole('button', { name: 'Manage Contacts', exact: true })
      .click();
    await picker.getByRole('menuitem', { name: 'Manage Contacts' }).click();
    const manage = page.getByRole('dialog', {
      name: 'Manage Contacts',
      exact: true,
    });
    await manage.getByRole('button', { name: new RegExp(name) }).click();
    const form = page.getByRole('dialog', {
      name: 'Edit Contact',
      exact: true,
    });
    await form.getByRole('textbox').fill(nextName);
    await form.getByRole('button', { name: 'Save', exact: true }).click();
    await manage.getByRole('button', { name: 'Back', exact: true }).click();
    await picker
      .getByRole('checkbox', { name: nextName, checked: true })
      .waitFor();
    await picker.getByRole('button', { name: 'Cancel', exact: true }).click();
    await editor.getByRole('button', { name: 'Back', exact: true }).click();
  },
);

When(
  'I move {string} to Waiting for a new contact named {string}',
  async function (this: AppWorld, title: string, name: string) {
    const page = this.page;
    page.setDefaultTimeout(8000);
    await page.getByRole('main').getByRole('button', { name: title }).click();
    const editor = page.getByRole('dialog', { name: 'To-do', exact: true });
    await editor.getByRole('button', { name: 'Inbox', exact: true }).click();
    const move = page.getByRole('dialog', { name: 'Move', exact: true });
    await move.getByRole('radio', { name: 'Waiting', exact: true }).click();
    const picker = page.getByRole('dialog', {
      name: 'Waiting for',
      exact: true,
    });
    await picker
      .getByRole('textbox', { name: 'Search or create contact…' })
      .fill(name);
    await picker.getByRole('button', { name: `New Contact "${name}"` }).click();
    await move.getByRole('button', { name: 'Save', exact: true }).click();
    await editor.getByRole('button', { name: 'Back', exact: true }).click();
  },
);
