export {};

declare global {
  interface Window {
    Android?: {
      signInWithGoogle(): void;

      scheduleReminder(
        id: string,
        title: string,
        message: string,
        scheduledAtMillis: number
      ): void;
    };
  }
}
