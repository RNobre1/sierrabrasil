import { useEffect, useState, useRef, useMemo } from "react";
import { Save, LogOut, Camera, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AvatarCropModal from "@/components/AvatarCropModal";
import { motion, AnimatePresence } from "framer-motion";

const MAX_SIZE = 500 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function Account() {
  const { user, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Dirty tracking
  const [initialValues, setInitialValues] = useState({ fullName: "", phone: "" });
  const isDirty = useMemo(
    () => fullName !== initialValues.fullName || phone !== initialValues.phone,
    [fullName, phone, initialValues]
  );

  useEffect(() => {
    if (profile) {
      const fn = profile.full_name ?? "";
      const ph = profile.phone ?? "";
      setFullName(fn);
      setPhone(ph);
      setAvatarUrl(profile.avatar_url ?? null);
      setInitialValues({ fullName: fn, phone: ph });
    }
  }, [profile]);

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
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user.id);
    setSaving(false);
    if (!error) {
      setSaved(true);
      setInitialValues({ fullName, phone });
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Informações pessoais</CardTitle>
          <CardDescription>Seus dados de perfil na plataforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
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

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={user?.email ?? ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+55 11 99999-0000" />
          </div>

          {/* Inline save */}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Plano atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-semibold capitalize">Professional</p>
              <p className="text-xs text-muted-foreground">Até 5.000 conversas/mês</p>
            </div>
            <Button variant="outline" size="sm" disabled>Gerenciar plano</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base font-display text-destructive">Zona de perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair da conta
          </Button>
        </CardContent>
      </Card>

      {cropSrc && (
        <AvatarCropModal open={!!cropSrc} onClose={() => setCropSrc(null)} imageSrc={cropSrc} onCropped={handleCropped} />
      )}
    </div>
  );
}
