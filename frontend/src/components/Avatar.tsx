import React, { useState, useEffect } from 'react';
import { User, X, ZoomIn } from 'lucide-react';
import { getMediaUrl } from '../api/client';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  role?: string;
  size?: AvatarSize;
  className?: string;
  clickable?: boolean;
}

const sizeClasses: Record<AvatarSize, { container: string; iconSize: number; text: string }> = {
  xs: { container: 'w-6 h-6', iconSize: 12, text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', iconSize: 15, text: 'text-xs' },
  md: { container: 'w-10 h-10', iconSize: 18, text: 'text-sm' },
  lg: { container: 'w-12 h-12', iconSize: 22, text: 'text-base' },
  xl: { container: 'w-16 h-16', iconSize: 28, text: 'text-lg' },
  '2xl': { container: 'w-20 h-20', iconSize: 34, text: 'text-xl' },
  '3xl': { container: 'w-24 h-24', iconSize: 40, text: 'text-2xl' },
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User avatar',
  name,
  role,
  size = 'md',
  className = '',
  clickable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset img error if src changes
  useEffect(() => {
    setImgError(false);
  }, [src]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const resolvedUrl = src ? getMediaUrl(src) : null;
  const showImage = Boolean(resolvedUrl && !imgError);

  const getInitials = (str?: string) => {
    if (!str || !str.trim()) return '';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name || alt);
  const sizeConfig = sizeClasses[size];

  const handleClick = (e: React.MouseEvent) => {
    if (!clickable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (clickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }
        }}
        aria-label={clickable ? `View photo of ${name || alt}` : alt}
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden select-none transition-transform ${
          clickable ? 'cursor-pointer hover:opacity-95 hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2' : ''
        } ${sizeConfig.container} ${className}`}
      >
        {showImage ? (
          <img
            src={resolvedUrl!}
            alt={alt}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        ) : initials ? (
          <div className="w-full h-full rounded-full bg-slate-800 text-slate-100 flex items-center justify-center font-semibold tracking-wide border border-slate-700">
            <span className={sizeConfig.text}>{initials}</span>
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <User size={sizeConfig.iconSize} className="stroke-[1.75]" />
          </div>
        )}
      </div>

      {/* Click-to-Enlarge Lightbox Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${name || alt}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 dark:bg-slate-950/85 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <div
            className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col items-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close photo view"
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <X size={18} />
            </button>

            {/* Photo / Fallback Display */}
            <div className="w-full flex justify-center py-2">
              {showImage ? (
                <img
                  src={resolvedUrl!}
                  alt={alt}
                  className="max-h-[65vh] w-auto max-w-full rounded-2xl object-contain shadow-sm border border-slate-100 dark:border-slate-800"
                />
              ) : (
                <div className="w-48 h-48 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-4xl shadow-md border-4 border-slate-100 dark:border-slate-700">
                  {initials || <User size={72} className="text-slate-400" />}
                </div>
              )}
            </div>

            {/* User Details */}
            {(name || role) && (
              <div className="mt-4 text-center">
                {name && <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{name}</h3>}
                {role && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {role}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
