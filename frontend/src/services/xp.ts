export interface XpTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'spend';
  reason: string;
  timestamp: string;
}

export interface XpWallet {
  balance: number;
  totalEarned: number;
  unlockedCompanions: string[];
  inventory: Record<string, number>;
  transactions: XpTransaction[];
  doubleXpUntil?: number; // timestamp in ms
}

const STORAGE_KEY = 'recall_xp_wallet';

const DEFAULT_WALLET: XpWallet = {
  balance: 0,
  totalEarned: 0,
  unlockedCompanions: ['sydney', 'coach_harshit'],
  inventory: {
    streak_freeze: 0,
    double_xp_potion: 0,
    concept_coffee: 0
  },
  transactions: []
};

class XpService {
  private getWallet(): XpWallet {
    if (typeof window === 'undefined') return DEFAULT_WALLET;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        this.saveWallet(DEFAULT_WALLET);
        return DEFAULT_WALLET;
      }
      const parsed = JSON.parse(saved);
      // Clean legacy starter mock data so tester starts on a fresh barebone state
      if (parsed.balance === 250 && parsed.totalEarned === 250 && parsed.transactions?.length === 1 && parsed.transactions[0]?.id === 'tx_init') {
        this.saveWallet(DEFAULT_WALLET);
        return DEFAULT_WALLET;
      }
      return {
        ...DEFAULT_WALLET,
        ...parsed,
        inventory: { ...DEFAULT_WALLET.inventory, ...(parsed.inventory || {}) },
        unlockedCompanions: (parsed.unlockedCompanions || ['sydney']).map((id: string) => id === 'founder' ? 'sydney' : id)
      };
    } catch {
      return DEFAULT_WALLET;
    }
  }

  private saveWallet(wallet: XpWallet): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
      window.dispatchEvent(new CustomEvent('recall:xp-changed', { detail: wallet }));
    } catch {
      // ignore
    }
  }

  public getBalance(): number {
    return this.getWallet().balance;
  }

  public getTotalEarned(): number {
    return this.getWallet().totalEarned;
  }

  public getFullWallet(): XpWallet {
    return this.getWallet();
  }

  public isDoubleXpActive(): { active: boolean; secondsRemaining: number } {
    const wallet = this.getWallet();
    if (!wallet.doubleXpUntil) return { active: false, secondsRemaining: 0 };
    const diff = Math.max(0, Math.floor((wallet.doubleXpUntil - Date.now()) / 1000));
    return { active: diff > 0, secondsRemaining: diff };
  }

  public awardXp(amount: number, reason: string): number {
    if (amount <= 0) return this.getBalance();
    const doubleInfo = this.isDoubleXpActive();
    const finalAmount = doubleInfo.active ? amount * 2 : amount;
    const finalReason = doubleInfo.active ? `${reason} (2X XP Active! 🧪)` : reason;

    const wallet = this.getWallet();
    const newBalance = wallet.balance + finalAmount;
    const newTotal = wallet.totalEarned + finalAmount;
    const tx: XpTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount: finalAmount,
      type: 'earn',
      reason: finalReason,
      timestamp: new Date().toISOString()
    };
    wallet.balance = newBalance;
    wallet.totalEarned = newTotal;
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return newBalance;
  }

  public spendXp(amount: number, reason: string): boolean {
    const wallet = this.getWallet();
    if (wallet.balance < amount) return false;
    wallet.balance -= amount;
    const tx: XpTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount,
      type: 'spend',
      reason,
      timestamp: new Date().toISOString()
    };
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return true;
  }

  public isCompanionUnlocked(companionId: string): boolean {
    if (companionId === 'founder') return true;
    const wallet = this.getWallet();
    return wallet.unlockedCompanions.includes(companionId);
  }

  public unlockCompanion(companionId: string, cost: number, name?: string): boolean {
    const wallet = this.getWallet();
    if (this.isCompanionUnlocked(companionId)) return true;
    if (wallet.balance < cost) return false;
    
    wallet.balance -= cost;
    wallet.unlockedCompanions = [...new Set([...wallet.unlockedCompanions, companionId])];
    const tx: XpTransaction = {
      id: 'tx_' + Date.now(),
      amount: cost,
      type: 'spend',
      reason: `Unlocked ${name || companionId} in Cheerleader Shop`,
      timestamp: new Date().toISOString()
    };
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return true;
  }

  public getInventory(): Record<string, number> {
    return this.getWallet().inventory || {};
  }

  public hasStreakFreeze(): boolean {
    return (this.getInventory().streak_freeze || 0) > 0;
  }

  public useStreakFreeze(): boolean {
    const wallet = this.getWallet();
    if (!wallet.inventory || (wallet.inventory.streak_freeze || 0) <= 0) return false;
    wallet.inventory.streak_freeze = Math.max(0, wallet.inventory.streak_freeze - 1);
    const tx: XpTransaction = {
      id: 'tx_' + Date.now(),
      amount: 0,
      type: 'spend',
      reason: '🛡️ Streak Freeze Auto-Activated to Protect Streak',
      timestamp: new Date().toISOString()
    };
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return true;
  }

  public activateDoubleXp(): boolean {
    const wallet = this.getWallet();
    if (!wallet.inventory || (wallet.inventory.double_xp_potion || 0) <= 0) return false;
    wallet.inventory.double_xp_potion = Math.max(0, wallet.inventory.double_xp_potion - 1);
    wallet.doubleXpUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
    const tx: XpTransaction = {
      id: 'tx_' + Date.now(),
      amount: 0,
      type: 'spend',
      reason: '🧪 2X XP Booster Potion Activated (30 Minutes)',
      timestamp: new Date().toISOString()
    };
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return true;
  }

  public consumeItem(itemId: string): boolean {
    if (itemId === 'double_xp_potion') {
      return this.activateDoubleXp();
    }
    const wallet = this.getWallet();
    if (!wallet.inventory || (wallet.inventory[itemId] || 0) <= 0) return false;
    wallet.inventory[itemId] = Math.max(0, wallet.inventory[itemId] - 1);
    const tx: XpTransaction = {
      id: 'tx_' + Date.now(),
      amount: 0,
      type: 'spend',
      reason: `Used ${itemId} from Backpack`,
      timestamp: new Date().toISOString()
    };
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return true;
  }

  public buyItem(itemId: string, cost: number, itemName: string): boolean {
    const wallet = this.getWallet();
    if (wallet.balance < cost) return false;
    wallet.balance -= cost;
    wallet.inventory = wallet.inventory || {};
    wallet.inventory[itemId] = (wallet.inventory[itemId] || 0) + 1;
    const tx: XpTransaction = {
      id: 'tx_' + Date.now(),
      amount: cost,
      type: 'spend',
      reason: `Purchased ${itemName} in Shop`,
      timestamp: new Date().toISOString()
    };
    wallet.transactions = [tx, ...(wallet.transactions || [])].slice(0, 50);
    this.saveWallet(wallet);
    return true;
  }
}

export const xpService = new XpService();

