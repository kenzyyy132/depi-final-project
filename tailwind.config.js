const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: c('canvas'),
        sidebar: c('sidebar'),
        surface: c('surface'),
        raised: c('raised'),
        field: c('field'),
        line: c('line'),
        'line-strong': c('line-strong'),
        fg: c('fg'),
        'fg-2': c('fg-2'),
        muted: c('muted'),
        faint: c('faint'),
        accent: c('accent'),
        'accent-strong': c('accent-strong'),
        'accent-fg': c('accent-fg'),
        'on-accent': c('on-accent'),
        ok: c('ok'),
        warn: c('warn'),
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: { '2xs': ['11px', '16px'] },
      borderRadius: { sm: '6px', md: '10px', lg: '14px', xl: '20px' },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        glow: '0 0 0 1px rgb(var(--accent) / .45), 0 0 24px -4px rgb(var(--glow) / .55)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)' },
      zIndex: { 60: '60', 70: '70' },
    },
  },
  plugins: [],
};
