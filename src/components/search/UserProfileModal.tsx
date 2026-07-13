import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Sprout, Globe, Phone, MessageSquare, Package, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  userId: string | null;
  onOpenChange: (open: boolean) => void;
};

type ProfileFull = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  farm_name: string | null;
  location: string | null;
  accent_color: string | null;
  website: string | null;
  phone: string | null;
  specialties: string[] | null;
  social_links: Record<string, string> | null;
};

const UserProfileModal = ({ userId, onOpenChange }: Props) => {
  const [profile, setProfile] = useState<ProfileFull | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    (async () => {
      const [{ data: p }, { data: prods }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("marketplace_products")
          .select("id, name, price, price_unit, image_url, category")
          .eq("user_id", userId)
          .limit(6),
      ]);
      setProfile(p as any);
      setProducts(prods || []);
      setLoading(false);
    })();
  }, [userId]);

  const accent = profile?.accent_color || "hsl(var(--primary))";
  const initials = (profile?.display_name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <Dialog open={!!userId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{profile?.display_name || "Profile"}</DialogTitle>
        </DialogHeader>
        {loading || !profile ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div>
            <div
              className="h-32 relative"
              style={{
                background: profile.banner_url
                  ? `url(${profile.banner_url}) center/cover`
                  : `linear-gradient(135deg, ${accent}, ${accent}88)`,
              }}
            />
            <div className="px-6 pb-6 -mt-10">
              <div
                className="w-20 h-20 rounded-full border-4 border-card shadow-lg flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  background: profile.avatar_url
                    ? `url(${profile.avatar_url}) center/cover`
                    : `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                }}
              >
                {!profile.avatar_url && initials}
              </div>
              <div className="mt-3">
                <h2 className="text-xl font-bold font-display">{profile.display_name || "Farmer"}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                  {profile.farm_name && (
                    <span className="flex items-center gap-1.5"><Sprout className="w-4 h-4" style={{ color: accent }} /> {profile.farm_name}</span>
                  )}
                  {profile.location && (
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: accent }} /> {profile.location}</span>
                  )}
                </div>
              </div>

              {profile.bio && <p className="mt-4 text-sm text-foreground/80">{profile.bio}</p>}

              {profile.specialties && profile.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {profile.specialties.map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: `${accent}22`, color: accent }}>{s}</span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-primary">
                    <Globe className="w-3.5 h-3.5" /> {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {profile.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {profile.phone}</span>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <Link
                  to={`/messages?to=${profile.user_id}`}
                  onClick={() => onOpenChange(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
                  style={{ background: accent }}
                >
                  <MessageSquare className="w-4 h-4" /> Send message
                </Link>
              </div>

              {products.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">Listings</p>
                    <span className="text-xs text-muted-foreground">({products.length})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {products.map((p) => (
                      <Link
                        key={p.id}
                        to="/marketplace"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg overflow-hidden border border-border hover:shadow-md transition bg-background"
                      >
                        <div
                          className="h-20"
                          style={{
                            background: p.image_url
                              ? `url(${p.image_url}) center/cover`
                              : `linear-gradient(135deg, ${accent}44, ${accent}22)`,
                          }}
                        />
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">${p.price}/{p.price_unit}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
