'use client';

import { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, ExternalLink, X, HelpCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    // Capture install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuideModal(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowGuideModal(true);
      }
    } else {
      // If browser hasn't fired beforeinstallprompt yet or requires user action from menu
      setShowGuideModal(true);
    }
  }

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={
          className ||
          'flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-[0.98]'
        }
      >
        <Smartphone className="h-4 w-4 shrink-0 text-white" />
        <span>Install App on Android</span>
      </button>

      {/* Android Install Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl text-foreground">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-primary">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Install on Android</h3>
                <p className="text-xs text-muted-foreground">Easy 3-step home screen installation</p>
              </div>
            </div>

            <div className="space-y-3.5 rounded-2xl bg-secondary/50 p-4 text-xs">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <p className="pt-0.5">
                  Tap the <strong className="text-foreground">three dots (⋮)</strong> at the top-right corner of Chrome.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <p className="pt-0.5">
                  Select <strong className="text-primary font-semibold">&ldquo;Install app&rdquo;</strong> or <strong className="text-primary font-semibold">&ldquo;Add to Home screen&rdquo;</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <p className="pt-0.5">
                  Tap <strong className="text-foreground">&ldquo;Install&rdquo;</strong> in the confirmation popup. MultiFundManage will appear on your phone like a native app!
                </p>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
              >
                Got It, Open Chrome Menu (⋮)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
