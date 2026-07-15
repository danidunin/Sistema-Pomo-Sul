type IconProps = { className?: string };

function Base({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IconArea(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </Base>
  );
}

export function IconParcelas(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Base>
  );
}

export function IconMaquina(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="7" cy="17" r="3.4" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M7 17V9h3l3 3h4a2 2 0 0 1 2 2v4h-2" />
      <path d="M10.5 18h5.5" />
    </Base>
  );
}

export function IconFuncionario(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Base>
  );
}

export function IconSync(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 11A8 8 0 006.3 6.3L4 8.6M4 4v5h5" />
      <path d="M4 13a8 8 0 0013.7 4.7L20 15.4M20 20v-5h-5" />
    </Base>
  );
}

export function IconTermometro(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M10 4a2 2 0 114 0v9.5a4 4 0 11-4 0V4z" />
      <path d="M12 14v3" />
    </Base>
  );
}
