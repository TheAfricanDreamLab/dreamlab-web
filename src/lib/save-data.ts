import { useCallback, useSyncExternalStore } from 'react';

/*
 * Save data (LRN-9): a per-device choice, kept in this browser only. When it is on, videos start at the
 * lowest quality, load nothing until asked (not even the poster), offer the sound alone and open the
 * transcript first. Until someone chooses, it follows the phone's own data saver when the browser
 * shares it (Chrome on Android).
 */

const KEY = 'dreamlab:save-data';
const EVENT = 'dreamlab:save-data';

function read(): boolean {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    // Storage blocked (private mode, settings): fall back to the browser's hint.
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function setSaveData(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
    memory = null;
  } catch {
    // Not stored: it still applies until the page is closed.
    memory = on;
  }
  window.dispatchEvent(new Event(EVENT));
}

let memory: boolean | null = null;
const snapshot = () => memory ?? read();
const serverSnapshot = () => false;

/** Whether save data is on for this device, and a way to change it. Off while the page is server-rendered. */
export function useSaveData(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const set = useCallback((value: boolean) => setSaveData(value), []);
  return [on, set];
}
