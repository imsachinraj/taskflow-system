import clsx from 'clsx';

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

const getColor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

export default function Avatar({ user, size = 'md', className = '', showStatus = false }) {
  const initials = user?.initials || user?.name?.slice(0, 2).toUpperCase() || '?';
  const color = getColor(user?.name || '');

  return (
    <div className={clsx('relative inline-flex', className)}>
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={clsx('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
            sizes[size],
            color
          )}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-secondary)]" />
      )}
    </div>
  );
}

export function AvatarGroup({ users = [], max = 4, size = 'sm' }) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  return (
    <div className="flex -space-x-2">
      {visible.map((user) => (
        <Avatar key={user._id || user.id} user={user} size={size} className="ring-2 ring-[var(--bg-card)]" />
      ))}
      {overflow > 0 && (
        <div className={clsx(
          'rounded-full bg-[var(--bg-hover)] ring-2 ring-[var(--bg-card)] flex items-center justify-center text-xs font-medium text-[var(--text-secondary)]',
          sizes[size]
        )}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
