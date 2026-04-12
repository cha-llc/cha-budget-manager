import { create } from 'zustand';

interface Budget {
  id?: string;
  division: string;
  monthly_budget: number;
}

interface Expense {
  id?: string;
  division: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface Revenue {
  id?: string;
  product_name: string;
  amount: number;
  source: string;
  date: string;
}

interface BudgetStore {
  budgets: Budget[];
  expenses: Expense[];
  revenue: Revenue[];
  setBudgets: (budgets: Budget[]) => void;
  setExpenses: (expenses: Expense[]) => void;
  setRevenue: (revenue: Revenue[]) => void;
  addBudget: (budget: Budget) => void;
  addExpense: (expense: Expense) => void;
  addRevenue: (rev: Revenue) => void;
  getDivisionSpent: (division: string) => number;
  getDivisionRemaining: (division: string) => number;
  getTotalRevenue: () => number;
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  budgets: [],
  expenses: [],
  revenue: [],

  setBudgets: (budgets) => set({ budgets }),
  setExpenses: (expenses) => set({ expenses }),
  setRevenue: (revenue) => set({ revenue }),

  addBudget: (budget) => set((state) => ({
    budgets: [...state.budgets, budget]
  })),

  addExpense: (expense) => set((state) => ({
    expenses: [...state.expenses, expense]
  })),

  addRevenue: (rev) => set((state) => ({
    revenue: [...state.revenue, rev]
  })),

  getDivisionSpent: (division) => {
    const state = get();
    return state.expenses
      .filter(e => e.division === division)
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getDivisionRemaining: (division) => {
    const state = get();
    const budget = state.budgets.find(b => b.division === division);
    if (!budget) return 0;
    const spent = state.expenses
      .filter(e => e.division === division)
      .reduce((sum, e) => sum + e.amount, 0);
    return Math.max(0, budget.monthly_budget - spent);
  },

  getTotalRevenue: () => {
    const state = get();
    return state.revenue.reduce((sum, r) => sum + r.amount, 0);
  }
}));
