declare module '@rails/actioncable' {
  export interface Subscription {
    perform(action: string, data?: object): void;
    unsubscribe(): void;
  }
  export interface Consumer {
    subscriptions: {
      create(
        channel: string | { channel: string; [key: string]: unknown },
        mixin: {
          received?: (data: any) => void;
          connected?: () => void;
          disconnected?: () => void;
        },
      ): Subscription;
    };
    disconnect(): void;
  }
  export function createConsumer(url?: string): Consumer;
}
