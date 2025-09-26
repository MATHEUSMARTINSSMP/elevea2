import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface ComingSoonCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function ComingSoonCard({ title, description, icon }: ComingSoonCardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 opacity-75">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg opacity-60">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">{title}</h3>
        </div>
        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {description}
      </p>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        Em breve para usuários VIP...
      </div>
    </Card>
  );
}