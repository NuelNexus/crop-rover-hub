import AppLayout from "@/components/layout/AppLayout";
import SummaryCards from "@/components/dashboard/SummaryCards";
import WeatherWidget from "@/components/dashboard/WeatherWidget";
import FarmBanner from "@/components/dashboard/FarmBanner";
import PredictiveAnalysis from "@/components/dashboard/PredictiveAnalysis";
import DeviceStatus from "@/components/dashboard/DeviceStatus";
import SensorReadings from "@/components/dashboard/SensorReadings";
import StorageConditions from "@/components/dashboard/StorageConditions";
import AIInsights from "@/components/dashboard/AIInsights";
import AlertsPanel from "@/components/dashboard/AlertsPanel";
import CropGrowthChart from "@/components/dashboard/CropGrowthChart";
import MyCrops from "@/components/dashboard/MyCrops";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Row 1: Summary + Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SummaryCards />
          </div>
          <WeatherWidget />
        </div>

        {/* Row 2: Farm + Sensor Readings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FarmBanner />
          <SensorReadings />
        </div>

        {/* Row 3: Device Status + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeviceStatus />
          <AlertsPanel />
        </div>

        {/* Row 4: Storage + AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StorageConditions />
          <AIInsights />
        </div>

        {/* Row 5: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CropGrowthChart />
          </div>
          <MyCrops />
        </div>

        {/* Row 6: Predictive */}
        <PredictiveAnalysis />
      </div>
    </AppLayout>
  );
};

export default Index;
