import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Package, Loader2, MapPin, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";

type Props = { productId: string | null; onOpenChange: (open: boolean) => void };

const ProductModal = ({ productId, onOpenChange }: Props) => {
  const [product, setProduct] = useState<any | null>(null);
  const [seller, setSeller] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    (async () => {
      const { data: p } = await supabase
        .from("marketplace_products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      setProduct(p);
      if (p?.user_id) {
        const { data: s } = await supabase
          .from("profiles")
          .select("user_id, display_name, farm_name, location, accent_color")
          .eq("user_id", p.user_id)
          .maybeSingle();
        setSeller(s);
      } else {
        setSeller(null);
      }
      setLoading(false);
    })();
  }, [productId]);

  const accent = seller?.accent_color || "hsl(var(--primary))";

  return (
    <Dialog open={!!productId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{product?.name || "Product"}</DialogTitle>
        </DialogHeader>
        {loading || !product ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <article className="hiq-product-card" style={{ ["--product-card--accent" as any]: accent, borderRadius: 0, boxShadow: "none" }}>
            <div className="hiq-thumb">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <span className="hiq-thumb-fallback">{product.name?.[0]?.toUpperCase()}</span>
              )}
              {product.category && <span className="hiq-category">{product.category}</span>}
            </div>
            <h3 className="hiq-heading">{product.name}</h3>
            <div className="hiq-price">${product.price}/{product.price_unit}</div>
            {product.description && <p className="hiq-desc" style={{ WebkitLineClamp: 4 }}>{product.description}</p>}
            <ul className="hiq-tags">
              <li className="hiq-tag">{product.stock_status}</li>
              {product.seller && <li className="hiq-tag"><UserIcon className="inline w-3 h-3 mr-0.5" />{product.seller}</li>}
              {seller?.location && <li className="hiq-tag"><MapPin className="inline w-3 h-3 mr-0.5" />{seller.location}</li>}
            </ul>
            <div className="hiq-btn-wrap flex gap-2">
              <Link
                to="/marketplace"
                onClick={() => onOpenChange(false)}
                className="hiq-purchase-btn flex-1"
              >
                <Package className="w-4 h-4" /> View in marketplace
              </Link>
              {product.user_id && (
                <Link
                  to={`/messages?to=${product.user_id}`}
                  onClick={() => onOpenChange(false)}
                  className="hiq-purchase-btn"
                  style={{ background: "hsl(var(--secondary))", color: "hsl(var(--foreground))" }}
                  title="Message seller"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
              )}
            </div>
          </article>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
