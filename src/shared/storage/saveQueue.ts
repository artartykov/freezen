export function createSaveQueue(
  save: (data: string) => Promise<void>,
  onError: (error: unknown) => void,
) {
  let pending: string | undefined;
  let saving = false;
  let running: Promise<void> = Promise.resolve();

  function report(error: unknown) {
    try {
      onError(error);
    } catch (reportError) {
      console.error(reportError);
    }
  }

  async function drain() {
    saving = true;

    try {
      while (pending !== undefined) {
        const data = pending;
        pending = undefined;

        try {
          await save(data);
        } catch (error) {
          report(error);
        }
      }
    } finally {
      saving = false;
    }
  }

  return {
    enqueue(data: string) {
      pending = data;
      if (!saving) running = drain();
    },
    settled() {
      return running;
    },
  };
}
