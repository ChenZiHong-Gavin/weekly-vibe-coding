import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";

interface MeasurementRecord {
  date: string;
  distance: number;
  timestamp: number;
}

interface HistoryChartProps {
  records: MeasurementRecord[];
}

export const HistoryChart = ({ records }: HistoryChartProps) => {
  if (records.length === 0) return null;

  const chartData = records
    .slice(-14)
    .map(record => ({
      date: new Date(record.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      distance: record.distance,
    }));

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">历史记录</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          最近 {chartData.length} 次测量
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ value: '距离 (px)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="distance" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
