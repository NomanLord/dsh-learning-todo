/**
 * Learning todo — browser half.
 *
 * One sidebar-foot block: a persistent, theme-framed card under the Workspace
 * section. Its header row is always visible; the list folds out inside the same
 * frame. The list lives in this browser's local storage on this machine, so it
 * survives switching sessions and reloading the page.
 *
 * Follows the slot contracts of the installed Harness:
 * - `sidebar.footer.action` (list, root): renders beside Settings at the foot,
 *   outside the sidebar's scrolling viewport — i.e. directly under Workspace.
 */
window.__ModuleLoader__.load({
  id: 'dsh-learning-todo',
  factory(require) {
    const React = require('react')
    const { useCallback, useEffect, useMemo, useRef, useState } = React
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'learningTodo'
    /** The id shared by the foot block's registration. */
    const PANEL_ID = 'learning-todo'
    /** One durable list per browser origin. */
    const STORAGE_KEY = 'dsh.learning-todo.v1'

    /**
     * The block's starting content, in order. Seeded once, when this browser
     * holds no saved list yet; a saved list is never replaced by it.
     */
    const INITIAL_TASKS = [
      '任务 1：实现 exp_to_next_level（升级经验公式）',
      '任务 2：实现 clamp_hp（血量夹取到 0 与上限之间）',
      '任务 3：实现 format_damage（拼出伤害字符串）',
      '收工：pytest 14 条测试全绿',
      '收工：git commit + push，CI 变绿',
    ]

    const zh = {
      panel: '绳匠满级之路',
      addPlaceholder: '添加一条学习任务',
      add: '添加',
      tabDone: '已完成',
      archive: '归档已完成',
      emptyActive: '没有待办任务，添加一条新的学习任务吧。',
      emptyDone: '还没有归档的任务。勾选任务后点「归档已完成」，它们会收在这里。',
      archived: '已归档',
    }

    const en = {
      panel: 'Learning todo',
      addPlaceholder: 'Add a learning task',
      add: 'Add',
      tabDone: 'Completed',
      archive: 'Archive completed',
      emptyActive: 'Nothing to do. Add a learning task.',
      emptyDone: 'No archived tasks yet. Tick tasks, then choose “Archive completed”.',
      archived: 'Archived',
    }

    // ---------------------------------------------------------------- storage

    /** The browser store, or null where a non-browser boot has none. */
    function storage() {
      try {
        return typeof localStorage === 'undefined' ? null : localStorage
      } catch {
        return null
      }
    }

    /** A fresh identifier for one task row. */
    function makeId() {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
      } catch {
        /* fall through to the timestamp form */
      }
      return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
    }

    /**
     * Rebuild one stored task, or drop it when it carries no usable title.
     * @param entry - unknown value read back from storage.
     * @returns a clean task record, or null.
     */
    function readTask(entry) {
      if (entry === null || typeof entry !== 'object') return null
      const title = typeof entry.title === 'string' ? entry.title.trim() : ''
      if (title === '') return null
      return {
        id: typeof entry.id === 'string' && entry.id !== '' ? entry.id : makeId(),
        title,
        done: entry.done === true,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : '',
        archivedAt: typeof entry.archivedAt === 'string' ? entry.archivedAt : '',
      }
    }

    /** The first-run list built from {@link INITIAL_TASKS}. */
    function seedState() {
      const now = Date.now()
      return {
        items: INITIAL_TASKS.map((title, index) => ({
          id: 'seed-' + String(index + 1),
          title,
          done: false,
          createdAt: new Date(now - (INITIAL_TASKS.length - index) * 1000).toISOString(),
          archivedAt: '',
        })),
        archive: [],
      }
    }

    /** Read the saved list, seeding the starting content when none is saved. */
    function readState() {
      const store = storage()
      if (store === null) return seedState()
      let raw = null
      try {
        raw = store.getItem(STORAGE_KEY)
      } catch {
        raw = null
      }
      if (raw === null) return seedState()
      try {
        const parsed = JSON.parse(raw)
        if (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.items) && Array.isArray(parsed.archive)) {
          return {
            items: parsed.items.map(readTask).filter(Boolean),
            archive: parsed.archive.map(readTask).filter(Boolean),
          }
        }
      } catch {
        /* a malformed record falls back to the starting content */
      }
      return seedState()
    }

    /**
     * Save the list; a full or unavailable store must not break the block.
     * @param state - current items and archive.
     */
    function writeState(state) {
      const store = storage()
      if (store === null) return
      try {
        store.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: state.items, archive: state.archive }))
      } catch {
        /* storage full or blocked: the session keeps working in memory */
      }
    }

    /**
     * One in-memory source of truth for the block, so every re-render and any
     * future surface read the same list.
     */
    const todoStore = {
      state: null,
      listeners: new Set(),

      /** The current list, read from browser storage on first use. */
      read() {
        if (this.state === null) this.state = readState()
        return this.state
      },

      /**
       * Apply one change, persist it, and repaint every subscribed surface.
       * @param fn - receives the previous list and returns the next one.
       */
      update(fn) {
        const next = fn(this.read())
        if (next === this.state) return
        this.state = next
        writeState(next)
        for (const listener of [...this.listeners]) listener(next)
      },

      /**
       * @param listener - called with the new list after every change.
       * @returns the unsubscribe function.
       */
      subscribe(listener) {
        this.listeners.add(listener)
        return () => {
          this.listeners.delete(listener)
        }
      },
    }

    /** Subscribe one component to {@link todoStore}. */
    function useTodo() {
      const [state, setSnapshot] = useState(() => todoStore.read())
      useEffect(() => todoStore.subscribe(setSnapshot), [])
      const update = useCallback((fn) => {
        todoStore.update(fn)
      }, [])
      return [state, update]
    }

    /**
     * Short archived-on stamp for a completed row.
     * @param value - ISO timestamp, possibly empty or malformed.
     * @returns the localized day, or an empty string when there is none.
     */
    function archiveStamp(value) {
      if (typeof value !== 'string' || value === '') return ''
      const time = Date.parse(value)
      if (Number.isNaN(time)) return ''
      try {
        return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(time)
      } catch {
        return ''
      }
    }

    // ------------------------------------------------------------------- view

    /**
     * Styles for the sidebar-foot block. The frame reuses the theme's own edge
     * variables so it matches the Workspace block; rows reuse the section's
     * 9px inset so their text lines up with the workspace rows above.
     *
     * 圆角跟「工作区」整块一致：工作区是 [class*="GAkraW_root"]，Fairy 的皮肤在
     * 「圆角：固定值」段里把它压到 25px，所以这里也写 25px —— 用 --dsw-radius-lg
     * （16px）会明显比上面那块方。改工作区圆角时同步改这一处。
     */
    const FOOT_CSS = [
      '.ltf-root{flex:none;width:100%;min-width:0;margin-top:6px;--ltf-radius:25px}',
      '.ltf-block{box-sizing:border-box;width:100%;border:var(--fz3-edge-w,0.5px) solid var(--fz3-edge,var(--dsw-alias-border-l4));border-radius:var(--ltf-radius);background:transparent;overflow:hidden;color:var(--dsw-alias-label-primary)}',
      '.ltf-headrow{display:flex;align-items:center;gap:8px;width:100%;height:34px;padding:0 9px;border:0;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:500;cursor:pointer;text-align:left}',
      '@media (hover:hover){.ltf-headrow:hover{background:var(--dsw-alias-interactive-bg-hover)}}',
      '.ltf-headlabel{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ltf-headcount{margin-left:auto;font-size:12px;line-height:16px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.ltf-caret{flex:none;font-size:10px;line-height:1;color:var(--dsw-alias-label-tertiary)}',
      '.ltf-panel{display:flex;flex-direction:column;min-height:0;max-height:min(46vh,420px);border-top:0.5px solid var(--dsw-alias-border-l1)}',
      '.ltf-add{display:flex;flex:none;align-items:center;gap:6px;padding:8px 9px}',
      '.ltf-input{flex:1;min-width:0;height:28px;padding:0 8px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;font-size:13px;outline:0}',
      '.ltf-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.ltf-add-btn{flex:none;height:28px;padding:0 10px;border:0;border-radius:8px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;font-size:12px;cursor:pointer}',
      '.ltf-add-btn:disabled{opacity:.45;cursor:default}',
      '.ltf-body{flex:1;min-height:0;overflow:auto;padding:0 0 6px}',
      '.ltf-sec{display:flex;align-items:center;gap:6px;width:100%;height:26px;margin-top:2px;padding:0 9px;border:0;border-radius:0;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;cursor:pointer;text-align:left}',
      '@media (hover:hover){.ltf-sec:hover{background:var(--dsw-alias-interactive-bg-hover)}}',
      '.ltf-sec-count{margin-left:auto;font-variant-numeric:tabular-nums}',
      '.ltf-row{display:flex;align-items:center;gap:8px;min-height:28px;padding:2px 9px}',
      '@media (hover:hover){.ltf-row:hover{background:var(--dsw-alias-interactive-bg-hover)}}',
      'label.ltf-row{cursor:pointer}',
      '.ltf-row-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
      '.ltf-row.done .ltf-row-text{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}',
      '.ltf-row-date{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.ltf-mark{flex:none;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent);color:var(--dsw-alias-state-success-primary)}',
      '.ltf-check{flex:none;width:15px;height:15px;margin:0;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}',
      '.ltf-empty{padding:12px 9px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px}',
      '.ltf-actions{display:flex;flex:none;gap:8px;padding:8px 9px;border-top:0.5px solid var(--dsw-alias-border-l1)}',
      '.ltf-archive{flex:1;height:28px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}',
      '.ltf-archive:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ltf-archive:disabled{opacity:.45;cursor:default}',
      '.ltf-root.rail{width:36px;margin:0 auto}',
      '.ltf-root.rail .ltf-headrow{justify-content:center;height:36px;padding:0}',
      '.ltf-root.rail .ltf-headlabel,.ltf-root.rail .ltf-headcount,.ltf-root.rail .ltf-caret,.ltf-root.rail .ltf-panel{display:none}',
      '.ltf-headrow:focus-visible,.ltf-input:focus-visible,.ltf-add-btn:focus-visible,.ltf-sec:focus-visible,.ltf-archive:focus-visible,.ltf-check:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
    ].join('')

    /** The block header's glyph: a check box beside two list lines. */
    function LearningTodoIcon(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 36 36',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('rect', { x: 4.75, y: 12.75, width: 10.5, height: 10.5, rx: 3, stroke: 'currentColor', strokeWidth: 2.1 }),
        h('path', {
          d: 'M7.7 18.2 9.8 20.3 12.9 16.6',
          stroke: 'currentColor',
          strokeWidth: 2.1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M19.5 15.2 31.2 15.2', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round' }),
        h('path', { d: 'M19.5 20.8 27.4 20.8', stroke: 'currentColor', strokeWidth: 2.1, strokeLinecap: 'round' }),
      )
    }

    /**
     * A nine-pixel check mark for an archived row.
     * @returns the inline glyph.
     */
    function checkGlyph() {
      return h(
        'svg',
        { width: 9, height: 9, viewBox: '0 0 12 12', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M2.4 6.3 4.7 8.6 9.6 3.6',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    /**
     * The sidebar-foot block: a persistent, theme-framed card that sits under
     * the Workspace block. Its header row is always visible; the list folds out
     * beneath it inside the same frame.
     * @param props - column state (`wide`) plus the framework locale seat.
     * @returns the framed learning-todo block.
     */
    function LearningTodoFoot(props) {
      const t = props.t
      const wide = props.wide !== false
      const [state, setState] = useTodo()
      // Collapsed by default: the framed header row is the resting state, so
      // the block never eats the Workspace area until it is asked to.
      const [open, setOpen] = useState(false)
      const [draft, setDraft] = useState('')
      const [showDone, setShowDone] = useState(true)
      const inputRef = useRef(null)

      const doneCount = useMemo(() => state.items.filter((item) => item.done).length, [state.items])

      const addTask = useCallback(() => {
        const title = draft.trim()
        if (title === '') return
        setState((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            { id: makeId(), title, done: false, createdAt: new Date().toISOString(), archivedAt: '' },
          ],
        }))
        setDraft('')
        if (inputRef.current !== null) inputRef.current.focus()
      }, [draft, setState])

      const toggleTask = useCallback(
        (id) => {
          setState((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
          }))
        },
        [setState],
      )

      const archiveDone = useCallback(() => {
        setState((prev) => {
          const moving = prev.items.filter((item) => item.done)
          if (moving.length === 0) return prev
          const stamp = new Date().toISOString()
          return {
            items: prev.items.filter((item) => !item.done),
            archive: [...moving.map((item) => ({ ...item, done: true, archivedAt: stamp })), ...prev.archive],
          }
        })
      }, [setState])

      const submit = useCallback(
        (event) => {
          event.preventDefault()
          addTask()
        },
        [addTask],
      )

      useEffect(() => {
        if (!open) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [open])

      const todoRows =
        state.items.length === 0
          ? h('div', { className: 'ltf-empty' }, t('emptyActive'))
          : state.items.map((item) =>
              h(
                'label',
                { key: item.id, className: item.done ? 'ltf-row done' : 'ltf-row' },
                h('input', {
                  type: 'checkbox',
                  className: 'ltf-check',
                  checked: item.done,
                  onChange: () => toggleTask(item.id),
                }),
                h('span', { className: 'ltf-row-text', title: item.title }, item.title),
              ),
            )

      const doneRows =
        state.archive.length === 0
          ? h('div', { className: 'ltf-empty' }, t('emptyDone'))
          : state.archive.map((item) => {
              const stamp = archiveStamp(item.archivedAt)
              return h(
                'div',
                { key: item.id, className: 'ltf-row' },
                h('span', { className: 'ltf-mark', role: 'img', 'aria-label': t('archived') }, checkGlyph()),
                h('span', { className: 'ltf-row-text', title: item.title }, item.title),
                stamp === '' ? null : h('span', { className: 'ltf-row-date' }, stamp),
              )
            })

      return h(
        'div',
        { className: wide ? 'ltf-root' : 'ltf-root rail' },
        h('style', { key: 'ltf-style', dangerouslySetInnerHTML: { __html: FOOT_CSS } }),
        h(
          'div',
          { className: 'ltf-block' },
          h(
            'button',
            {
              type: 'button',
              className: 'ltf-headrow',
              'aria-expanded': open,
              title: t('panel'),
              onClick: () => setOpen((value) => !value),
            },
            h(LearningTodoIcon, { size: 16 }),
            h('span', { className: 'ltf-headlabel' }, t('panel')),
            h('span', { className: 'ltf-headcount' }, String(state.items.length)),
            h('span', { className: 'ltf-caret' }, open ? '▾' : '▸'),
          ),
          open
            ? h(
                'div',
                { className: 'ltf-panel' },
                h(
                  'form',
                  { className: 'ltf-add', onSubmit: submit },
                  h('input', {
                    ref: inputRef,
                    type: 'text',
                    className: 'ltf-input',
                    value: draft,
                    placeholder: t('addPlaceholder'),
                    'aria-label': t('addPlaceholder'),
                    onChange: (event) => setDraft(event.target.value),
                  }),
                  h('button', { type: 'submit', className: 'ltf-add-btn', disabled: draft.trim() === '' }, t('add')),
                ),
                h(
                  'div',
                  { className: 'ltf-body' },
                  todoRows,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'ltf-sec',
                      'aria-expanded': showDone,
                      onClick: () => setShowDone((value) => !value),
                    },
                    h('span', { className: 'ltf-caret' }, showDone ? '▾' : '▸'),
                    t('tabDone'),
                    h('span', { className: 'ltf-sec-count' }, String(state.archive.length)),
                  ),
                  showDone ? doneRows : null,
                ),
                h(
                  'div',
                  { className: 'ltf-actions' },
                  h(
                    'button',
                    { type: 'button', className: 'ltf-archive', disabled: doneCount === 0, onClick: archiveDone },
                    t('archive') + ' ' + String(doneCount),
                  ),
                ),
              )
            : null,
        ),
      )
    }

    // ------------------------------------------------------------- registrations

    /**
     * Register the foot block, owned by this plugin's context so unloading
     * removes exactly it.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'learning-todo: dictionaries')

      // The foot action sits outside the sidebar's scrolling viewport, i.e.
      // directly under the Workspace section and beside Settings.
      ctx.slots.inject('sidebar.footer.action', () =>
        ctx.slots.register({ name: 'sidebar.footer.action', id: 'learning-todo-foot', locale: NS }, LearningTodoFoot),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
