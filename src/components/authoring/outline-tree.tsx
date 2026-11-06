'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { ItemIcon } from '@/components/learning/course-ui';
import { Icon } from '@/components/ui/icons';
import { cx } from '@/components/ui/primitives';
import { type ItemDoc, ITEM_TYPES, type ItemType, type ModuleDoc } from '@/lib/authoring';
import { ITEM_NAMES, type Selection, sameSel, selKey } from '@/lib/course-outline';

/*
 * The course outline (CAT-5): modules and their items as a tree beside the editor. Drag to reorder
 * modules, or items within and between modules (or use the keyboard: Space to pick up, arrows to
 * move, Space to drop). Each row shows its problems; its menu duplicates, moves or removes it.
 */

const itemId = (m: number, i: number) => `item:${m}:${i}`;
const moduleId = (m: number) => `mod:${m}`;
const parse = (id: string) => {
  const [kind, a, b] = id.split(':');
  return kind === 'item' ? { kind: 'item' as const, m: Number(a), i: Number(b) } : { kind: 'mod' as const, m: Number(a) };
};

function Grip(props: React.ComponentProps<'button'> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <button
      type="button"
      aria-label={label}
      {...rest}
      className="grid h-7 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-faint opacity-60 hover:bg-surface hover:text-muted hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
    >
      <svg viewBox="0 0 8 14" className="h-3.5 w-2" aria-hidden fill="currentColor">
        {[2, 7, 12].flatMap((y) => [<circle key={`a${y}`} cx="2" cy={y} r="1.2" />, <circle key={`b${y}`} cx="6" cy={y} r="1.2" />])}
      </svg>
    </button>
  );
}

