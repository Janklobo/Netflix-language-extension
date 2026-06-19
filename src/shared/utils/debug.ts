const isDev = import.meta.env.DEV;

export function debug(context: string, ...args: unknown[]): void {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(`[LinguaFlix:${context}]`, ...args);
  }
}
