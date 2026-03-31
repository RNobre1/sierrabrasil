import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ShoppingBag,
  Headphones,
  Calendar,
  GraduationCap,
  Building,
  LucideIcon
} from "lucide-react";

export interface AgentTemplate {
  id: string;
  name: string;
  class: string;
  description: string;
  icon: string;
}

export interface AgentTemplateSelectorProps {
  templates: AgentTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  ShoppingBag,
  Headphones,
  Calendar,
  GraduationCap,
  Building,
};

export default function AgentTemplateSelector({
  templates,
  selectedId,
  onSelect,
}: AgentTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => {
        const IconComponent = iconMap[template.icon] || Building;
        const isSelected = selectedId === template.id;

        return (
          <Card
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={cn(
              "cursor-pointer transition-all duration-200",
              isSelected
                ? "border-cosmos-indigo shadow-glow-indigo bg-cosmos-indigo/5 dark:bg-cosmos-indigo/10 border-2"
                : "border-border hover:shadow-cosmos-sm hover:scale-[1.02] dark:border-white/10"
            )}
          >
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div
                className={cn(
                  "p-3 rounded-xl flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-cosmos-indigo text-white shadow-glow-indigo"
                    : "bg-secondary text-secondary-foreground dark:bg-white/5 dark:text-white"
                )}
              >
                <IconComponent className="w-6 h-6" />
              </div>
              <div className="flex flex-col flex-1">
                <CardTitle className="font-display">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1">
                  {template.description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
