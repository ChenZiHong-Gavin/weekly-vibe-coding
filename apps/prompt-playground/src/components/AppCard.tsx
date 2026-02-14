import { motion } from "framer-motion";
import { ExternalLink, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AppCardProps {
  title: string;
  description: string;
  icon: string;
  url: string;
  status: "live" | "coming";
  category?: string;
  colorClass?: string;
  prompt?: string;
}

const AppCard = ({
  title,
  description,
  icon,
  url,
  status,
  category,
  colorClass = "icon-orange",
  prompt,
}: AppCardProps) => {
  const isLive = status === "live";

  const handleCopyPrompt = () => {
    const textToCopy = prompt || "";
    navigator.clipboard.writeText(textToCopy);
    toast.success(textToCopy ? "Prompt copied to clipboard!" : "Empty prompt copied!");
  };

  return (
    <motion.div
      className={`clay-card block p-6 group relative ${!isLive ? "opacity-60 cursor-not-allowed" : ""}`}
      whileHover={isLive ? { y: -8, scale: 1.02 } : {}}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <a
        href={isLive ? url : undefined}
        target={isLive ? "_blank" : undefined}
        rel={isLive ? "noopener noreferrer" : undefined}
        className="absolute inset-0 z-0"
        aria-label={`Visit ${title}`}
      />
      
      <div className="relative z-10 pointer-events-none">
        {/* Category badge */}
        {category && (
          <div className="mb-4">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/10 text-muted-foreground">
              {category}
            </span>
          </div>
        )}

        {/* Icon */}
        <div className="text-5xl mb-4 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>

        {/* Title */}
        <h3 className="font-display text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
          {title}
          {isLive && (
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {description}
        </p>

        {/* Status badge and Copy Button */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium pointer-events-none ${
              isLive ? "status-live" : "status-coming"
            }`}
          >
            {isLive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                已部署
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                即将推出
              </>
            )}
          </span>

          <Dialog>
            <DialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-foreground pointer-events-auto"
                title="View Prompt"
              >
                <FileText className="w-4 h-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{title} Prompt</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
                <Textarea 
                  value={prompt} 
                  readOnly 
                  className="flex-1 min-h-[300px] font-mono text-sm resize-none" 
                />
                <Button onClick={handleCopyPrompt} className="w-full gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Prompt
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
};

export default AppCard;
