/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { 
  ChevronRight, 
  Flame, 
  Camera, 
  History, 
  Calendar, 
  User, 
  Bell, 
  Check, 
  ArrowLeft,
  Image as ImageIcon,
  Sun,
  Moon,
  Coffee,
  Lightbulb,
  FlaskConical,
  Dumbbell,
  Bone,
  Loader2
} from 'lucide-react';

// --- Types ---
type Screen = 'welcome' | 'onboarding' | 'profile' | 'dashboard' | 'capture' | 'result' | 'login' | 'signup' | 'terms' | 'privacy';

interface Profile {
  id: string;
  label: string;
  desc: string;
  emoji: string;
}

const ONBOARDING_STEPS = [
  {
    title: "Comer bem com o que tens na mesa 🍽️",
    desc: "O NutriLens é o teu guia nutricional pessoal, criado para te ajudar a comer melhor com o que tens na mesa, prevenindo problemas como a anemia e fortalecendo a tua saúde.",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1000&auto=format&fit=crop",
    tag: "A NOSSA MISSÃO",
    tagColor: "text-[#d97706] bg-[#d97706]/20 border-[#d97706]/30"
  },
  {
    title: "Fotografa qualquer refeição",
    desc: "Usa a câmara ou galeria para analisar pratos angolanos e internacionais. A nossa equipa identifica os ingredientes e os nutrientes de forma instantânea.",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop",
    icon: Camera
  },
  {
    title: "Análise nutricional completa",
    desc: "Recebe calorias, proteínas, ferro, vitaminas e minerais. Sabe se o prato é bom contra a anemia, se é adequado para diabetes ou hipertensão.",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1000&auto=format&fit=crop",
    icon: Flame
  },
  {
    title: "Plano alimentar personalizado",
    desc: "Recebe sugestões de refeições angolanas e internacionais para cada momento do dia, baseadas nos teus objectivos e condições de saúde.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1000&auto=format&fit=crop",
    icon: Calendar
  }
];

const PROFILES: Profile[] = [
  { id: 'me', label: 'Para Mim', desc: 'Quero ter mais energia, controlar o peso e viver com saúde.', emoji: '👦' },
  { id: 'child', label: 'Para o meu Filho(a)', desc: 'Cuide da alimentação do seu filho e garanta que ele cresça forte e saudável.', emoji: '👶' },
  { id: 'grandparent', label: 'Para o meu Avô/Avó', desc: 'Dê mais qualidade de vida e vitalidade para quem você ama. Nutrição para um envelhecimento activo.', emoji: '👴' },
];

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Café da manhã', time: '7:00-10:00', ex: 'Papaia, pão, ovos', icon: Sun },
  { id: 'lunch', label: 'Almoço', time: '11:30-14:00', ex: 'Mufete, arroz e feijão', icon: Sun },
  { id: 'dinner', label: 'Jantar', time: '18:00-21:00', ex: 'Calulu, sopa', icon: Moon },
  { id: 'snack', label: 'Lanche', time: 'Qualquer hora', ex: 'Amendoim, fruta', icon: Coffee },
];

// --- Components ---

const ProgressBar = ({ progress, colorClass = "bg-primary" }: { progress: number, colorClass?: string }) => (
  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-2">
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={`h-full ${colorClass}`} 
    />
  </div>
);

