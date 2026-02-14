import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-8 px-4 border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>用提示词实现一百个创意应用</span>
            <Heart className="w-4 h-4 text-primary fill-primary" />
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://github.com/ChenZiHong-Gavin/weekly-vibe-coding"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <span>当前进度：7/100</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