/** A small menu of actions behind a "⋯" button. Closes on Escape or a click elsewhere. */
export function RowMenu({ label, items }: { label: string; items: ({ label: string; onSelect: () => void; danger?: boolean; disabled?: boolean } | 'divider')[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        // Escape closes this menu only, not a drawer or dialog around it.
        e.preventDefault();
        setOpen(false);
      } else if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close, true);
    };
  }, [open]);
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cx('grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink', open ? 'bg-surface opacity-100' : 'opacity-60 focus-visible:opacity-100 group-hover:opacity-100')}
      >
        <Icon name="dots" className="h-4 w-4" />
      </button>
      {open && (
        <div id={id} role="menu" className="absolute right-0 top-8 z-30 min-w-48 overflow-hidden rounded-[var(--radius-field)] bg-card py-1 shadow-[var(--shadow-panel)] ring-1 ring-line">
          {items.map((it, k) =>
            it === 'divider' ? (
              <div key={k} className="my-1 h-px bg-line" role="separator" />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cx('block w-full px-3 py-2 text-left text-[13.5px] hover:bg-surface disabled:opacity-40', it.danger ? 'text-danger-ink' : 'text-ink')}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Dot({ count, tone = 'danger' }: { count: number; tone?: 'danger' | 'gold' }) {
  if (!count) return null;
  return (
    <span
      title={`${count} thing${count === 1 ? '' : 's'} to fix`}
      className={cx('grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1 text-[10.5px] font-bold text-white', tone === 'danger' ? 'bg-danger' : 'bg-gold')}
    >
      {count}
    </span>
  );
}

function SortableRow({ id, children, disabled }: { id: string; children: (grip: ReactNode, dragging: boolean) => ReactNode; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const grip = disabled ? <span className="w-5 shrink-0" /> : <Grip ref={setActivatorNodeRef} label="Drag to move" {...attributes} {...listeners} />;
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx(isDragging && 'opacity-40')}>
      {children(grip, isDragging)}
    </div>
  );
}

export type OutlineActions = {
  addModule: () => void;
  addItem: (m: number, type: ItemType) => void;
  duplicateModule: (m: number) => void;
  removeModule: (m: number) => void;
  duplicateItem: (m: number, i: number) => void;
  removeItem: (m: number, i: number) => void;
  moveItem: (from: { m: number; i: number }, to: { m: number; i: number }) => void;
  moveModule: (from: number, to: number) => void;
};

export function OutlineTree({
  modules,
  sel,
  setSel,
  problems,
  tipCount,
  actions,
  editable,
}: {
  modules: ModuleDoc[];
  sel: Selection;
  setSel: (s: Selection) => void;
  /** Things to fix, by selection key. */
  problems: Map<string, number>;
  tipCount: number;
  actions: OutlineActions;
  editable: boolean;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const q = query.trim().toLowerCase();
  const canDrag = editable && !q;
  const totalProblems = [...problems.values()].reduce((a, b) => a + b, 0);

  const onDragStart = (e: DragStartEvent) => setDragging(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    if (!e.over || e.active.id === e.over.id) return;
    const from = parse(String(e.active.id));
    const to = parse(String(e.over.id));
    if (from.kind === 'mod') {
      if (to.kind === 'mod') actions.moveModule(from.m, to.m);
      else actions.moveModule(from.m, to.m);
      return;
    }
    // An item: onto another item takes its place; onto a module heading goes to the end of it.
    if (to.kind === 'item') actions.moveItem({ m: from.m, i: from.i }, { m: to.m, i: to.i });
    else actions.moveItem({ m: from.m, i: from.i }, { m: to.m, i: modules[to.m]?.items.length ?? 0 });
  };

  const navButton = (active: boolean) =>
    cx('flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13.5px] transition-colors', active ? 'bg-forest text-white' : 'text-body hover:bg-surface');

  const overlay = dragging ? parse(dragging) : null;
  return (
    <nav aria-label="Course outline" className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-line p-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a lesson…"
            aria-label="Find in the outline"
            className="h-9 w-full rounded-lg bg-surface pl-8 pr-2 text-[13.5px] text-ink ring-1 ring-line placeholder:text-faint focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted">
            {modules.length} module{modules.length === 1 ? '' : 's'} · {modules.reduce((n, m) => n + m.items.length, 0)} items
          </span>
          <span className="flex gap-2">
            <button type="button" className="font-semibold text-link hover:underline" onClick={() => setCollapsed(new Set())}>
              Expand all
            </button>
            <button type="button" className="font-semibold text-link hover:underline" onClick={() => setCollapsed(new Set(modules.map((_, m) => String(m))))}>
              Collapse all
            </button>
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        <button type="button" onClick={() => setSel({ kind: 'details' })} aria-current={sel.kind === 'details' ? 'true' : undefined} className={navButton(sel.kind === 'details')}>
          <Icon name="gear" className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate font-semibold">Course details</span>
          <Dot count={problems.get('details') ?? 0} />
        </button>
        <button type="button" onClick={() => setSel({ kind: 'checklist' })} aria-current={sel.kind === 'checklist' ? 'true' : undefined} className={navButton(sel.kind === 'checklist')}>
          <Icon name="check" className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate font-semibold">Ready to publish</span>
          {totalProblems > 0 ? <Dot count={totalProblems} /> : tipCount > 0 ? <Dot count={tipCount} tone="gold" /> : <span className="text-[11px] font-bold text-primary">✓</span>}
        </button>
        <div className="my-2 h-px bg-line" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <SortableContext items={modules.map((_, m) => moduleId(m))} strategy={verticalListSortingStrategy}>
            {modules.map((mod, m) => {
              const items = mod.items.map((it, i) => ({ it, i })).filter(({ it }) => !q || it.title.toLowerCase().includes(q) || mod.title.toLowerCase().includes(q));
              if (q && items.length === 0 && !mod.title.toLowerCase().includes(q)) return null;
              const open = !collapsed.has(String(m)) || !!q;
              const modProblems = (problems.get(selKey({ kind: 'module', m })) ?? 0) + mod.items.reduce((n, _, i) => n + (problems.get(selKey({ kind: 'item', m, i })) ?? 0), 0);
              return (
                <SortableRow key={`m-${m}`} id={moduleId(m)} disabled={!canDrag}>
                  {(grip) => (
                    <div className="pb-1">
                      <div className={cx('group flex items-center gap-0.5 rounded-lg pr-1', sameSel(sel, { kind: 'module', m }) ? 'bg-success-tint' : 'hover:bg-surface')}>
                        {grip}
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${open ? 'Collapse' : 'Expand'} module ${m + 1}`}
                          onClick={() =>
                            setCollapsed((c) => {
                              const n = new Set(c);
                              if (n.has(String(m))) n.delete(String(m));
                              else n.add(String(m));
                              return n;
                            })
                          }
                          className="grid h-7 w-6 shrink-0 place-items-center text-muted"
                        >
                          <span className={cx('text-[10px] transition-transform', open ? 'rotate-90' : '')} aria-hidden>
                            ▶
                          </span>
                        </button>
                        <button type="button" onClick={() => setSel({ kind: 'module', m })} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">M{m + 1}</span>
                          <span className="truncate text-[13.5px] font-bold text-ink">{mod.title || 'Untitled module'}</span>
                        </button>
                        <Dot count={modProblems} />
                        {editable && (
                          <RowMenu
                            label={`Module ${m + 1} actions`}
                            items={[
                              { label: 'Add a lesson', onSelect: () => actions.addItem(m, 'lesson') },
                              { label: 'Add a quiz', onSelect: () => actions.addItem(m, 'quiz') },
                              { label: 'Add an assignment', onSelect: () => actions.addItem(m, 'assignment') },
                              { label: 'Add a discussion', onSelect: () => actions.addItem(m, 'discussion') },
                              'divider',
                              { label: 'Move up', onSelect: () => actions.moveModule(m, m - 1), disabled: m === 0 },
                              { label: 'Move down', onSelect: () => actions.moveModule(m, m + 1), disabled: m === modules.length - 1 },
                              { label: 'Duplicate module', onSelect: () => actions.duplicateModule(m) },
                              { label: 'Remove module…', onSelect: () => actions.removeModule(m), danger: true },
                            ]}
                          />
                        )}
                      </div>
                      {open && (
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-line pl-2">
                          <SortableContext items={mod.items.map((_, i) => itemId(m, i))} strategy={verticalListSortingStrategy}>
                            {items.map(({ it, i }) => (
                              <SortableRow key={`i-${m}-${i}`} id={itemId(m, i)} disabled={!canDrag}>
                                {(igrip) => (
                                  <ItemRow
                                    item={it}
                                    grip={igrip}
                                    active={sameSel(sel, { kind: 'item', m, i })}
                                    problems={problems.get(selKey({ kind: 'item', m, i })) ?? 0}
                                    onOpen={() => setSel({ kind: 'item', m, i })}
                                    menu={
                                      editable ? (
                                        <RowMenu
                                          label={`${it.title || 'Item'} actions`}
                                          items={[
                                            { label: 'Duplicate', onSelect: () => actions.duplicateItem(m, i) },
                                            'divider',
                                            ...modules
                                              .map((target, t) => ({ target, t }))
                                              .filter(({ t }) => t !== m)
                                              .slice(0, 8)
                                              .map(({ target, t }) => ({ label: `Move to module ${t + 1}: ${target.title.slice(0, 28) || 'Untitled'}`, onSelect: () => actions.moveItem({ m, i }, { m: t, i: target.items.length }) })),
                                            ...(modules.length > 1 ? ['divider' as const] : []),
                                            { label: 'Remove…', onSelect: () => actions.removeItem(m, i), danger: true },
                                          ]}
                                        />
                                      ) : null
                                    }
                                  />
                                )}
                              </SortableRow>
                            ))}
                          </SortableContext>
                          {editable && !q && (
                            <div className="relative">
                              {adding === m ? (
                                <div className="flex flex-wrap gap-1 py-1">
                                  {ITEM_TYPES.map((t) => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => {
                                        actions.addItem(m, t);
                                        setAdding(null);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[12.5px] font-semibold text-link ring-1 ring-line hover:bg-success-tint"
                                    >
                                      <ItemIcon type={t} className="h-3.5 w-3.5" />
                                      {ITEM_NAMES[t]}
                                    </button>
                                  ))}
                                  <button type="button" onClick={() => setAdding(null)} className="px-1.5 text-[12.5px] text-muted hover:text-ink">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => setAdding(m)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-link hover:bg-success-tint">
                                  <Icon name="plus" className="h-3.5 w-3.5" /> Add to module {m + 1}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </SortableRow>
              );
            })}
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 160, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {overlay?.kind === 'item' && modules[overlay.m]?.items[overlay.i] ? (
              <div className="rounded-lg bg-card shadow-[var(--shadow-panel)] ring-1 ring-primary">
                <ItemRow item={modules[overlay.m]!.items[overlay.i]!} grip={<span className="w-5" />} active={false} problems={0} onOpen={() => undefined} menu={null} />
              </div>
            ) : overlay?.kind === 'mod' && modules[overlay.m] ? (
              <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 shadow-[var(--shadow-panel)] ring-1 ring-primary">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">M{overlay.m + 1}</span>
                <span className="truncate text-[13.5px] font-bold text-ink">{modules[overlay.m]!.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {editable && !q && (
          <button type="button" onClick={actions.addModule} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2 py-2.5 text-[13.5px] font-semibold text-link hover:bg-success-tint">
            <Icon name="plus" className="h-4 w-4" /> Add module
          </button>
        )}
        <div className="my-2 h-px bg-line" />
        <button type="button" onClick={() => setSel({ kind: 'json' })} aria-current={sel.kind === 'json' ? 'true' : undefined} className={navButton(sel.kind === 'json')}>
          <span className="w-4 shrink-0 text-center font-mono text-[11px]">{'{}'}</span>
          <span className="flex-1 truncate">Advanced: JSON</span>
        </button>
      </div>
    </nav>
  );
}

function ItemRow({ item, grip, active, problems, onOpen, menu }: { item: ItemDoc; grip: ReactNode; active: boolean; problems: number; onOpen: () => void; menu: ReactNode }) {
  return (
    <div className={cx('group flex items-center gap-0.5 rounded-lg pr-1', active ? 'bg-forest text-white' : 'hover:bg-surface')}>
      {grip}
      <button type="button" onClick={onOpen} aria-current={active ? 'true' : undefined} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
        <ItemIcon type={item.type} className={cx('h-4 w-4', active ? 'text-white' : 'text-link')} />
        <span className={cx('truncate text-[13.5px]', active ? 'font-semibold' : 'text-ink')}>{item.title || 'Untitled'}</span>
        <span className={cx('ml-auto shrink-0 text-[11.5px]', active ? 'text-white/70' : 'text-faint')}>{item.minutes}m</span>
      </button>
      <Dot count={problems} />
      {menu}
    </div>
  );
}
