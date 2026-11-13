import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cx } from './cx';

const VARIANTS = {
  primary:
    'btn-sheen bg-accent text-on-accent shadow-[0_0_0_1px_rgb(var(--accent)/.5),0_8px_24px_-10px_rgb(var(--glow)/.8)] hover:bg-accent/90 active:bg-accent-strong',
  secondary: 'border border-line-strong/80 bg-raised text-fg hover:border-line-strong hover:bg-raised/70',
  quiet: 'text-fg-2 hover:bg-raised hover:text-fg',
  danger: 'border border-accent/50 bg-accent/10 text-accent-fg hover:bg-accent/20',
  dangerSolid: 'bg-accent-strong text-on-accent hover:bg-accent',
};
const SIZES = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-[15px] gap-2' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...p }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...p}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

const BASE = 'relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out active:scale-[.97] disabled:pointer-events-none disabled:opacity-45';
export const buttonClass = (variant = 'primary', size = 'md', className) => cx(BASE, VARIANTS[variant], SIZES[size], className);

/** A router link that looks like a button (no nested interactive elements). */
export const ButtonLink = ({ to, variant = 'primary', size = 'md', className, ...p }) => <Link to={to} className={buttonClass(variant, size, className)} {...p} />;

export const IconButton = forwardRef(function IconButton({ label, className, size = 'md', active, children, ...p }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'relative inline-grid shrink-0 place-items-center rounded-md text-fg-2 transition-[background-color,color,transform] duration-150 hover:bg-raised hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        active && 'bg-raised text-fg',
        className
      )}
      {...p}
    >
      {children}
    </button>
  );
});

export const Kbd = ({ children, className }) => (
  <kbd className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong/70 bg-canvas/60 px-1 font-mono text-2xs text-muted', className)}>
    {children}
  </kbd>
);
