import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface WarningAlertProps {
  currentDistance: number;
  averageDistance: number;
}

export const WarningAlert = ({ currentDistance, averageDistance }: WarningAlertProps) => {
  const threshold = 0.15; // 15% increase threshold
  const percentIncrease = ((currentDistance - averageDistance) / averageDistance) * 100;

  if (percentIncrease < threshold * 100) return null;

  return (
    <Alert variant="destructive" className="border-warning bg-warning/10">
      <AlertTriangle className="h-5 w-5 text-warning" />
      <AlertTitle className="text-warning-foreground">发际线警告</AlertTitle>
      <AlertDescription className="text-warning-foreground/90">
        检测到发际线距离显著增加 {percentIncrease.toFixed(1)}%。
        相比平均值增加了 {(currentDistance - averageDistance).toFixed(1)} 像素。
        建议咨询专业医生。
      </AlertDescription>
    </Alert>
  );
};
