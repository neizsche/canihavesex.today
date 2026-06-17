import * as React from 'react';
import { ChevronRight, Mail, FileText, Shield, ExternalLink } from 'lucide-react';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { BRAND, CONTACT_EMAIL } from '@/lib/siteConfig';
import { Header } from '@/components/common/Header';
import { BrandTitle } from '@/components/common/BrandTitle';

interface HelpScreenProps {
  onBack: () => void;
}

export function HelpScreen({ onBack }: HelpScreenProps) {
  return (
    <div className="h-full bg-background font-sans flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header with Back Button */}
      <Header onBack={onBack} title="Help" />

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="pb-24 pt-8">
          <div className="max-w-md mx-auto space-y-8">
            {/* Hero Section */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-24 h-24 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="App Logo"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              </div>
              <div className="text-center space-y-1">
                <BrandTitle
                  className="text-2xl justify-center text-zinc-900 dark:text-zinc-100"
                  showLogo={false}
                />
              </div>
            </div>

            {/* Support Links */}
            <div className="space-y-6">
              <InsetGroup title="Contact">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="w-full h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div className="font-normal text-[17px] text-zinc-900 dark:text-zinc-100">
                      Contact Support
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </a>
              </InsetGroup>

              <InsetGroup title="Legal">
                <div className="space-y-0 divide-y divide-border/30">
                  <a
                    href="/terms?ref=app"
                    target="_blank"
                    className="w-full h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-zinc-500 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div className="font-normal text-[17px] text-zinc-900 dark:text-zinc-100">
                        Terms of Service
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </a>
                  <a
                    href="/privacy?ref=app"
                    target="_blank"
                    className="w-full h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-zinc-500 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      <div className="font-normal text-[17px] text-zinc-900 dark:text-zinc-100">
                        Privacy Policy
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </a>
                </div>
              </InsetGroup>

              <InsetGroup title="About">
                <a
                  href="https://canihavesex.today?ref=app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-12 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 transition-all duration-200 active:bg-zinc-200 dark:active:bg-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-purple-500 flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-white" />
                    </div>
                    <div className="font-normal text-[17px] text-zinc-900 dark:text-zinc-100">
                      Website
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] text-zinc-400">canihavesex.today</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                </a>
              </InsetGroup>
            </div>

            <div className="text-center px-4 pt-4">
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                © 2026 {BRAND.PREFIX}
                {BRAND.HIGHLIGHT}
                {BRAND.SUFFIX}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
