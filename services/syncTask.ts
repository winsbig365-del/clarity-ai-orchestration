import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { flushSyncQueue } from './sync';

const SYNC_TASK_NAME = 'CLARITY_SYNC_TASK';

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const result = await flushSyncQueue();
    const hasWork = result.success > 0 || result.failed > 0;
    return hasWork ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerSyncTask(): Promise<boolean> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME);
    if (isRegistered) return true;

    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    return true;
  } catch {
    return false;
  }
}

export async function unregisterSyncTask(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
  } catch {
    // Task may not be registered
  }
}