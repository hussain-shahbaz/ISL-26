import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, X, Check, Mail, Users, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/store/toast';
import { apiErrorMessage } from '@/lib/api';
import { initialsOf, cn } from '@/lib/utils';
import { searchStudents, resolveStudentEmails, type StudentLite } from './api';

interface Props {
  selected: StudentLite[];
  onChange: (next: StudentLite[]) => void;
}

export function StudentPicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'search' | 'paste'>('search');

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  function toggle(student: StudentLite) {
    if (selectedIds.has(student.id)) {
      onChange(selected.filter((s) => s.id !== student.id));
    } else {
      onChange([...selected, student]);
    }
  }

  function remove(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  function addMany(students: StudentLite[]) {
    const map = new Map(selected.map((s) => [s.id, s]));
    students.forEach((s) => map.set(s.id, s));
    onChange([...map.values()]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Assigned students{' '}
          <span className="text-muted">({selected.length})</span>
        </span>
        <Button type="button" variant="subtle" size="sm" onClick={() => setOpen(true)}>
          <UserPlus size={15} /> Add students
        </Button>
      </div>

      {selected.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border bg-surface-2/30 p-4 text-sm text-muted">
          No students assigned yet. Add them by search or paste a list of emails.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/50 py-1 pl-1 pr-2 text-sm"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[linear-gradient(135deg,var(--brand),var(--integrity))] text-[10px] font-semibold text-[#04121a]">
                {initialsOf(s.name || s.email)}
              </span>
              <span className="max-w-[12rem] truncate" title={`${s.name} · ${s.email}`}>
                {s.name || s.email}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-muted transition-colors hover:text-risk"
                aria-label={`Remove ${s.name}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add students"
        description="Search your roster or paste a list of emails."
        footer={
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{selected.length} selected</span>
            <Button type="button" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex rounded-lg border border-border p-0.5">
          {(['search', 'paste'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors',
                mode === m ? 'bg-surface-3 text-foreground' : 'text-muted',
              )}
            >
              {m === 'search' ? <Users size={14} /> : <Mail size={14} />}
              {m === 'search' ? 'Search roster' : 'Paste emails'}
            </button>
          ))}
        </div>

        {mode === 'search' ? (
          <SearchPane selectedIds={selectedIds} onToggle={toggle} />
        ) : (
          <PastePane onResolved={addMany} />
        )}
      </Dialog>
    </div>
  );
}

function SearchPane({
  selectedIds,
  onToggle,
}: {
  selectedIds: Set<string>;
  onToggle: (s: StudentLite) => void;
}) {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['student-search', term],
    queryFn: () => searchStudents(term),
  });

  const results = data ?? [];

  return (
    <div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      <div className="mt-3 max-h-72 space-y-1.5 overflow-auto">
        {isFetching ? (
          <p className="flex items-center gap-2 p-3 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" /> Searching…
          </p>
        ) : isError ? (
          <p className="p-3 text-sm text-risk">Could not search students.</p>
        ) : results.length === 0 ? (
          <p className="p-3 text-sm text-muted">
            {term ? 'No students match that search.' : 'Start typing to find students.'}
          </p>
        ) : (
          results.map((s) => {
            const isSel = selectedIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                  isSel
                    ? 'border-brand bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]'
                    : 'border-border hover:bg-surface-2',
                )}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,var(--brand),var(--integrity))] text-[11px] font-semibold text-[#04121a]">
                  {initialsOf(s.name || s.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name || '—'}</p>
                  <p className="truncate text-xs text-muted">{s.email}</p>
                </div>
                <span
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded-md border',
                    isSel ? 'border-brand bg-brand text-[#04121a]' : 'border-muted',
                  )}
                >
                  {isSel && <Check size={13} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function PastePane({ onResolved }: { onResolved: (s: StudentLite[]) => void }) {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);

  async function resolve() {
    const emails = [...new Set(raw.split(/[\n,;\s]+/).map((e) => e.trim()).filter(Boolean))];
    if (emails.length === 0) {
      toast.error('No emails', 'Paste at least one email address.');
      return;
    }
    setLoading(true);
    try {
      const { matched, unmatched } = await resolveStudentEmails(emails);
      if (matched.length) {
        onResolved(matched);
        toast.success('Students added', `${matched.length} matched and added.`);
      }
      if (unmatched.length) {
        toast.warning('Some not found', `${unmatched.length} email(s) had no student account.`);
      }
      if (matched.length === 0 && unmatched.length === 0) {
        toast.warning('No matches', 'None of those emails matched a student.');
      }
      if (matched.length) setRaw('');
    } catch (err) {
      toast.error('Resolve failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={'student1@uni.edu\nstudent2@uni.edu, student3@uni.edu'}
        className="min-h-[160px]"
      />
      <p className="mt-2 text-xs text-muted">
        Separate emails with commas, spaces, or new lines. Only registered students are added.
      </p>
      <Button type="button" className="mt-3" onClick={resolve} disabled={loading}>
        {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Resolve and add
      </Button>
    </div>
  );
}
