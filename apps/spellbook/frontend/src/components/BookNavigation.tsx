import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { bookTitles } from '@/data/spells';

const BookNavigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-heading text-xl text-primary hover:text-primary/80 transition-colors">
            霍格沃茨魔法学院
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <NavItem to="/" isActive={currentPath === '/'}>
              首页
            </NavItem>
            {Object.entries(bookTitles).map(([book, title]) => (
              <NavItem
                key={book}
                to={`/book/${book}`}
                isActive={currentPath === `/book/${book}`}
              >
                <span className="hidden sm:inline">{title}</span>
                <span className="sm:hidden">卷{book}</span>
              </NavItem>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

interface NavItemProps {
  to: string;
  isActive: boolean;
  children: React.ReactNode;
}

const NavItem = ({ to, isActive, children }: NavItemProps) => {
  return (
    <Link to={to} className="relative flex-shrink-0">
      <motion.span
        className={`px-3 py-2 text-sm rounded-lg block transition-colors whitespace-nowrap ${
          isActive
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {children}
      </motion.span>
      {isActive && (
        <motion.div
          className="absolute -bottom-[1px] left-1/2 w-6 h-0.5 rounded-full bg-primary"
          layoutId="book-nav-indicator"
          style={{ x: '-50%' }}
        />
      )}
    </Link>
  );
};

export default BookNavigation;
