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
}

const STORAGE_KEY = 'recall_xp_wallet';

const DEFAULT_WALLET: XpWallet = {
  balance: 250, // Starting bonus so learners can try the cheerleader shop right away!
  totalEarned: 250,
  unlockedCompanions: ['founder'],
  inventory: {
    streak_freeze: 1,
    double_xp_potion: 0
  },
  transactions: [
    {
      id: 'tx_init',
      amount: 250,
      type: 'earn',
      reason: 'Welcome Starter Bonus 🎁',
      timestamp: new Date().toISOString()
    }
  ]
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
      return {
        ...DEFAULT_WALLET,
        ...parsed,
        inventory: { ...DEFAULT_WALLET.inventory, ...(parsed.inventory || {}) },
        unlockedCompanions: parsed.unlockedCompanions || ['founder']
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

  public awardXp(amount: number, reason: string): number {
    if (amount <= 0) return this.getBalance();
    const wallet = this.getWallet();
    const newBalance = wallet.balance + amount;
    const newTotal = wallet.totalEarned + amount;
    const tx: XpTransaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      amount,
      type: 'earn',
      reason,
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
