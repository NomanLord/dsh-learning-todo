# Learning todo for DeepSeek Harness

A learning task list that lives in the left sidebar. Add a task, tick it off, and archive
every ticked task into a completed list you can reopen at any time. The list is stored in
this browser, so it survives switching sessions, reloading the page, and restarting the app.

**中文**：[跳到中文说明](#中文说明)

## What it registers

One client-side seat, no page and no navigation entry:

| Slot | What appears |
| --- | --- |
| `sidebar.footer.action` | A framed card at the sidebar foot, directly under the Workspace block |

The card's header row (icon, title, open-task count, caret) stays visible; the list folds out
**inside the same frame**, the way the theme's other sidebar blocks wrap their rows. Click the
header or press <kbd>Esc</kbd> to fold it back. Collapsed to an icon rail by the host, the
card reduces to its icon.

The frame reuses the theme's own `--fz3-edge-w` / `--fz3-edge` custom properties, so its border
weight and colour follow the active theme instead of hard-coding a colour. Its corner radius is
25px, matching the Workspace block that the Fairy Ⅲ skin draws above it; change `--ltf-radius`
on `.ltf-root` to match a different skin.

## What it does

- **Add** — type a task, press <kbd>Enter</kbd> or click the add button.
- **Complete** — click a row's checkbox or the row itself; done rows are struck through.
- **Archive** — one button moves every ticked task into the completed group, newest first. It
  shows how many tasks it will move and is disabled when nothing is ticked.
- **Review** — the completed group is collapsible and shows the day each task was archived.

Archived tasks are read-only: this plugin adds, completes, archives, and reviews. It does not
rename, reopen, or delete. There is no server half and no model request.

## Where the data lives

The list is kept in this browser's `localStorage` under `dsh.learning-todo.v1` — one list per
browser origin. A different host origin (another port, for example) starts from the seeded list,
and clearing the site's browser data removes it. Nothing is uploaded anywhere.

## Install

From a clone of this repository, in a DSH session:

```text
plugin_manager install_bundle  target=<path to this clone>
```

or on the command line:

```powershell
dsh plugin --profile desktop add <path to this clone>
```

Restart DSH after installing; the sidebar card appears at the foot, under the Workspace block.

## Uninstall

Remove the bundle from the profile. The sidebar card disappears; the saved list is left in
`localStorage` and is not deleted.

## Requirements

- DeepSeek Harness with the sidebar and layout plugins (`@deepseek-ai/dsh-client-ui-sidebar`,
  `@deepseek-ai/dsh-client-ui-layout`) — the host half injects into them.
- No runtime dependencies, no build step: the client half is one hand-written ESM file.

## License

MIT — see [LICENSE](LICENSE).

---

## 中文说明

一个常驻在左侧栏的学习待办面板：新增任务、勾选完成，一键把勾完的任务归档进「已完成」列表，
随时可回看。数据保存在本机浏览器里，切换会话、刷新页面、重启应用都不会丢。

**只是界面**：注册一个 `sidebar.footer.action` 座位，在「工作区」正下方画一张带描边的卡片；
没有独立页面，导航列表里也不会多一项。表头（图标、标题、未完成数、折叠箭头）常驻，列表在同一
个框内展开；点表头或按 <kbd>Esc</kbd> 收起。侧栏被收成图标轨时，卡片只留图标。

**能做什么**：新增任务；勾选完成（完成的行划线）；一键归档所有已勾选任务（按钮上带数量，没有
勾选时禁用）；展开「已完成」分组查看归档日期。归档后只读——不提供改名、重新打开、删除。

**边框与圆角**：复用主题的 `--fz3-edge-w` / `--fz3-edge`，换主题不用改代码；圆角 25px，与
Fairy Ⅲ 皮肤画在它上方的「工作区」整块一致，换皮肤时改 `.ltf-root` 上的 `--ltf-radius` 即可。

**数据**：存在浏览器的 `localStorage`，键名 `dsh.learning-todo.v1`，按 origin 各存一份；不联网、
不调用模型。卸载插件不会删除这份数据。

**安装**：在 DSH 会话里 `plugin_manager install_bundle target=<克隆目录>`，或
`dsh plugin --profile desktop add <克隆目录>`，然后重启 DSH。
