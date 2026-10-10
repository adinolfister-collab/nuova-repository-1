import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessagesSquare, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import PageEditorial from '@/components/PageEditorial';
import EditorialBlock from '@/components/EditorialBlock';
import MagazineEssay from '@/components/MagazineEssay';
import ShareMenu from '@/components/ShareMenu';
import AppLayout from '@/components/AppLayout';
import GuestSignupCard from '@/components/GuestSignupCard';
import { cn } from '@/lib/utils';
import CommunityBoard from '@/components/community/CommunityBoard';
import CommunityDm from '@/components/community/CommunityDm';
import NotificationsBell from '@/components/community/NotificationsBell';
import ReadonlyBanner from '@/components/ReadonlyBanner';

export default function Community() {
  const { t } = useI18n();
  const { isAuthenticated, authChecked } = useAuth();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('board');
  const [pendingUser, setPendingUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setMe(u);
      } catch (e) {}
    })();
  }, []);

  // Arrivo da "Trova Supporto": apre il DM con la persona suggerita.
  useEffect(() => {
    const dmUser = location.state?.dmUser;
    if (dmUser) {
      handleDmUser(dmUser);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const isAdmin = me?.role === 'admin';

  const handleDmUser = (user) => {
    setPendingUser(user);
    setTab('messages');
  };

  return (
    <AppLayout>
      <PageHeader
        title={t('community.title')}
        subtitle={t('community.subtitle')}
        action={
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <ShareMenu
              variant="inline"
              title={t('community.title')}
              summary={t('community.subtitle')}
              path="/community"
              label={t('share.page')}
            />
          </div>
        }
      />
      <ReadonlyBanner />
      <PageEditorial pageKey="community" />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 border-b border-border">
        {[
          { key: 'board', icon: MessageSquare, label: t('community.tab_board') },
          { key: 'messages', icon: MessagesSquare, label: t('community.tab_messages') },
        ].map((x) => {
          const Icon = x.icon;
          return (
            <button
              key={x.key}
              type="button"
              onClick={() => setTab(x.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors',
                tab === x.key
                  ? 'border-terracotta text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {x.label}
            </button>
          );
        })}
      </div>

      <MagazineEssay theme="community" number="01" eyebrow={tab === 'board' ? t('community.eyebrow_board') : t('community.eyebrow_dm')} title={tab === 'board' ? t('community.board_title') : t('community.dm_title')}>
        {tab === 'board' ? (
          authChecked && !isAuthenticated ? (
            <GuestSignupCard feature="community_post" />
          ) : me ? (
            <CommunityBoard me={me} isAdmin={isAdmin} onDmUser={handleDmUser} />
          ) : (
            <div className="py-20 text-center text-muted-foreground">{t('common.loading')}</div>
          )
        ) : (
          authChecked && !isAuthenticated ? (
            <GuestSignupCard feature="dm" />
          ) : me ? (
            <CommunityDm me={me} pendingUser={pendingUser} onPendingHandled={() => setPendingUser(null)} />
          ) : (
            <div className="py-20 text-center text-muted-foreground">{t('common.loading')}</div>
          )
        )}
      </MagazineEssay>
      <EditorialBlock sectionKey="community_voice" align="right" />
    </AppLayout>
  );
}