const BottomNav = ({ active, onNavigate }: { active: string, onNavigate: (screen: Screen) => void }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-[#0a0c10]/90 backdrop-blur-md border-t border-gray-800 px-6 py-4 flex justify-between items-center z-50">
    <button onClick={() => onNavigate('dashboard')} className={`flex flex-col items-center gap-1 ${active === 'dashboard' ? 'text-primary' : 'text-gray-500'}`}>
      <span className="text-xs">Início</span>
      {active === 'dashboard' && <div className="w-1 h-1 bg-primary rounded-full" />}
    </button>
    <button className="flex flex-col items-center gap-1 text-gray-500">
      <History size={20} />
      <span className="text-[10px]">Histórico</span>
    </button>
    <div className="relative -mt-12">
      <button 
        onClick={() => onNavigate('capture')}
        className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-[#0a0c10]"
      >
        <Camera size={28} className="text-black" />
      </button>
    </div>
    <button className="flex flex-col items-center gap-1 text-gray-500">
      <Calendar size={20} />
      <span className="text-[10px]">Plano</span>
    </button>
    <button className="flex flex-col items-center gap-1 text-gray-500">
      <User size={20} />
      <span className="text-[10px]">Perfil</span>
    </button>
  </div>
);

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [scansToday, setScansToday] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const fetchUserData = async (userId: string) => {
    if (!supabase) return;
    try {
      // Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) setUserProfile(profile);

      // Fetch Scans for today
      const today = new Date().toISOString().split('T')[0];
      const { data: scans } = await supabase
        .from('scan_history')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today);
      
      if (scans) setScansToday(scans);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setErrorMessage('Aviso: Configuração do Supabase em falta. Adiciona VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nos Segredos.');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email || '');
        fetchUserData(session.user.id);
        setScreen('dashboard');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUserEmail(session.user.email || '');
        fetchUserData(session.user.id);
        setScreen('dashboard');
      } else {
        setScreen('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate = (next: Screen) => {
    setErrorMessage('');
    setScreen(next);
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMessage('Erro: Supabase não está configurado.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: fullName,
          profile_type: selectedProfile,
        }
      }
    });

    if (error) {
      setErrorMessage(error.message);
    } else if (data.user) {
      // Create profile record using the exact fields from your SQL
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: data.user.id, 
            email: email, 
            name: fullName, 
            profile_type: selectedProfile || 'self',
            daily_calorie_target: 2000,
            is_onboarded: true
          }
        ]);
      
      if (profileError) console.error('Error creating profile:', profileError);
      
      if (data.session) {
        navigate('dashboard');
      } else {
        setErrorMessage('Conta criada! Por favor, verifica o teu e-mail para confirmar.');
      }
    }
    setLoading(false);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMessage('Erro: Supabase não está configurado.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      navigate('dashboard');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('welcome');
  };

  const nextOnboardingStep = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(prev => prev + 1);
    } else {
      navigate('profile');
    }
  };

  const prevOnboardingStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(prev => prev - 1);
    } else {
      navigate('welcome');
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-dark-bg text-white shadow-2xl">
      <AnimatePresence mode="wait">
        
        {/* --- Welcome Screen --- */}
        {screen === 'welcome' && (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-screen bg-black"
          >
            <div className="relative h-[55%]">
              <img 
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" 
                alt="Healthy food" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dark-bg to-transparent" />
            </div>
            
            <div className="flex-1 bg-dark-bg px-8 pt-10 rounded-t-[40px] -mt-12 relative z-10 flex flex-col items-center">
              <div className="w-full">
                <div className="inline-block px-4 py-1.5 border border-primary text-primary rounded-full text-[10px] font-bold tracking-widest uppercase font-display mb-6">
                  Nutrição Personalizada
                </div>
                <h1 className="text-5xl font-bold font-display mb-4 text-white">NutriLens</h1>
                <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-[90%]">
                  O teu guia nutricional pessoal. Fotografa qualquer prato e descobre tudo sobre a tua alimentação.
                </p>
              </div>

              <div className="w-full space-y-4 mt-auto pb-12">
                <button 
                  onClick={() => { setOnboardingStep(0); navigate('onboarding'); }}
                  className="w-full py-4 bg-primary text-black font-extrabold rounded-full flex items-center justify-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  Começar a jornada <ChevronRight size={20} />
                </button>
                
                <button 
                  onClick={() => navigate('dashboard')}
                  className="w-full py-4 bg-transparent border border-gray-700 text-gray-400 font-bold rounded-full flex items-center justify-center gap-2 text-sm active:scale-95 transition-all hover:border-gray-600"
                >
                  <div className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-600 rounded-full" />
                  </div>
                  Testar sem conta (limitado)
                </button>

                <p className="text-center text-sm text-gray-400 pt-2">
                  Já tenho conta — <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('login')}>Entrar</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- Onboarding Screens --- */}
        {screen === 'onboarding' && (() => {
          const step = ONBOARDING_STEPS[onboardingStep];
          const Icon = step.icon;
          
          return (
            <motion.div 
              key={`onboarding-${onboardingStep}`}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className="flex flex-col h-screen bg-black overflow-y-auto"
            >
              <div className="relative shrink-0 h-[55%]">
                <img 
                  src={step.image} 
                  alt="Onboarding" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dark-bg to-transparent" />
                
                <button 
                  onClick={prevOnboardingStep}
                  className="absolute top-12 left-6 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
              
              <div className="flex-1 bg-dark-bg px-8 pt-10 rounded-t-[40px] -mt-12 relative z-10 flex flex-col items-center">
                <div className="w-full">
                  {step.tag ? (
                    <div className={`inline-block px-4 py-1.5 border rounded-full text-[10px] font-bold tracking-widest uppercase font-display mb-6 ${step.tagColor}`}>
                      {step.tag}
                    </div>
                  ) : Icon ? (
                    <div className="w-10 h-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mb-6">
                      <Icon size={22} />
                    </div>
                  ) : null}
                  
                  <h2 className="text-3xl font-bold font-display mb-4 text-white leading-tight">
                    {step.title}
                  </h2>
                  <p className="text-gray-400 text-base leading-relaxed mb-10">
                    {step.desc}
                  </p>
                </div>

                <div className="w-full mt-auto pb-12 flex flex-col items-center gap-8">
                  {/* Dots indicator */}
                  <div className="flex gap-2">
                    {ONBOARDING_STEPS.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${onboardingStep === idx ? 'w-8 bg-primary' : 'w-1.5 bg-gray-800'}`}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={nextOnboardingStep}
                    className="w-full py-4 bg-primary text-black font-extrabold rounded-full flex items-center justify-center gap-2 text-lg active:scale-95 transition-all shadow-lg shadow-primary/20"
                  >
                    {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Continuar' : 'Próximo'}
                    {onboardingStep < ONBOARDING_STEPS.length - 1 && <ChevronRight size={20} />}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* --- Login Screen --- */}
        {screen === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col h-screen px-8 pt-20 overflow-y-auto"
          >
            <button 
              onClick={() => navigate('welcome')}
              className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center mb-8 border border-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            
            <h1 className="text-4xl font-bold font-display mb-2">Bem-vindo de volta!</h1>
            <p className="text-gray-500 mb-10 text-lg">Faz login para continuar a cuidar da tua saúde.</p>
            
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl mb-6 text-sm">
                {errorMessage}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">Palavra-passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
                <p className="text-right text-xs text-primary font-bold cursor-pointer pt-1">Esqueci-me da senha</p>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-black font-extrabold rounded-full text-lg shadow-lg shadow-primary/20 mt-4 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
              </button>
            </form>

            <div className="mt-auto pb-12 pt-8 text-center">
              <p className="text-gray-500 text-sm">
                Não tens conta? <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('signup')}>Regista-te agora</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* --- Signup Screen --- */}
        {screen === 'signup' && (
          <motion.div 
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-screen px-8 pt-20 overflow-y-auto"
          >
            <button 
              onClick={() => navigate('login')}
              className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center mb-8 border border-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            
            <h1 className="text-4xl font-bold font-display mb-2">Cria a tua conta</h1>
            <p className="text-gray-500 mb-10 text-lg">Começa hoje a tua jornada para uma vida mais saudável.</p>
            
            {errorMessage && (
              <div className={`p-4 rounded-2xl mb-6 text-sm ${errorMessage.includes('confirmar') ? 'bg-primary/10 border border-primary/50 text-white' : 'bg-red-500/10 border border-red-500/50 text-red-500'}`}>
                {errorMessage}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSignUp}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">Nome completo</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="O teu nome"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 ml-1">Palavra-passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full p-4 bg-card-bg border border-gray-800 rounded-2xl focus:border-primary outline-none transition-colors"
                  required
                />
              </div>

              <div className="flex items-start gap-3 px-1">
                <button 
                  type="button"
                  onClick={() => setTermsAccepted(!termsAccepted)}
                  className={`flex items-center justify-center w-6 h-6 rounded border transition-colors mt-0.5 shrink-0 ${termsAccepted ? 'bg-primary border-primary' : 'bg-card-bg border-gray-700'}`}
                >
                  {termsAccepted && <Check size={14} className="text-black" />}
                </button>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ao criar uma conta, aceito os <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('terms')}>Termos de Uso</span> e a <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('privacy')}>Política de Privacidade</span> do NutriLens.
                </p>
              </div>

              <button 
                type="submit"
                disabled={loading || !termsAccepted}
                className={`w-full py-4 font-extrabold rounded-full text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  loading || !termsAccepted 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-primary text-black shadow-primary/20 active:scale-95'
                }`}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Registar conta'}
              </button>
            </form>

            <div className="mt-8 pb-12 text-center">
              <p className="text-gray-500 text-sm">
                Já tens conta? <span className="text-primary font-bold cursor-pointer hover:underline" onClick={() => navigate('login')}>Faz login</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* --- Terms of Use Screen --- */}
        {screen === 'terms' && (
          <motion.div 
            key="terms"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex flex-col h-screen px-8 pt-12 overflow-y-auto bg-dark-bg"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-display">Termos de Uso</h2>
              <button onClick={() => navigate('signup')} className="text-gray-500 font-bold">Fechar</button>
            </div>
            
            <div className="prose prose-invert max-w-none text-gray-400 text-sm space-y-6 pb-12">
              <section>
                <h3 className="text-white font-bold text-lg mb-2">1. Aceitação dos Termos</h3>
                <p>Ao utilizar o NutriLens, você concorda em cumprir e ficar vinculado a estes termos. O NutriLens é um guia nutricional baseado em IA e não substitui o aconselhamento médico profissional.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">2. Uso do Serviço</h3>
                <p>Você é responsável por manter a confidencialidade de sua conta. O serviço deve ser utilizado apenas para fins lícitos e de acordo com as leis de Angola e internacionais aplicáveis.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">3. Limitação de Responsabilidade</h3>
                <p>As análises nutricionais são estimativas geradas por inteligência artificial. Sempre consulte um nutricionista ou médico antes de fazer mudanças significativas em sua dieta.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">4. Propriedade Intelectual</h3>
                <p>Todo o conteúdo do aplicativo, incluindo logotipos e algoritmos, é propriedade exclusiva do NutriLens.</p>
              </section>
            </div>
          </motion.div>
        )}

        {/* --- Privacy Policy Screen --- */}
        {screen === 'privacy' && (
          <motion.div 
            key="privacy"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex flex-col h-screen px-8 pt-12 overflow-y-auto bg-dark-bg"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold font-display">Privacidade</h2>
              <button onClick={() => navigate('signup')} className="text-gray-500 font-bold">Fechar</button>
            </div>
            
            <div className="prose prose-invert max-w-none text-gray-400 text-sm space-y-6 pb-12">
              <section>
                <h3 className="text-white font-bold text-lg mb-2">1. Coleta de Dados</h3>
                <p>Coletamos seu nome, e-mail e fotos de refeições para processar a análise nutricional. Para personalizar o serviço, também coletamos dados de perfil como idade e objetivos.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">2. Uso de Imagens</h3>
                <p>As fotos dos pratos são processadas pela nossa IA para identificar alimentos e não são compartilhadas com terceiros fora do escopo funcional do serviço.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">3. Segurança</h3>
                <p>Utilizamos tecnologias de ponta e protocolos de segurança para garantir que seus dados pessoais permaneçam protegidos contra acesso não autorizado.</p>
              </section>
              <section>
                <h3 className="text-white font-bold text-lg mb-2">4. Seus Direitos</h3>
                <p>Você pode solicitar a exclusão de sua conta e de todos os seus dados a qualquer momento diretamente nas configurações do seu perfil.</p>
              </section>
            </div>
          </motion.div>
        )}

        {/* --- Profile Choice Screen --- */}
        {screen === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="flex flex-col h-screen px-8 pt-20 overflow-y-auto"
          >
            <div className="shrink-0">
              <h2 className="text-4xl font-bold font-display mb-2 flex items-center gap-3">
                Para quem vais cuidar hoje? 💚
              </h2>
              <p className="text-gray-400 mb-10 text-lg">
                Escolhe o perfil para personalizar as recomendações
              </p>
            </div>
            
            <div className="space-y-4 mb-12">
              {PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfile(p.id)}
                  className={`w-full p-5 rounded-3xl text-left transition-all border-2 flex items-start gap-4 ${
                    selectedProfile === p.id 
                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/10' 
                    : 'bg-card-bg border-transparent hover:border-gray-800'
                  }`}
                >
                  <span className="text-4xl shrink-0">{p.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className={`font-bold text-lg ${selectedProfile === p.id ? 'text-primary' : 'text-white'}`}>{p.label}</h3>
                      {selectedProfile === p.id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 leading-snug">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-auto pb-12 shrink-0">
              <button 
                disabled={!selectedProfile}
                onClick={() => navigate('signup')}
                className={`w-full py-4 rounded-full font-bold text-lg transition-all ${
                  selectedProfile 
                  ? 'bg-primary text-black active:scale-95' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continuar
              </button>
            </div>
          </motion.div>
        )}

        {/* --- Dashboard Screen --- */}
        {screen === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen pb-24 overflow-y-auto px-6 pt-12"
          >
            <header className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-bold font-display leading-tight flex items-center gap-2">
                  Olá, {userProfile?.name || userEmail.split('@')[0]} 👋
                </h2>
                <p className="text-gray-500">Sábado, 18 De Abril</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition-colors">
                  <User size={24} />
                </button>
                <div className="relative">
                  <Bell size={24} className="text-gray-400" />
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-bg" />
                </div>
              </div>
            </header>

            <section className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Flame className="text-orange-500" fill="currentColor" size={28} />
                <div>
                  <h4 className="font-bold text-sm">{userProfile?.current_streak || 0} Dias Seguidos Cuidando de Ti</h4>
                  <p className="text-xs text-primary">Continua assim — és incrível!</p>
                </div>
              </div>
              <button className="bg-primary text-black text-xs font-bold px-4 py-2 rounded-full">Manter</button>
            </section>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-card-bg p-4 rounded-2xl text-center flex flex-col items-center">
                <span className="text-2xl font-bold font-display">{scansToday.length}</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">🍽️ Refeições</span>
              </div>
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl text-center flex flex-col items-center">
                <span className="text-2xl font-bold font-display text-primary">
                  {scansToday.reduce((acc, s) => acc + (Number(s.calories) || 0), 0).toFixed(0)}
                </span>
                <span className="text-[10px] text-primary flex items-center gap-1 mt-1">🔥 kcal hoje</span>
              </div>
              <div className="bg-card-bg p-4 rounded-2xl text-center flex flex-col items-center">
                <div className="w-5 h-5 bg-red-500/20 rounded-full flex items-center justify-center mb-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </div>
                <span className="text-[10px] font-bold">Controlar</span>
                <span className="text-[10px] text-gray-500">Objectivo</span>
              </div>
            </div>

            <section className="bg-card-bg p-6 rounded-3xl mb-8 border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">Calorias hoje</h3>
                <span className="text-gray-500 text-sm font-display">
                  {scansToday.reduce((acc, s) => acc + (Number(s.calories) || 0), 0).toFixed(0)} / {userProfile?.daily_calorie_target || 2000} kcal
                </span>
              </div>
              <div className="w-full h-3 bg-gray-900 rounded-full mb-8">
                <div 
                  className="h-full bg-primary rounded-full blur-[1px] transition-all duration-500" 
                  style={{ width: `${Math.min(100, (scansToday.reduce((acc, s) => acc + (Number(s.calories) || 0), 0) / (userProfile?.daily_calorie_target || 2000)) * 100)}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-primary/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="block text-[10px] text-primary font-bold ml-4 mb-2">Proteína</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.protein) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.protein), 0))} />
                </div>
                <div className="p-3 border border-orange-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="block text-[10px] text-orange-500 font-bold ml-4 mb-2">Carbs</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.carbs) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.carbs), 0) / 2)} colorClass="bg-orange-500" />
                </div>
                <div className="p-3 border border-blue-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span className="block text-[10px] text-blue-500 font-bold ml-4 mb-2">Gordura</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.fat) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.fat), 0))} colorClass="bg-blue-500" />
                </div>
                <div className="p-3 border border-purple-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="block text-[10px] text-purple-500 font-bold ml-4 mb-2">Fibras</span>
                  <span className="text-xl font-bold font-display">
                    {scansToday.reduce((acc, s) => acc + (Number(s.fiber) || 0), 0).toFixed(0)}g
                  </span>
                  <ProgressBar progress={Math.min(100, scansToday.reduce((acc, s) => acc + Number(s.fiber), 0) * 2)} colorClass="bg-purple-500" />
                </div>
              </div>
            </section>

            <button 
              onClick={() => navigate('capture')}
              className="bg-primary p-6 rounded-3xl flex items-center justify-between mb-8 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-black/10 rounded-full flex items-center justify-center">
                  <Camera size={28} className="text-black" />
                </div>
                <div className="text-left">
                  <h4 className="text-black font-bold text-lg leading-tight">Consultar Análise da Nossa Equipa</h4>
                  <p className="text-black/60 text-sm leading-snug max-w-[180px]">Fotografa a tua refeição e recebe a análise completa</p>
                </div>
              </div>
              <ChevronRight className="text-black" />
            </button>

            <section className="bg-card-bg p-6 rounded-3xl border border-gray-800 relative z-0">
               <div className="absolute -top-3 -left-3">
                  <div className="w-10 h-10 bg-[#d97706]/20 border border-[#d97706]/30 rounded-full flex items-center justify-center">
                    <Lightbulb size={20} className="text-[#d97706]" />
                  </div>
               </div>
               <h4 className="text-[#d97706] font-bold text-sm mb-3">Dica do Especialista</h4>
               <p className="italic text-gray-300 leading-relaxed">
                 "As folhas de mandioca (saka-saka) são riquíssimas em ferro e cálcio. Um superfood local essencial para atingir as tuas metas."
               </p>
            </section>

            <BottomNav active="dashboard" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Analysis Capture Screen --- */}
        {screen === 'capture' && (
          <motion.div 
            key="capture"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col h-screen pb-24 px-6 pt-12"
          >
            <header className="mb-8">
              <button 
                onClick={() => navigate('dashboard')}
                className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center mb-6"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-4xl font-bold font-display mb-2">Analisar refeição</h1>
              <p className="text-gray-400">Fotografa o teu prato para uma análise completa</p>
            </header>

            <div className="relative rounded-3xl overflow-hidden aspect-video mb-10 group">
              <img 
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                alt="Capture preview"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                <button 
                  onClick={() => navigate('result')}
                  className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 mb-4 animate-pulse"
                >
                  <Camera size={32} className="text-black" />
                </button>
                <h3 className="text-xl font-bold">Fotografa o teu prato</h3>
                <p className="text-center text-sm text-gray-300 max-w-[200px] mt-2">Aponta a câmara para a refeição e recebe a análise nutricional completa em segundos</p>
                
                <div className="flex gap-4 mt-8">
                   <button className="flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-full text-sm font-bold">
                     <Camera size={18} /> Câmara
                   </button>
                   <button className="flex items-center gap-2 px-6 py-3 bg-[#d97706] text-black rounded-full text-sm font-bold">
                     <ImageIcon size={18} /> Galeria
                   </button>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-xl mb-6">Tipo de refeição</h3>
            <div className="grid grid-cols-2 gap-4">
              {MEAL_TYPES.map((meal) => (
                <button
                  key={meal.id}
                  className={`p-4 rounded-3xl text-left border transition-all ${
                    meal.id === 'lunch' ? 'border-primary bg-primary/5' : 'border-gray-800 bg-card-bg'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <meal.icon size={20} className={meal.id === 'lunch' ? 'text-primary' : 'text-gray-500'} />
                    {meal.id === 'lunch' && <Check size={18} className="text-primary bg-primary/10 rounded-full" />}
                  </div>
                  <h4 className="font-bold mb-1">{meal.label}</h4>
                  <p className="text-[10px] text-gray-500 mb-1">{meal.time}</p>
                  <p className="text-[10px] text-gray-400 italic">Ex: {meal.ex}</p>
                </button>
              ))}
            </div>

            <BottomNav active="capture" onNavigate={navigate} />
          </motion.div>
        )}

        {/* --- Analysis Result Screen --- */}
        {screen === 'result' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen overflow-y-auto"
          >
            <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-dark-bg/80 backdrop-blur sticky top-0 z-20">
              <button 
                onClick={() => navigate('capture')}
                className="w-10 h-10 bg-card-bg rounded-full flex items-center justify-center transition-colors hover:bg-gray-800"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold font-display">Resultado da Análise</h2>
              <div className="w-10" />
            </div>

            <div className="px-6 pb-24">
              <div className="relative rounded-3xl overflow-hidden mb-8 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1000&auto=format&fit=crop" 
                  alt="Result meal" 
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md border border-primary/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-primary">92% Saúde</span>
                </div>
                
                <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center text-center">
                   <h3 className="text-5xl font-bold font-display mb-1">542 kcal</h3>
                   <span className="text-gray-400 font-medium font-display tracking-wide uppercase text-sm">Total Calorias</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-10">
                {[
                  { l: 'Protein', v: '35g', c: 'border-primary text-primary', i: Dumbbell },
                  { l: 'Carbs', v: '20g', c: 'border-orange-500 text-orange-500', i: Flame },
                  { l: 'Fat', v: '22g', c: 'border-blue-500 text-blue-500', i: FlaskConical },
                  { l: 'Fiber', v: '8g', c: 'border-purple-500 text-purple-500', i: Bone },
                ].map((m) => (
                  <div key={m.l} className={`p-3 rounded-2xl border bg-card-bg flex flex-col items-center text-center ${m.c.split(' ')[0]}`}>
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-gray-400">{m.l}</span>
                      <m.i size={10} className={m.c.split(' ')[1]} />
                    </div>
                    <span className="text-lg font-bold font-display">{m.v}</span>
                  </div>
                ))}
              </div>

              <h4 className="font-bold text-xl mb-6 flex items-center gap-2">
                <FlaskConical size={20} className="text-primary" />
                Micro-nutrientes
              </h4>
              <div className="space-y-6 mb-10">
                {[
                  { label: 'Vitamina A', val: 85, color: 'bg-primary' },
                  { label: 'Ferro', val: 70, color: 'bg-orange-500' },
                  { label: 'Cálcio', val: 60, color: 'bg-blue-500' },
                ].map((micro) => (
                  <div key={micro.label}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">{micro.label}</span>
                      <span className="font-bold">{micro.val}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${micro.val}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${micro.color} rounded-full`} 
                       />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#d97706]/10 border-2 border-[#d97706]/30 p-6 rounded-3xl mb-12 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-[#d97706]" />
                 <h4 className="text-[#d97706] font-bold text-lg mb-2">Sugestão do Nutricionista</h4>
                 <p className="text-sm text-gray-300 leading-relaxed">
                   Excelente equilíbrio de macronutrientes! Continue incluindo gorduras saudáveis como o abacate para otimizar a absorção de vitaminas. Considere adicionar sementes para mais fibra.
                 </p>
              </div>

              <div className="flex gap-4">
                 <button 
                  onClick={async () => {
                    if (!supabase || !session) return;
                    setLoading(true);
                    try {
                      const { error } = await supabase
                        .from('scan_history')
                        .insert([
                          {
                            user_id: session.user.id,
                            date: new Date().toISOString().split('T')[0],
                            item_name: 'Salmão com Salada',
                            calories: 542,
                            protein: 35,
                            carbs: 20,
                            fat: 22,
                            fiber: 8,
                            score: 92,
                            score_label: 'Saúde',
                            image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=1000&auto=format&fit=crop'
                          }
                        ]);
                      
                      if (error) throw error;
                      await fetchUserData(session.user.id);
                      navigate('dashboard');
                    } catch (err) {
                      console.error('Error saving scan:', err);
                      setErrorMessage('Erro ao guardar refeição.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-4 bg-primary text-black font-bold rounded-full active:scale-95 transition-transform flex items-center justify-center"
                >
                   {loading ? <Loader2 className="animate-spin" /> : 'Adicionar ao Diário'}
                 </button>
                 <button className="flex-1 py-4 bg-transparent border-2 border-[#d97706] text-[#d97706] font-bold rounded-full active:scale-95 transition-transform">
                   Editar Ingredientes
                 </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
