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

export interface ScanResult {
  itemName: string;
  isFood: boolean;
  calories: string;
  glycemicImpact: 'Baixo' | 'Médio' | 'Alto' | 'N/A';
  carbs: string;
  sodium: string;
  vitamins: string;
  kidiaAdvice: string;
  safetyAlert: string;
  timestamp?: string;
}

export type AppView = 'login' | 'signup' | 'dashboard' | 'mealplan' | 'history' | 'profile' | 'settings' | 'scanning' | 'results' | 'premium' | 'chat';
