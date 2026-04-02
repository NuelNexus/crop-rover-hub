import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const data = [
  { day: "Mon", Wheat: 0.3, Rice: 0.5, Maize: 0.2 },
  { day: "Tue", Wheat: 0.35, Rice: 0.55, Maize: 0.25 },
  { day: "Wed", Wheat: 0.5, Rice: 0.6, Maize: 0.3 },
  { day: "Thu", Wheat: 0.55, Rice: 0.65, Maize: 0.35 },
  { day: "Fri", Wheat: 0.6, Rice: 0.7, Maize: 0.4 },
  { day: "Sat", Wheat: 0.65, Rice: 0.75, Maize: 0.42 },
  { day: "Sun", Wheat: 0.7, Rice: 0.8, Maize: 0.5 },
];

const CropGrowthChart = () => (
  <div>
    <h2 className="font-display text-lg font-semibold mb-3">Crop Growth Monitoring</h2>
    <div className="stat-card">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(80,15%,88%)" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit=" Acres" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Wheat" stroke="hsl(145,63%,42%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Rice" stroke="hsl(36,90%,55%)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Maize" stroke="hsl(210,80%,55%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default CropGrowthChart;
