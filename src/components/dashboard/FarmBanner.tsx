import farmImg from "@/assets/farm-landscape.jpg";

const FarmBanner = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Manage your farm</h2>
    <div className="rounded-2xl overflow-hidden shadow-sm">
      <img
        src={farmImg}
        alt="Lush cornfield with mountains"
        className="w-full h-48 object-cover"
        width={1024}
        height={512}
      />
    </div>
  </div>
);

export default FarmBanner;
