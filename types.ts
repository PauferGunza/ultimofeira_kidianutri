export interface UserProfile {
  id?: number;
  name?: string;
  email?: string;
  diabetes: boolean;
  hypertension: boolean;
  weightLoss: boolean;
  weeklyGoal?: 'lose' | 'gain' | 'maintain' | 'control';
  targetWeight?: number;
  currentWeight?: number;
}

export type AppView = 'login' | 'signup' | 'dashboard' | 'mealplan' | 'history' | 'profile' | 'settings' | 'premium';
