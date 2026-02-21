// Global loading state manager
class LoadingStateManager {
  private listeners: Set<(isLoading: boolean) => void> = new Set();
  private activeRequests = 0;

  subscribe(listener: (isLoading: boolean) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const isLoading = this.activeRequests > 0;
    this.listeners.forEach((listener) => listener(isLoading));
  }

  startLoading() {
    this.activeRequests++;
    this.notify();
  }

  stopLoading() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.notify();
  }

  reset() {
    this.activeRequests = 0;
    this.notify();
  }

  getActiveRequests() {
    return this.activeRequests;
  }
}

export const loadingStateManager = new LoadingStateManager();
