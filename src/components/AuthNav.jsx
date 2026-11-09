import { useUser, UserButton, SignInButton } from '@clerk/react';
import { User } from 'lucide-react';
import { useCanvasStore } from '../store/useCanvasStore';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.CLERK_PUBLISHABLE_KEY;
const HAS_CLERK = Boolean(
  CLERK_KEY &&
  CLERK_KEY.startsWith('pk_')
);

function ClerkAuthButtons({ isDarkMode }) {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <div className={`p-0.5 rounded-xl border shadow-md backdrop-blur-md ${
        isDarkMode ? 'border-white/10 bg-[#18181c]/90' : 'border-neutral-200 bg-white/95'
      }`}>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg',
            },
          }}
        />
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal transition-colors shadow-md backdrop-blur-md cursor-pointer ${
          isDarkMode
            ? 'bg-[#18181c]/95 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/5'
            : 'bg-white/95 border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 shadow-neutral-200/50'
        }`}
      >
        <User size={14} strokeWidth={1.5} />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    </SignInButton>
  );
}

export default function AuthNav() {
  const isDarkMode = useCanvasStore((state) => state.isDarkMode);
  const showToast = useCanvasStore((state) => state.showToast);

  return (
    <div className="fixed top-3 sm:top-4 right-3 sm:right-4 z-40 flex items-center gap-2 select-none">
      {HAS_CLERK ? (
        <ClerkAuthButtons isDarkMode={isDarkMode} />
      ) : (
        <button
          onClick={() => {
            showToast('Set VITE_CLERK_PUBLISHABLE_KEY in .env to enable authentication');
          }}
          title="Sign in"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-normal transition-colors shadow-md backdrop-blur-md cursor-pointer ${
            isDarkMode
              ? 'bg-[#18181c]/95 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/5'
              : 'bg-white/95 border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 shadow-neutral-200/50'
          }`}
        >
          <User size={14} strokeWidth={1.5} />
          <span className="hidden sm:inline">Sign in</span>
        </button>
      )}
    </div>
  );
}
