import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  LayoutDashboard,
  FileText,
  PenTool,
  LogOut,
  Compass,
  Sun,
  Moon,
  Palette,
  Keyboard,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

/**
 * Cmd+K command palette for quick navigation.
 * Renders as a modal overlay with fuzzy search.
 */
export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const close = useCallback(() => {
    setIsOpen(false);
    setShowShortcuts(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      {
        id: 'dashboard',
        label: 'Go to Dashboard',
        description: isAdmin ? 'Admin dashboard' : 'My forms',
        icon: <LayoutDashboard size={16} />,
        action: () => { navigate('/'); close(); },
        keywords: ['home', 'main', 'forms'],
      },
      {
        id: 'atlas',
        label: 'Open Atlas',
        description: 'UX exploration map',
        icon: <Compass size={16} />,
        action: () => { navigate('/atlas'); close(); },
        keywords: ['map', 'explore', 'navigation'],
      },
    ];

    if (isAdmin) {
      items.push({
        id: 'new-form',
        label: 'Create New Form',
        description: 'Start a new Delphi consultation',
        icon: <PenTool size={16} />,
        action: () => { navigate('/'); close(); },
        keywords: ['add', 'create', 'new', 'delphi'],
      });
    }

    // Theme switchers
    items.push(
      {
        id: 'theme-light',
        label: 'Switch to Light Theme',
        icon: <Sun size={16} />,
        action: () => {
          document.documentElement.setAttribute('data-theme', 'symphonia-light');
          localStorage.setItem('symphonia-theme', 'symphonia-light');
          close();
        },
        keywords: ['theme', 'light', 'bright'],
      },
      {
        id: 'theme-dark',
        label: 'Switch to Dark Theme',
        icon: <Moon size={16} />,
        action: () => {
          document.documentElement.setAttribute('data-theme', 'axiotic-dark');
          localStorage.setItem('symphonia-theme', 'axiotic-dark');
          close();
        },
        keywords: ['theme', 'dark', 'night'],
      },
      {
        id: 'theme-warm',
        label: 'Switch to Warm Theme',
        icon: <Palette size={16} />,
        action: () => {
          document.documentElement.setAttribute('data-theme', 'warm-sand');
          localStorage.setItem('symphonia-theme', 'warm-sand');
          close();
        },
        keywords: ['theme', 'warm', 'sand', 'sepia'],
      },
    );

    items.push({
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all shortcuts',
      icon: <Keyboard size={16} />,
      action: () => { setShowShortcuts(true); },
      keywords: ['help', 'keys', 'hotkeys', 'bindings', '?'],
    });

    if (user) {
      items.push({
        id: 'logout',
        label: 'Log Out',
        description: user.email,
        icon: <LogOut size={16} />,
        action: () => { logout(); close(); },
        keywords: ['sign out', 'exit'],
      });
    }

    return items;
  }, [isAdmin, user, navigate, logout, close]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter(
      cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some(k => k.includes(q))
    );
  }, [commands, query]);

  // Keyboard listener for Cmd+K and ? (shortcuts help)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          close();
        }
      }
      // ? key opens shortcuts help (only when not typing in an input)
      if (
        e.key === '?' &&
        !isOpen &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setIsOpen(true);
        setShowShortcuts(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showShortcuts, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keyboard navigation within the palette
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
      }
    },
    [filtered, activeIndex],
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.command-palette-item');
    items[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['?'], description: 'Keyboard shortcuts help' },
    { keys: ['⌘', 'Enter'], description: 'Submit form response' },
    { keys: ['↑', '↓'], description: 'Navigate lists' },
    { keys: ['Enter'], description: 'Select / confirm' },
    { keys: ['Esc'], description: 'Close dialog / cancel' },
    { keys: ['Tab'], description: 'Next field' },
  ];

  return (
    <div
      className="command-palette-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="command-palette" role="dialog" aria-label={showShortcuts ? 'Keyboard shortcuts' : 'Command palette'}>
        {showShortcuts ? (
          /* ── Keyboard shortcuts panel ── */
          <>
            <div
              style={{
                padding: '16px 20px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcuts(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-foreground)',
                  fontSize: '0.8rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--foreground)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
              >
                ← Back
              </button>
            </div>
            <div style={{ padding: '8px 12px', maxHeight: '320px', overflowY: 'auto' }}>
              {shortcuts.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 8px',
                    borderBottom: i < shortcuts.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--foreground)' }}>
                    {s.description}
                  </span>
                  <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {s.keys.map((key, j) => (
                      <span key={j}>
                        <kbd className="command-palette-kbd">{key}</kbd>
                        {j < s.keys.length - 1 && (
                          <span style={{ color: 'var(--muted-foreground)', fontSize: '0.7rem', margin: '0 2px' }}>+</span>
                        )}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div className="command-palette-footer">
              <div>
                <kbd className="command-palette-kbd">esc</kbd> close
              </div>
              <div>
                <kbd className="command-palette-kbd">?</kbd>
              </div>
            </div>
          </>
        ) : (
          /* ── Command search panel ── */
          <>
            <input
              ref={inputRef}
              type="text"
              className="command-palette-input"
              placeholder="Type a command…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              aria-autocomplete="list"
              aria-activedescendant={filtered[activeIndex]?.id}
              aria-label="Search commands"
            />

            <div className="command-palette-list" ref={listRef} role="listbox">
              {filtered.length === 0 ? (
                <div className="command-palette-empty">
                  No commands match "{query}"
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    id={cmd.id}
                    role="option"
                    aria-selected={i === activeIndex}
                    className={`command-palette-item ${i === activeIndex ? 'active' : ''}`}
                    onClick={cmd.action}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className="command-palette-item-icon">{cmd.icon}</div>
                    <div className="command-palette-item-text">
                      <span className="command-palette-item-label">{cmd.label}</span>
                      {cmd.description && (
                        <span className="command-palette-item-desc">{cmd.description}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="command-palette-footer">
              <div>
                <kbd className="command-palette-kbd">↑↓</kbd> navigate
                <kbd className="command-palette-kbd" style={{ marginLeft: 8 }}>↵</kbd> select
                <kbd className="command-palette-kbd" style={{ marginLeft: 8 }}>esc</kbd> close
              </div>
              <div>
                <kbd className="command-palette-kbd">⌘K</kbd>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
