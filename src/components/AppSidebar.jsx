import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuContainer, MenuItem as FluidMenuItem } from './ui/fluid-menu';
import { Menu as MenuIcon, X } from 'lucide-react';

/**
 * AppSidebar — shadcn-inspired collapsible sidebar for the Library Management System.
 * Preserves all original section names and uses the existing Tailwind/Material design tokens.
 */

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    icon: 'home',
    description: 'Dashboard overview',
  },
  {
    id: 'books',
    label: 'Books Catalog',
    icon: 'library_books',
    description: 'Browse & manage books',
  },
  {
    id: 'students',
    label: 'Student Management',
    icon: 'group',
    description: 'View & manage students',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: 'swap_horiz',
    description: 'Issue & return books',
  },
  {
    id: 'history',
    label: 'History',
    icon: 'history',
    description: 'Transaction records',
  },
];

// Sidebar context for collapse state sharing
const SidebarContext = React.createContext({ collapsed: false });

function useSidebar() {
  return React.useContext(SidebarContext);
}

/** Single nav item rendered inside the sidebar */
function SidebarNavItem({ item, activeTab, onNavigate }) {
  const { collapsed } = useSidebar();
  const isActive = activeTab === item.id;

  return (
    <div className="relative group/item">
      <button
        id={`sidebar-nav-${item.id}`}
        onClick={() => onNavigate(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={[
          'w-[95%] flex items-center gap-3 rounded-r-xl transition-all duration-200 border-none cursor-pointer relative',
          'active:scale-[0.97] select-none',
          collapsed ? 'px-0 py-3 justify-center w-full rounded-xl mx-auto' : 'px-4 py-3',
          isActive
            ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
            : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
        ].join(' ')}
      >
        {/* Active Left Border Indicator */}
        {!collapsed && isActive && (
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 dark:bg-blue-400 rounded-r-full" />
        )}

        {/* Icon */}
        <span
          className={[
            'material-symbols-outlined shrink-0 transition-all duration-200',
            isActive ? 'text-[22px]' : 'text-[22px]',
          ].join(' ')}
          style={{ fontVariationSettings: `'FILL' 0, 'wght' ${isActive ? 500 : 400}` }}
        >
          {item.icon}
        </span>

        {/* Label — hidden when collapsed */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              className="text-[13px] font-body-sm whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Active indicator dot (collapsed mode) */}
        {collapsed && isActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-on-primary-container rounded-l-full" />
        )}
      </button>

      {/* Tooltip for collapsed mode */}
      {collapsed && (
        <div
          className={[
            'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50',
            'opacity-0 group-hover/item:opacity-100 transition-opacity duration-150',
          ].join(' ')}
        >
          <div className="bg-inverse-surface text-inverse-on-surface text-[11px] font-medium whitespace-nowrap rounded-lg px-2.5 py-1.5 shadow-lg">
            {item.label}
            <div className="text-[10px] text-on-surface-variant/70 mt-0.5">{item.description}</div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-inverse-surface" />
        </div>
      )}
    </div>
  );
}

/** The sidebar rail (thin collapsed strip) toggle trigger */
function SidebarTrigger({ collapsed, onToggle }) {
  return (
    <button
      id="sidebar-toggle-btn"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={[
        'flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 dark:border-outline-variant/30 cursor-pointer transition-all duration-200',
        'bg-white dark:bg-surface-container hover:bg-slate-50 dark:hover:bg-surface-container-high text-slate-500 shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
        'active:scale-90',
      ].join(' ')}
    >
      <span
        className="material-symbols-outlined text-[18px] transition-transform duration-300"
        style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(0deg)' }}
      >
        chevron_right
      </span>
    </button>
  );
}

/**
 * AppSidebar — main export.
 *
 * Props:
 *   activeTab      {string}   — currently active route key
 *   setActiveTab   {fn}       — navigation callback
 *   onNewEntry     {fn}       — "New Entry" button callback
 *   onLogout       {fn}       — "Logout" button callback
 */
export default function AppSidebar({ activeTab, setActiveTab, onNewEntry, mobileOpen, setMobileOpen, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapse state across refreshes
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  };

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      {/* ── Mobile Overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        id="app-sidebar"
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed left-0 top-0 h-full bg-white dark:bg-surface-dim shadow-[4px_0_24px_rgba(0,0,0,0.02)] border-r border-slate-100 dark:border-outline-variant/50 z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ minWidth: sidebarWidth }}
      >
        <div className={[
          'flex items-center gap-3 mb-6 mt-4',
          collapsed ? 'px-3 justify-center' : 'px-4',
        ].join(' ')}>
          <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>auto_stories</span>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="brand-text"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="text-left overflow-hidden"
              >
                <h1 className="font-headline-sm text-[14px] leading-tight font-bold text-slate-800 dark:text-slate-200 m-0 whitespace-nowrap">
                  Central Library
                </h1>
                <p className="font-body-sm text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5 whitespace-nowrap">
                  Admin Portal
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── New Entry Button ── */}
        <div className={collapsed ? 'px-2 mb-6' : 'px-4 mb-6'}>
          <button
            id="sidebar-new-entry-btn"
            onClick={onNewEntry}
            title="New Entry"
            className={[
              'w-full py-2 bg-white dark:bg-surface border border-slate-200 dark:border-outline-variant/50 rounded-xl font-medium text-[12px] text-slate-700 dark:text-slate-300',
              'hover:bg-slate-50 dark:hover:bg-surface-container-low transition-colors cursor-pointer active:scale-[0.98]',
              'flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
              collapsed ? 'px-0' : 'px-4',
            ].join(' ')}
          >
            <span className="material-symbols-outlined text-blue-500 text-[18px]">add</span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="new-entry-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  New Entry
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* ── Navigation Links ── */}
        <nav
          id="sidebar-nav"
          className={[
            'flex-1 flex flex-col gap-1',
            collapsed ? 'px-0 items-center overflow-visible' : 'pr-3 overflow-y-auto',
          ].join(' ')}
        >
          {collapsed ? (
            <div className="flex flex-col items-center w-full mt-2 relative z-10">
              <button 
                onClick={toggleCollapsed}
                className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-slate-900 mb-2 cursor-pointer bg-transparent border-none active:scale-95 transition-transform"
                title="Expand Sidebar"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
              <div className="flex flex-col items-center -space-y-2">
                {NAV_ITEMS.map((item, index) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={item.label}
                      className={[
                        "w-[46px] h-[46px] rounded-full flex items-center justify-center border border-white dark:border-surface cursor-pointer transition-colors relative",
                        "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
                        isActive ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"
                      ].join(' ')}
                      style={{ zIndex: NAV_ITEMS.length - index }}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' ${isActive ? 600 : 400}` }}
                      >
                        {item.icon}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            NAV_ITEMS.map(item => (
              <SidebarNavItem
                key={item.id}
                item={item}
                activeTab={activeTab}
                onNavigate={setActiveTab}
              />
            ))
          )}
        </nav>

        {/* ── Logout Button ── */}
        <div className={collapsed ? "px-3 my-2" : "px-4 my-2"}>
          {collapsed ? (
            <button
              onClick={onLogout}
              title="Logout"
              className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full cursor-pointer bg-transparent border-none active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[22px]">logout</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 rounded-xl transition-all duration-200 border-none cursor-pointer px-4 py-3 bg-transparent text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-[0.98] select-none text-left"
            >
              <span className="material-symbols-outlined shrink-0 text-[22px]">logout</span>
              <span className="text-[13px] font-body-sm font-semibold whitespace-nowrap">Logout</span>
            </button>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 my-4 h-px bg-slate-100 dark:bg-outline-variant/30" />

        {/* ── Footer / Collapse Toggle ── */}
        <div className={[
          'pb-4 flex items-center',
          collapsed ? 'px-3 justify-center' : 'px-4 justify-between',
        ].join(' ')}>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="footer-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight overflow-hidden"
              >
                <div className="font-semibold text-slate-700 dark:text-slate-300">Library System</div>
                <div className="mt-0.5">v1.0</div>
              </motion.div>
            )}
          </AnimatePresence>

          <SidebarTrigger collapsed={collapsed} onToggle={toggleCollapsed} />
        </div>
      </motion.aside>

      {/* ── Dynamic spacer so main content shifts correctly ── */}
      <motion.div
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 hidden md:block"
        aria-hidden="true"
      />
    </SidebarContext.Provider>
  );
}
