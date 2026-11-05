import { uiScaleService } from './uiScale';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface TelemetryPayload {
  event_type: string;
  path?: string;
  payload?: Record<string, any>;
  device_info?: Record<string, any>;
}

class TelemetryService {
  private isInitialized = false;

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Track unhandled JavaScript errors
    window.addEventListener('error', (event: ErrorEvent) => {
      this.trackEvent('CLIENT_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.slice(0, 500)
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      this.trackEvent('CLIENT_PROMISE_ERROR', {
        message: typeof reason === 'string' ? reason : reason?.message || 'Unhandled Promise Rejection',
        stack: reason?.stack?.slice(0, 500)
      });
    });

    // Track initial session start
    this.trackEvent('SESSION_START', {
      referrer: document.referrer || 'direct',
      current_scale: uiScaleService.getScale()
    });
  }

  public getDeviceInfo(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    return {
      screen: `${window.innerWidth}x${window.innerHeight}`,
      pixel_ratio: window.devicePixelRatio || 1,
      userAgent: navigator.userAgent.slice(0, 150),
      online: navigator.onLine,
      ui_scale: uiScaleService.getScale()
    };
  }

  public trackEvent(eventType: string, details?: Record<string, any>): void {
    try {
      const token = localStorage.getItem('recall_auth_token');
      const guestId = localStorage.getItem('recall_guest_id');
      const founderPasscode = localStorage.getItem('recall_founder_passcode');

      const path = typeof window !== 'undefined' ? window.location.pathname : '/';
      const body = JSON.stringify({
        event_type: eventType.toUpperCase(),
        path,
        payload: details || {},
        device_info: this.getDeviceInfo()
      });

      const endpoint = `${API_BASE}/telemetry/log`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (guestId) headers['X-User-Id'] = guestId;
      if (founderPasscode) headers['X-Founder-Passcode'] = founderPasscode;

      // Non-blocking fire-and-forget fetch
      fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        keepalive: true
      }).catch(() => {
        // Silently swallow network errors so client never breaks
      });
    } catch {
      // Swallowed
    }
  }
}

export const telemetry = new TelemetryService();
