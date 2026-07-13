import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUploadProfileImage } from "@/hooks/useProfile";
import { useProducts, useDeleteProduct } from "@/hooks/useMarketplace";
import { Camera, MapPin, Sprout, Edit3, Save, X, Trash2, Package, Palette, Globe, Phone, Tag } from "lucide-react";
import { toast } from "sonner";

const ACCENT_COLORS = ["#22c55e", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const ProfilePage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadImage = useUploadProfileImage();
  const { data: products } = useProducts();
  const deleteProduct = useDeleteProduct();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    farm_name: "",
    location: "",
    bio: "",
    accent_color: "#22c55e",
    website: "",
    phone: "",
    specialties: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || "",
        farm_name: profile.farm_name || "",
        location: profile.location || "",
        bio: profile.bio || "",
        accent_color: profile.accent_color || "#22c55e",
        website: profile.website || "",
        phone: profile.phone || "",
        specialties: (profile.specialties || []).join(", "),
      });
    }
  }, [profile]);

  const myProducts = (products || []).filter((p) => p.user_id === user?.id);
  const accent = form.accent_color || profile?.accent_color || "#22c55e";

  const handleImage = async (kind: "avatar" | "banner", file: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImage.mutateAsync({ file, kind });
      await updateProfile.mutateAsync({ [kind === "avatar" ? "avatar_url" : "banner_url"]: url });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    }
  };

  const handleSave = async () => {
    const { specialties, ...rest } = form;
    await updateProfile.mutateAsync({
      ...rest,
      specialties: specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setEditing(false);
  };

  const initials = (form.display_name || user?.email || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner + Avatar */}
        <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
          <div
            className="h-48 md:h-56 w-full relative"
            style={{
              background: profile?.banner_url
                ? `url(${profile.banner_url}) center/cover`
                : `linear-gradient(135deg, ${accent}, ${accent}88)`,
            }}
          >
            <label className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 cursor-pointer backdrop-blur-sm transition">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage("banner", e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="px-6 pb-6 pt-0 -mt-14 md:-mt-16">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div className="relative">
                <div
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-card shadow-lg flex items-center justify-center text-3xl font-bold text-white"
                  style={{
                    background: profile?.avatar_url
                      ? `url(${profile.avatar_url}) center/cover`
                      : `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                  }}
                >
                  {!profile?.avatar_url && initials}
                </div>
                <label className="absolute bottom-1 right-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 cursor-pointer shadow-md transition">
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImage("avatar", e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button
                onClick={() => (editing ? handleSave() : setEditing(true))}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:opacity-90 transition flex items-center gap-2"
                style={{ background: accent }}
              >
                {editing ? <><Save className="w-4 h-4" /> Save</> : <><Edit3 className="w-4 h-4" /> Edit Profile</>}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {editing ? (
                <div className="grid md:grid-cols-2 gap-3">
                  <input
                    value={form.display_name}
                    onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                    placeholder="Display name"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    value={form.farm_name}
                    onChange={(e) => setForm({ ...form, farm_name: e.target.value })}
                    placeholder="Farm name"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Location"
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm md:col-span-2"
                  />
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell buyers about your farm..."
                    rows={3}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm md:col-span-2 resize-none"
                  />
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Palette className="w-3.5 h-3.5" /> ACCENT COLOR
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {ACCENT_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setForm({ ...form, accent_color: c })}
                          className={`w-8 h-8 rounded-full transition ring-offset-2 ring-offset-card ${
                            form.accent_color === c ? "ring-2 ring-foreground scale-110" : ""
                          }`}
                          style={{ background: c }}
                          aria-label={c}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(false)}
                    className="md:col-span-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center py-1"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h1 className="text-2xl font-bold">{profile?.display_name || "Unnamed Farmer"}</h1>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    {profile?.farm_name && (
                      <span className="flex items-center gap-1.5"><Sprout className="w-4 h-4" style={{ color: accent }} /> {profile.farm_name}</span>
                    )}
                    {profile?.location && (
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: accent }} /> {profile.location}</span>
                    )}
                  </div>
                  {profile?.bio && <p className="text-sm text-foreground/80 max-w-2xl">{profile.bio}</p>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Listings", value: myProducts.length },
            { label: "In Stock", value: myProducts.filter((p) => p.stock_status === "In Stock").length },
            { label: "Categories", value: new Set(myProducts.map((p) => p.category).filter(Boolean)).size },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: accent }}>{s.value}</div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* My marketplace listings */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: accent }} />
              <h2 className="text-lg font-bold">My Marketplace Listings</h2>
            </div>
            <span className="text-xs text-muted-foreground">{myProducts.length} total</span>
          </div>

          {myProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">You haven't listed any products yet.</p>
              <a href="/marketplace" className="inline-block mt-3 text-sm font-semibold hover:underline" style={{ color: accent }}>
                Go to Marketplace →
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProducts.map((p) => (
                <div key={p.id} className="border border-border rounded-xl overflow-hidden bg-background hover:shadow-md transition group">
                  <div
                    className="h-32 w-full"
                    style={{
                      background: p.image_url
                        ? `url(${p.image_url}) center/cover`
                        : `linear-gradient(135deg, ${accent}44, ${accent}22)`,
                    }}
                  />
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${p.name}"?`)) deleteProduct.mutate(p.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-destructive transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold" style={{ color: accent }}>
                        ${p.price}<span className="text-xs text-muted-foreground font-normal">/{p.price_unit}</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        p.stock_status === "In Stock" ? "bg-success/10 text-success" :
                        p.stock_status === "Limited" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{p.stock_status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
