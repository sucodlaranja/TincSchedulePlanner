interface BadgeProps {
  color?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export default function Badge({ color, children, className = '', size = 'md' }: BadgeProps) {
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${sizeClass} ${className}`}
      style={color ? { backgroundColor: color + '20', color } : undefined}
    >
      {children}
    </span>
  )
}
