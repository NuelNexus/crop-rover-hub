import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import "@/styles/auth-house.scss";

const AuthPage = () => {
  const navigate = useNavigate();
  const houseRef = useRef<HTMLDivElement | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const lights = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
  const topLights = useMemo(() => Array.from({ length: 9 }, (_, i) => i), []);
  const libros = useMemo(() => Array.from({ length: 6 }, (_, i) => i), []);
  const fotos = useMemo(() => Array.from({ length: 2 }, (_, i) => i), []);
  const cajas = useMemo(() => Array.from({ length: 3 }, (_, i) => i), []);
  const mesaPatas = useMemo(() => Array.from({ length: 4 }, (_, i) => i), []);

  useEffect(() => {
    const h = houseRef.current;
    if (!h) return;

    const onMove = (e: PointerEvent) => {
      const x = e.pageX / window.innerWidth - 0.5;
      const y = e.pageY / window.innerHeight - 0.5;
      h.style.transform = `translate(-50%, -50%) perspective(90vw) rotateX(${y * 10 + 75}deg) rotateZ(${ -x * 25 + 45}deg) translateZ(-9vw)`;
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="auth-house-scene" aria-hidden="true">
        <div className="house" id="h" ref={houseRef}>
          <div className="h-lights">
            {lights.map((i) => (
              <div key={i} className="h-light" />
            ))}
          </div>

          <div className="h-shadow" />

          <div className="alt">
            <div className="alt__front face" />
            <div className="alt__back face" />
            <div className="alt__right face" />
            <div className="alt__left face" />
            <div className="alt__top face">
              {topLights.map((i) => (
                <div key={i} className="light" />
              ))}
            </div>
            <div className="alt__bottom face" />
          </div>
          <div className="alb">
            <div className="alb__front face" />
            <div className="alb__back face" />
            <div className="alb__right face" />
            <div className="alb__left face" />
            <div className="alb__top face" />
            <div className="alb__bottom face" />
          </div>
          <div className="arb">
            <div className="arb__front face" />
            <div className="arb__back face" />
            <div className="arb__right face" />
            <div className="arb__left face" />
            <div className="arb__top face" />
            <div className="arb__bottom face" />
          </div>

          <div className="blt">
            <div className="blt__front face" />
            <div className="blt__back face" />
            <div className="blt__right face" />
            <div className="blt__left face" />
            <div className="blt__top face" />
            <div className="blt__bottom face" />
          </div>
          <div className="blt2">
            <div className="blt2__front face" />
            <div className="blt2__back face" />
            <div className="blt2__right face" />
            <div className="blt2__left face" />
            <div className="blt2__top face" />
            <div className="blt2__bottom face" />
          </div>
          <div className="blb">
            <div className="blb__front face" />
            <div className="blb__back face" />
            <div className="blb__right face" />
            <div className="blb__left face" />
            <div className="blb__top face" />
            <div className="blb__bottom face" />
          </div>
          <div className="blb2">
            <div className="blb2__front face" />
            <div className="blb2__back face" />
            <div className="blb2__right face" />
            <div className="blb2__left face" />
            <div className="blb2__top face" />
            <div className="blb2__bottom face" />
          </div>

          <div className="puerta-c">
            <div className="puerta">
              <div className="puerta__front face" />
              <div className="puerta__back face" />
              <div className="puerta__right face" />
              <div className="puerta__left face" />
              <div className="puerta__top face" />
              <div className="puerta__bottom face" />
            </div>
            <div className="puerta-l">
              <div className="puerta-l__front face" />
              <div className="puerta-l__back face" />
              <div className="puerta-l__right face" />
              <div className="puerta-l__left face" />
              <div className="puerta-l__top face" />
              <div className="puerta-l__bottom face" />
            </div>
            <div className="puerta-r">
              <div className="puerta-r__front face" />
              <div className="puerta-r__back face" />
              <div className="puerta-r__right face" />
              <div className="puerta-r__left face" />
              <div className="puerta-r__top face" />
              <div className="puerta-r__bottom face" />
            </div>
            <div className="puerta-t">
              <div className="puerta-t__front face" />
              <div className="puerta-t__back face" />
              <div className="puerta-t__right face" />
              <div className="puerta-t__left face" />
              <div className="puerta-t__top face" />
              <div className="puerta-t__bottom face" />
            </div>
          </div>

          <div className="cuadro-l">
            <div className="cuadro-l__front face" />
            <div className="cuadro-l__back face" />
            <div className="cuadro-l__right face" />
            <div className="cuadro-l__left face" />
            <div className="cuadro-l__top face" />
            <div className="cuadro-l__bottom face" />
          </div>
          <div className="cuadro-r">
            <div className="cuadro-r__front face" />
            <div className="cuadro-r__back face" />
            <div className="cuadro-r__right face" />
            <div className="cuadro-r__left face" />
            <div className="cuadro-r__top face" />
            <div className="cuadro-r__bottom face" />
          </div>
          <div className="librero">
            <div className="librero__front face" />
            <div className="librero__back face" />
            <div className="librero__right face" />
            <div className="librero__left face" />
            <div className="librero__top face" />
            <div className="librero__bottom face" />
          </div>
          <div className="libros">
            {libros.map((i) => (
              <div key={i} className="libro">
                <div className="libro__front face" />
                <div className="libro__back face" />
                <div className="libro__right face" />
                <div className="libro__left face" />
                <div className="libro__top face" />
                <div className="libro__bottom face" />
              </div>
            ))}
          </div>
          <div className="fotos">
            {fotos.map((i) => (
              <div key={i} className="foto">
                <div className="foto__front face" />
                <div className="foto__back face" />
                <div className="foto__right face" />
                <div className="foto__left face" />
                <div className="foto__top face" />
                <div className="foto__bottom face" />
              </div>
            ))}
          </div>
          <div className="cajas">
            {cajas.map((i) => (
              <div key={i} className="caja">
                <div className="caja__front face" />
                <div className="caja__back face" />
                <div className="caja__right face" />
                <div className="caja__left face" />
                <div className="caja__top face" />
                <div className="caja__bottom face" />
              </div>
            ))}
          </div>
          <div className="tv">
            <div className="tv__front face" />
            <div className="tv__back face" />
            <div className="tv__right face" />
            <div className="tv__left face" />
            <div className="tv__top face" />
            <div className="tv__bottom face" />
          </div>
          <div className="repisa-t">
            <div className="repisa-t__front face" />
            <div className="repisa-t__back face" />
            <div className="repisa-t__right face" />
            <div className="repisa-t__left face" />
            <div className="repisa-t__top face" />
            <div className="repisa-t__bottom face" />
          </div>
          <div className="repisa-b">
            <div className="repisa-b__front face" />
            <div className="repisa-b__back face" />
            <div className="repisa-b__right face" />
            <div className="repisa-b__left face" />
            <div className="repisa-b__top face" />
            <div className="repisa-b__bottom face" />
          </div>
          <div className="bocina-l">
            <div className="bocina-l__front face" />
            <div className="bocina-l__back face" />
            <div className="bocina-l__right face" />
            <div className="bocina-l__left face" />
            <div className="bocina-l__top face" />
            <div className="bocina-l__bottom face" />
          </div>
          <div className="bocina-r">
            <div className="bocina-r__front face" />
            <div className="bocina-r__back face" />
            <div className="bocina-r__right face" />
            <div className="bocina-r__left face" />
            <div className="bocina-r__top face" />
            <div className="bocina-r__bottom face" />
          </div>
          <div className="muro">
            <div className="muro__front face" />
            <div className="muro__back face" />
            <div className="muro__right face" />
            <div className="muro__left face" />
            <div className="muro__top face" />
            <div className="muro__bottom face" />
          </div>
          <div className="sillon-c">
            <div className="sillon-b">
              <div className="sillon-b__front face" />
              <div className="sillon-b__back face" />
              <div className="sillon-b__right face" />
              <div className="sillon-b__left face" />
              <div className="sillon-b__top face" />
              <div className="sillon-b__bottom face" />
            </div>
            <div className="sillon-t">
              <div className="sillon-t__front face" />
              <div className="sillon-t__back face" />
              <div className="sillon-t__right face" />
              <div className="sillon-t__left face" />
              <div className="sillon-t__top face" />
              <div className="sillon-t__bottom face" />
            </div>
            <div className="sillon-l">
              <div className="sillon-l__front face" />
              <div className="sillon-l__back face" />
              <div className="sillon-l__right face" />
              <div className="sillon-l__left face" />
              <div className="sillon-l__top face" />
              <div className="sillon-l__bottom face" />
            </div>
            <div className="sillon-r">
              <div className="sillon-r__front face" />
              <div className="sillon-r__back face" />
              <div className="sillon-r__right face" />
              <div className="sillon-r__left face" />
              <div className="sillon-r__top face" />
              <div className="sillon-r__bottom face" />
            </div>
          </div>
          <div className="mesa-c">
            <div className="mesa">
              <div className="mesa__front face" />
              <div className="mesa__back face" />
              <div className="mesa__right face" />
              <div className="mesa__left face" />
              <div className="mesa__top face" />
              <div className="mesa__bottom face" />
            </div>

            {mesaPatas.map((i) => (
              <div key={i} className="mesa-p">
                <div className="mesa-p__front face" />
                <div className="mesa-p__back face" />
                <div className="mesa-p__right face" />
                <div className="mesa-p__left face" />
                <div className="mesa-p__top face" />
                <div className="mesa-p__bottom face" />
              </div>
            ))}

            <div className="mesa-shadow" />
          </div>
          <div className="tablet">
            <div className="tablet__front face" />
            <div className="tablet__back face" />
            <div className="tablet__right face" />
            <div className="tablet__left face" />
            <div className="tablet__top face" />
            <div className="tablet__bottom face" />
          </div>
        </div>
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.svg" alt="Harvest IQ logo" className="w-8 h-8" />
            <span className="font-display text-2xl font-bold">Harvest <span className="text-primary">IQ</span></span>
          </div>
          <p className="text-sm text-muted-foreground">Smart farming, real-time insights</p>
        </div>

        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border">
          <h2 className="font-display text-xl font-bold text-center mb-6">{isSignUp ? "Create Account" : "Welcome Back"}</h2>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-border hover:bg-secondary transition-colors text-sm font-medium mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-background text-sm placeholder:text-muted-foreground"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-background text-sm placeholder:text-muted-foreground"
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full pl-11 pr-11 py-3 rounded-2xl border border-border bg-background text-sm placeholder:text-muted-foreground"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-medium hover:underline">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
