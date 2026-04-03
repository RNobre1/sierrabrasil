import { useEffect, useState, useRef, useMemo } from "react";
import { Save, LogOut, Camera, Check, AtSign, Lock, Mail, Phone, ShieldCheck, AlertTriangle, Unlink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AvatarCropModal from "@/components/AvatarCropModal";
import WhatsAppOTPStep from "@/components/signup/WhatsAppOTPStep";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import GuidedTour from "@/components/GuidedTour";
import { ACCOUNT_STEPS, ACCOUNT_TOUR_KEY } from "@/lib/tour-steps";

const MAX_SIZE = 500 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Mock OTP dialog for email verification
function EmailOTPDialog({ open, onClose, email, onVerified }: { open: boolean; onClose: () => void; email: string; onVerified: () => void }) {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setVerifying(true);
    await new Promise(r => setTimeout(r, 1500));
    setVerifying(false);
    onVerified();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-4 w-4" /> Verificação de e-mail</DialogTitle>
          <DialogDescription>Enviamos um código para <strong>{email}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" className="text-center text-lg font-mono tracking-[0.5em] h-12 rounded-xl" />
          <Button onClick={handleVerify} disabled={verifying || otp.length < 6} className="w-full h-11 rounded-xl">
            {verifying ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Verificar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create password dialog for Google SSO users
function CreatePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (password.length < 8) { toast({ title: "Senha muito curta", description: "Mínimo 8 caracteres", variant: "destructive" }); return; }
    if (password !== confirm) { toast({ title: "Senhas não coincidem", variant: "destructive" }); return; }
    setSaving(true);
    // Mock: in production would call supabase.auth.updateUser({ password })
    await new Promise(r => setTimeout(r, 1500));
    setSaving(false);
    toast({ title: "Senha criada!", description: "Agora você pode alterar seu e-mail e desconectar do Google." });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Criar senha</DialogTitle>
          <DialogDescription>Crie uma senha para poder alterar seu e-mail ou desconectar do Google</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nova senha</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirmar senha</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" className="h-11 rounded-xl" />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full h-11 rounded-xl">
            {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Criar senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Account() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [usernameChangedAt, setUsernameChangedAt] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Verification dialogs
  const [showPhoneOTP, setShowPhoneOTP] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);

  // Mock: is Google SSO user
  const isGoogleUser = user?.app_metadata?.provider === "google" || false;
  const hasPassword = !isGoogleUser; // Mock

  const [planInfo, setPlanInfo] = useState<{ id: string; display_name: string; max_agents: number; max_conversations_month: number } | null>(null);

  const [initialValues, setInitialValues] = useState({ fullName: "", phone: "" });
  const isDirty = useMemo(
    () => fullName !== initialValues.fullName,
    [fullName, initialValues]
  );

  // Can change username? (60-day cooldown)
  const canChangeUsername = useMemo(() => {
    if (!usernameChangedAt) return true;
    const lastChange = new Date(usernameChangedAt);
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 60;
  }, [usernameChangedAt]);

  const daysUntilUsernameChange = useMemo(() => {
    if (!usernameChangedAt) return 0;
    const lastChange = new Date(usernameChangedAt);
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(60 - daysSince));
  }, [usernameChangedAt]);

  useEffect(() => {
    if (profile) {
      const fn = profile.full_name ?? "";
      const ph = profile.phone ?? "";
      setFullName(fn);
      setPhone(ph);
      setAvatarUrl(profile.avatar_url ?? null);
      setInitialValues({ fullName: fn, phone: ph });
      setNewEmail(user?.email ?? "");
      setNewPhone(ph);

      // Generate default username from name
      const existing = (profile as any).username;
      if (existing) {
        setUsername(existing);
      } else if (fn) {
        const generated = fn.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9._]/g, "") + "-" + (user?.id?.slice(0, 6) ?? "");
        setUsername(generated);
      }
      setUsernameChangedAt((profile as any).username_changed_at ?? null);
    }
  }, [profile, user]);

  // Fetch plan info from plans table
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: tenant } = await supabase.from("tenants").select("plan").eq("owner_id", user.id).single();
      if (!tenant?.plan) return;
      const { data: plan } = await supabase.from("plans").select("id, display_name, max_agents, max_conversations_month").eq("id", tenant.plan).single();
      if (plan) setPlanInfo(plan as any);
    })();
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    if (file.size > MAX_SIZE) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropped = async (blob: Blob) => {
    if (!user) return;
    const path = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) return;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setAvatarUrl(url);
  };

  const handleSave = async () => {
    if (!user || !isDirty) return;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setInitialValues({ fullName, phone });
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !canChangeUsername) return;
    const clean = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (clean.length < 3) { toast({ title: "Username muito curto", description: "Mínimo 3 caracteres", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      username: clean,
      username_changed_at: new Date().toISOString()
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error?.code === "23505") {
      toast({ title: "Username indisponível", description: "Esse username já está em uso.", variant: "destructive" });
    } else if (!error) {
      setUsername(clean);
      setUsernameChangedAt(new Date().toISOString());
      setEditingUsername(false);
      toast({ title: "Username atualizado!" });
    }
  };

  const handlePhoneVerified = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ phone: `+55${newPhone.replace(/\D/g, "")}` }).eq("user_id", user.id);
    setPhone(`+55${newPhone.replace(/\D/g, "")}`);
    setShowPhoneOTP(false);
    setEditingPhone(false);
    toast({ title: "WhatsApp verificado e atualizado!" });
  };

  const handleEmailVerified = async () => {
    // Mock: in production would send verification email, then update
    toast({ title: "E-mail verificado!", description: "Seu e-mail foi atualizado com sucesso." });
    setEditingEmail(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      {/* Google SSO notice */}
      {isGoogleUser && !hasPassword && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-foreground">Conta vinculada ao Google</p>
                <p className="text-xs text-muted-foreground">Para alterar seu e-mail ou desconectar do Google, você precisa criar uma senha primeiro.</p>
                <Button size="sm" variant="outline" className="h-8 text-xs mt-1" onClick={() => setShowCreatePassword(true)}>
                  <Lock className="h-3 w-3 mr-1.5" /> Criar senha
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Informações pessoais</CardTitle>
          <CardDescription>Seus dados de perfil na plataforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5" data-tour="account-profile">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/10 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-primary">
                    {fullName?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-white" />
              </button>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Foto de perfil</p>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máximo 500KB.</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => fileRef.current?.click()}>
                Alterar foto
              </Button>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
              Username
              {!canChangeUsername && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Alterável em {daysUntilUsernameChange}d
                </Badge>
              )}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                  disabled={!editingUsername}
                  className="pl-8 bg-muted/50"
                  maxLength={30}
                />
              </div>
              {editingUsername ? (
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-10" onClick={handleSaveUsername} disabled={saving}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-10" onClick={() => setEditingUsername(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-10" onClick={() => setEditingUsername(true)} disabled={!canChangeUsername}>
                  Editar
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Único na plataforma. Editável 1x a cada 60 dias.</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>

          {/* Email - with verification */}
          <div className="space-y-2" data-tour="account-contact">
            <Label className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              E-mail
              <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200">
                <ShieldCheck className="h-2.5 w-2.5" /> Verificado
              </Badge>
            </Label>
            {editingEmail ? (
              <div className="flex gap-2">
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="flex-1" />
                <Button size="sm" className="h-10" onClick={() => {
                  if (!hasPassword && isGoogleUser) { setShowCreatePassword(true); setEditingEmail(false); return; }
                  setShowEmailOTP(true);
                }}>
                  Verificar
                </Button>
                <Button size="sm" variant="ghost" className="h-10" onClick={() => setEditingEmail(false)}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={user?.email ?? ""} disabled className="flex-1 bg-muted" />
                <Button size="sm" variant="outline" className="h-10" onClick={() => setEditingEmail(true)}>
                  Alterar
                </Button>
              </div>
            )}
          </div>

          {/* Phone - with WhatsApp OTP verification */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              WhatsApp
              {phone && (
                <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200">
                  <ShieldCheck className="h-2.5 w-2.5" /> Verificado
                </Badge>
              )}
            </Label>
            {editingPhone && !showPhoneOTP ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+55</span>
                    <Input value={newPhone} onChange={e => setNewPhone(formatWhatsApp(e.target.value))} className="pl-10" placeholder="(00) 00000-0000" />
                  </div>
                  <Button size="sm" className="h-10" onClick={() => setShowPhoneOTP(true)} disabled={newPhone.replace(/\D/g, "").length < 10}>
                    Verificar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-10" onClick={() => { setEditingPhone(false); setNewPhone(phone); }}>Cancelar</Button>
                </div>
              </div>
            ) : showPhoneOTP ? (
              <div className="rounded-xl border border-border p-4">
                <WhatsAppOTPStep
                  phone={newPhone.replace(/\D/g, "")}
                  onVerified={handlePhoneVerified}
                  onBack={() => { setShowPhoneOTP(false); }}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={phone || "Não informado"} disabled className="flex-1 bg-muted" />
                <Button size="sm" variant="outline" className="h-10" onClick={() => { setEditingPhone(true); setNewPhone(""); }}>
                  {phone ? "Alterar" : "Adicionar"}
                </Button>
              </div>
            )}
          </div>

          {/* Save name */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || !isDirty}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"
                >
                  <Check className="h-4 w-4" /> Salvo com sucesso
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Google SSO management */}
      {isGoogleUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Conta Google
            </CardTitle>
            <CardDescription>Gerencie sua conexão com o Google</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Google conectado</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                disabled={!hasPassword}
                onClick={() => toast({ title: "Em breve", description: "Desconexão do Google será ativada em breve." })}
              >
                <Unlink className="h-3 w-3" /> Desconectar
              </Button>
            </div>
            {!hasPassword && (
              <p className="text-[10px] text-muted-foreground mt-2">Crie uma senha antes de desconectar do Google.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card data-tour="account-plan">
        <CardHeader>
          <CardTitle className="text-base font-display">Plano atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-semibold">{planInfo?.display_name || "Carregando..."}</p>
              <p className="text-xs text-muted-foreground">
                {planInfo ? `Até ${planInfo.max_agents} agente${planInfo.max_agents > 1 ? "s" : ""} · ${planInfo.max_conversations_month >= 999999 ? "Conversas ilimitadas" : `${planInfo.max_conversations_month} conversas/mês`}` : ""}
              </p>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">Gerenciamento em breve</span>
          </div>
        </CardContent>
      </Card>

      {cropSrc && (
        <AvatarCropModal open={!!cropSrc} onClose={() => setCropSrc(null)} imageSrc={cropSrc} onCropped={handleCropped} />
      )}

      <EmailOTPDialog open={showEmailOTP} onClose={() => setShowEmailOTP(false)} email={newEmail} onVerified={handleEmailVerified} />
      <CreatePasswordDialog open={showCreatePassword} onClose={() => setShowCreatePassword(false)} />

      <GuidedTour steps={ACCOUNT_STEPS} tourKey={ACCOUNT_TOUR_KEY} />
    </div>
  );
}
