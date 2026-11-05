export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'recall_theme';

class ThemeService {
  private currentTheme: ThemeMode = 'light';

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') {
        this.currentTheme = saved;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'dark';
      }
      this.applyTheme(this.currentTheme);
    }
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      this.applyTheme(theme);
      window.dispatchEvent(new CustomEvent('recall:theme-changed', { detail: theme }));
    }
  }

  public toggleTheme(): ThemeMode {
    const next = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }
}

export const themeService = new ThemeService();

