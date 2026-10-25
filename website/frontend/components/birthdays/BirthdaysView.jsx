'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getBirthday, listBirthdays } from '@/lib/birthdays';
import { todayInTimezone } from '@/lib/dates';
import { humanizeApiError } from '@/lib/errors';

import { BirthdayCard } from './BirthdayCard';
import { BirthdayToolbar } from './BirthdayToolbar';
import { Pagination } from './Pagination';

const BirthdayFormDialog = dynamic(
  () =>
    import('./BirthdayFormDialog').then((module) => module.BirthdayFormDialog),
  { ssr: false }
);

const DeleteBirthdayDialog = dynamic(
  () =>
    import('./DeleteBirthdayDialog').then(
      (module) => module.DeleteBirthdayDialog
    ),
  { ssr: false }
);

const PAGE_SIZE = 20;

export function BirthdaysView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const today = useMemo(
    () => todayInTimezone(user?.timezone || 'UTC'),
    [user?.timezone]
  );

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('date');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState({
    open: false,
    mode: 'create',
    birthday: null,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const listTop = useRef(null);
  const firstPageRender = useRef(true);

  const openCreate = useCallback(() => {
    setDialog({ open: true, mode: 'create', birthday: null });
  }, []);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setSearch('');
      setPage(1);
      return undefined;
    }
    if (trimmed.length < 3) return undefined;

    const timer = setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setStatus('loading');
    setError('');

    listBirthdays({
      search,
      ordering,
      page,
      pageSize: PAGE_SIZE,
      signal: controller.signal,
    })
      .then(({ data, meta: pageMeta }) => {
        if (!active) return;
        setItems(data || []);
        setMeta(pageMeta);
        setStatus('ready');
        if (pageMeta?.total_pages && page > pageMeta.total_pages) {
          setPage(pageMeta.total_pages);
        }
      })
      .catch((caught) => {
        if (!active || caught?.name === 'AbortError') return;
        setError(humanizeApiError(caught));
        setStatus('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [search, ordering, page, revision]);

  useEffect(() => {
    const wantsCreate = searchParams.get('new') === '1';
    const editId = searchParams.get('edit');

    if (wantsCreate) {
      openCreate();
      router.replace('/birthdays', { scroll: false });
      return;
    }

    if (editId) {
      let active = true;
      getBirthday(editId)
        .then((birthday) => {
          if (active) {
            setDialog({ open: true, mode: 'edit', birthday });
          }
        })
        .catch((caught) => {
          if (active) toast.error(humanizeApiError(caught));
        })
        .finally(() => {
          router.replace('/birthdays', { scroll: false });
        });
      return () => {
        active = false;
      };
    }

    return undefined;
  }, [searchParams, openCreate, router, toast]);

  useEffect(() => {
    if (firstPageRender.current) {
      firstPageRender.current = false;
      return;
    }
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  function handleSaved(_saved, mode) {
    setDialog({ open: false, mode: 'create', birthday: null });
    toast.success(
      mode === 'edit' ? 'Zapisano zmiany.' : 'Dodano urodziny do listy.'
    );
    if (mode === 'create') {
      setSearchInput('');
      setSearch('');
      setOrdering('date');
      setPage(1);
    }
    setRevision((value) => value + 1);
  }

  function handleDeleted() {
    setDeleteTarget(null);
    toast.success('Usunięto urodziny.');
    if (items.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      setRevision((value) => value + 1);
    }
  }

  function handleOrderingChange(value) {
    setOrdering(value);
    setPage(1);
  }

  const showEmpty = status === 'ready' && items.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Urodziny"
        description="Wszystkie osoby, o których chcesz pamiętać."
        action={
          <Button type="button" size="sm" onClick={openCreate}>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Dodaj osobę
          </Button>
        }
      />

      <BirthdayToolbar
        search={searchInput}
        onSearchChange={setSearchInput}
        ordering={ordering}
        onOrderingChange={handleOrderingChange}
        count={meta?.count ?? 0}
      />

      <div ref={listTop} className="scroll-mt-24" />

      {status === 'error' ? (
        <Alert tone="error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setRevision((value) => value + 1)}
            >
              Spróbuj ponownie
            </Button>
          </div>
        </Alert>
      ) : null}

      {status === 'loading' ? (
        <div className="space-y-3" aria-label="Ładowanie urodzin">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-card border border-line bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {status === 'ready' && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((birthday) => (
            <BirthdayCard
              key={birthday.id}
              birthday={birthday}
              onEdit={(item) =>
                setDialog({ open: true, mode: 'edit', birthday: item })
              }
              onDelete={setDeleteTarget}
            />
          ))}
        </ul>
      ) : null}

      {status === 'ready' ? (
        <Pagination
          page={page}
          totalPages={meta?.total_pages || 0}
          onPageChange={setPage}
        />
      ) : null}

      {showEmpty && search ? (
        <EmptyState
          title="Brak wyników"
          description={`Nie znaleźliśmy osób pasujących do „${search}”. Spróbuj innej frazy.`}
          icon={
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          }
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSearchInput('')}
            >
              Wyczyść wyszukiwanie
            </Button>
          }
        />
      ) : null}

      {showEmpty && !search ? (
        <EmptyState
          title="Zacznij od pierwszej osoby"
          description="Dodaj imię i datę urodzenia. Resztą zajmiemy się my — przypomnienia, sortowanie i wyszukiwanie."
          icon={
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M8 2v4M16 2v4M3 10h18" />
              <path d="M9 16h6M12 13v6" />
            </svg>
          }
          action={
            <Button type="button" size="sm" onClick={openCreate}>
              Dodaj pierwszą osobę
            </Button>
          }
        />
      ) : null}

      {dialog.open ? (
        <BirthdayFormDialog
          open
          mode={dialog.mode}
          birthday={dialog.birthday}
          today={today}
          onClose={() =>
            setDialog({ open: false, mode: 'create', birthday: null })
          }
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteBirthdayDialog
          open
          birthday={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}
