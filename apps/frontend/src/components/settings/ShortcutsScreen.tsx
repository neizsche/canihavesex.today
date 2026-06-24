import * as React from 'react';
import { Copy, Lock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiJson } from '@/lib/api';
import { Button } from '@/components/common/ui/button';
import { ActionSheet } from '@/components/common/ui/action-sheet';
import { InsetGroup } from '@/components/common/ui/inset-group';
import { useSession } from '@/hooks/queries/useSession';
import { useBillingStatus } from '@/hooks/queries/useBillingStatus';
import { SettingsSubScreen } from './SettingsSubScreen';

const SHORTCUT_INSTALL_URL = 'https://example.com/shortcut';

type ApiKey = {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

function formatShortDate(value?: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Apple Shortcuts — generate / regenerate / revoke the single API key that lets
 * a Shortcut POST today's log. Its own pushed screen; the shared demo account
 * is read-only here (server-enforced too).
 */
export function ShortcutsScreen({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: billing } = useBillingStatus();
  const isDemo = billing?.state === 'demo';

  const [apiKeyBusy, setApiKeyBusy] = React.useState(false);
  const [newApiKey, setNewApiKey] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [revokeTarget, setRevokeTarget] = React.useState<ApiKey | null>(null);
  const [regenConfirmOpen, setRegenConfirmOpen] = React.useState(false);
  const [demoLockOpen, setDemoLockOpen] = React.useState(false);

  const apiKeysQuery = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiJson<{ keys: ApiKey[] }>('/api/v1/keys'),
    enabled: !!session?.userId,
    staleTime: 10_000,
  });

  const apiKeys = (apiKeysQuery.data?.keys ?? []).filter((key) => !key.revokedAt);
  const activeKey = apiKeys[0] ?? null;

  async function createApiKey(regenerate = false) {
    setApiKeyBusy(true);
    setCopiedKey(false);
    try {
      const data = await apiJson<{
        key: string;
        keyId: string;
        keyPrefix: string;
        name: string;
        createdAt: string;
      }>('/api/v1/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      });
      setNewApiKey(data.key);
      // The POST already returns the new key — write it into cache directly
      // instead of triggering a redundant GET. On regenerate the server revoked
      // all prior keys, so replace the list rather than appending.
      const newEntry: ApiKey = {
        id: data.keyId,
        name: data.name,
        keyPrefix: data.keyPrefix,
        createdAt: data.createdAt,
        lastUsedAt: null,
        revokedAt: null,
      };
      queryClient.setQueryData<{ keys: ApiKey[] }>(['api-keys'], (old) => ({
        keys: [newEntry, ...(regenerate ? [] : (old?.keys ?? []))],
      }));
    } catch {
      alert('Could not create API key. Please try again.');
    }
    setApiKeyBusy(false);
  }

  async function regenerateApiKey() {
    setRegenConfirmOpen(false);
    await createApiKey(true);
  }

  async function copyApiKey() {
    if (!newApiKey) return;
    try {
      await navigator.clipboard.writeText(newApiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 1200);
    } catch {
      alert('Copy failed. Please select the key manually.');
    }
  }

  async function revokeApiKey() {
    if (!revokeTarget) return;
    setApiKeyBusy(true);
    try {
      await apiJson(`/api/v1/keys/${revokeTarget.id}`, { method: 'DELETE' });
      if (revokeTarget.id === activeKey?.id) {
        setNewApiKey(null);
      }
      // Drop the revoked key from cache directly — no need to refetch the list.
      queryClient.setQueryData<{ keys: ApiKey[] }>(['api-keys'], (old) =>
        old ? { keys: old.keys.filter((k) => k.id !== revokeTarget.id) } : old
      );
    } catch {
      alert('Could not revoke API key. Please try again.');
    }
    setApiKeyBusy(false);
  }

  return (
    <SettingsSubScreen title="Apple Shortcuts" onBack={onBack}>
      <InsetGroup className="p-4 space-y-4" containerClassName="space-y-1">
        <div className="rounded-2xl border border-border/40 bg-white/70 dark:bg-zinc-900/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Secure Key</span>
            <span>
              {activeKey ? `Last used ${formatShortDate(activeKey.lastUsedAt)}` : 'Not connected'}
            </span>
          </div>
          {newApiKey ? (
            <textarea
              readOnly
              rows={2}
              value={newApiKey}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 bg-white/80 dark:bg-zinc-950/40 px-2 py-2 text-[12px] font-mono text-zinc-900 dark:text-zinc-100"
            />
          ) : activeKey ? (
            <div className="text-[13px] font-mono text-zinc-700 dark:text-zinc-200">
              {activeKey.keyPrefix}…
            </div>
          ) : (
            <div className="text-[13px] text-zinc-600 dark:text-zinc-300">
              Generate a key to connect Shortcuts.
            </div>
          )}
          {newApiKey && (
            <div className="text-[11px] text-amber-600/90 dark:text-amber-200/80">
              Shown once. Save it to your Shortcut now.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-9 px-4 text-sm">
            <a href={SHORTCUT_INSTALL_URL} target="_blank" rel="noreferrer">
              Install Shortcut
            </a>
          </Button>
          {!activeKey && (
            <Button
              onClick={() => (isDemo ? setDemoLockOpen(true) : createApiKey(false))}
              disabled={apiKeyBusy}
              className="h-9 px-4 text-sm"
            >
              {isDemo && <Lock className="icon-sm mr-2" />}
              Generate Key
            </Button>
          )}
          {activeKey && (
            <>
              <Button
                onClick={() => (isDemo ? setDemoLockOpen(true) : setRegenConfirmOpen(true))}
                disabled={apiKeyBusy}
                className="h-9 px-4 text-sm"
              >
                {isDemo && <Lock className="icon-sm mr-2" />}
                Regenerate Key
              </Button>
              <Button
                variant="outline"
                onClick={() => setRevokeTarget(activeKey)}
                disabled={apiKeyBusy}
                className="h-9 px-3 text-sm"
              >
                Revoke Key
              </Button>
            </>
          )}
          {newApiKey && (
            <Button
              variant="outline"
              onClick={copyApiKey}
              disabled={apiKeyBusy}
              className="h-9 px-3 text-sm"
            >
              <Copy className="icon-sm mr-2" />
              {copiedKey ? 'Copied' : 'Copy Key'}
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border/30 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
          <div>1. Add the Shortcut.</div>
          <div>2. Paste your key when prompted.</div>
          <div>3. Log with one tap from Shortcuts.</div>
        </div>
      </InsetGroup>

      <ActionSheet
        isOpen={demoLockOpen}
        onClose={() => setDemoLockOpen(false)}
        title="Not available in the demo"
        description="You're exploring the shared demo account, so this is read-only. Create your own account to connect Apple Shortcuts."
        actions={[]}
      />

      <ActionSheet
        isOpen={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="REVOKE API KEY"
        description="This key will stop working immediately."
        actions={[
          {
            label: 'Revoke Key',
            onClick: revokeApiKey,
            isDestructive: true,
          },
        ]}
      />

      <ActionSheet
        isOpen={regenConfirmOpen}
        onClose={() => setRegenConfirmOpen(false)}
        title="REGENERATE API KEY"
        description="Your old key will stop working immediately."
        actions={[
          {
            label: 'Regenerate Key',
            onClick: regenerateApiKey,
            isDestructive: true,
          },
        ]}
      />
    </SettingsSubScreen>
  );
}
