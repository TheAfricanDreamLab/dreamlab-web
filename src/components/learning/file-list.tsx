import type { SubmissionFile } from '@dreamlab/contracts';
import { Icon } from '@/components/ui/icons';
import { fileSize } from '@/lib/upload';

/** Attached files; each opens through /files/<id>, which checks who may see it. */
export function FileList({ files }: { files: SubmissionFile[] }) {
  if (files.length === 0) return null;
  return (
    <ul className="space-y-1.5" aria-label="Attached files">
      {files.map((f) => (
        <li key={f.id}>
          <a
            href={`/files/${f.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-field)] bg-surface px-3 py-2 ring-1 ring-line hover:ring-primary"
          >
            <Icon name="file" className="h-4 w-4 shrink-0 text-link" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-link">{f.name}</span>
            <span className="shrink-0 text-[12.5px] text-muted">{fileSize(f.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
