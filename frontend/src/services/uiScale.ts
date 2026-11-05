export type UiScale = 'compact' | 'default' | 'cozy';

const SCALE_STORAGE_KEY = 'recall_ui_scale';

export interface ScaleMeta {
  key: UiScale;
  label: string;
  percent: string;
  fontSize: string;
  icon: string;
}

export const SCALE_CONFIGS: Record<UiScale, ScaleMeta> = {
  compact: { key: 'compact', label: 'Compact', percent: '88%', fontSize: '14px', icon: '🔍' },
  default: { key: 'default', label: 'Normal', percent: '100%', fontSize: '16px', icon: '📱' },
  cozy: { key: 'cozy', label: 'Cozy', percent: '115%', fontSize: '18px', icon: '✨' },
};

class UiScaleService {
  private currentScale: UiScale = 'default';

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SCALE_STORAGE_KEY) as UiScale | null;
      if (saved && (saved === 'compact' || saved === 'default' || saved === 'cozy')) {
        this.currentScale = saved;
      }
      this.applyScale(this.currentScale);
    }
  }

  public getScale(): UiScale {
    return this.currentScale;
  }

  public getMeta(): ScaleMeta {
    return SCALE_CONFIGS[this.currentScale];
  }

  public setScale(scale: UiScale): void {
    this.currentScale = scale;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SCALE_STORAGE_KEY, scale);
      this.applyScale(scale);
      window.dispatchEvent(new CustomEvent('recall:scale-changed', { detail: scale }));
    }
  }

  public cycleScale(): UiScale {
    const cycle: UiScale[] = ['compact', 'default', 'cozy'];
    const nextIdx = (cycle.indexOf(this.currentScale) + 1) % cycle.length;
    const next = cycle[nextIdx];
    this.setScale(next);
    return next;
  }

  private applyScale(scale: UiScale): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-ui-scale', scale);
      const config = SCALE_CONFIGS[scale];
      document.documentElement.style.fontSize = config.fontSize;
    }
  }
}

export const uiScaleService = new UiScaleService();
