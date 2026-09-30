/* ==========================================================
   Taskly dashboard
   1. Data & state   2. Helpers      3. Components
   4. Pages          5. Router       6. Events
   ========================================================== */

/* ---------- 1. Data & state ---------- */
const STORAGE_KEY = "taskly-state-v1";

const defaultState = {
  user: { name: "Menna", email: "menna@example.com", notifications: true, dark: false },
  projects: [
    { name: "Website Redesign", description: "New landing page and responsive navigation." },
    { name: "Mobile App", description: "Ship the first version of the mobile app." },
    { name: "API Docs", description: "Document every endpoint for the team." },
  ],
  tasks: [
    { id: 1, title: "Design login page", project: "Website Redesign", due: "2026-09-30", status: "progress" },
    { id: 2, title: "Fix navbar bug on mobile", project: "Website Redesign", due: "2026-09-29", status: "done" },
    { id: 3, title: "Write API documentation", project: "API Docs", due: "2026-10-01", status: "todo" },
    { id: 4, title: "Review pull requests", project: "Mobile App", due: "2026-10-02", status: "progress" },
    { id: 5, title: "Deploy to staging", project: "Mobile App", due: "2026-10-04", status: "todo" },
    { id: 6, title: "Set up project repository", project: "API Docs", due: "2026-09-25", status: "done" },
    { id: 7, title: "Create app icons", project: "Mobile App", due: "2026-09-28", status: "done" },
  ],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.tasks && saved.user && saved.projects) return saved;
  } catch (error) { /* use defaults */ }
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* ignore */ }
}

let state = loadState();
let taskFilter = "all";

/* ---------- 2. Helpers ---------- */
const STATUS_LABELS = { todo: "To do", progress: "In progress", done: "Done" };
const $ = (selector) => document.querySelector(selector);

function escapeHTML(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

function formatDue(iso) {
  if (!iso) return "No due date";
  const date = new Date(iso + "T00:00:00");
  return "Due " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCounts() {
  const count = (status) => state.tasks.filter((t) => t.status === status).length;
  return { total: state.tasks.length, done: count("done"), progress: count("progress"), todo: count("todo") };
}

function applyTheme() {
  document.documentElement.dataset.theme = state.user.dark ? "dark" : "light";
}

/* ---------- 3. Reusable components ---------- */
function PageTitle(title, subtitle) {
  return `<section class="page-title"><h1>${title}</h1><p>${subtitle}</p></section>`;
}

function StatCard({ label, value, note, accent }) {
  return `
    <article class="card" style="--accent:${accent}">
      <p class="card__label">${label}</p>
      <p class="card__value">${value}</p>
      <p class="card__note">${note}</p>
    </article>`;
}

function TaskItem(task, editable = false) {
  const title = escapeHTML(task.title);
  const side = editable
    ? `<select class="select" data-status="${task.id}" aria-label="Status for ${title}">
         ${Object.entries(STATUS_LABELS)
           .map(([value, label]) => `<option value="${value}"${value === task.status ? " selected" : ""}>${label}</option>`)
           .join("")}
       </select>
       <button class="btn btn--ghost" data-delete="${task.id}" aria-label="Delete ${title}">Delete</button>`
    : `<span class="badge badge--${task.status}">${STATUS_LABELS[task.status]}</span>`;

  return `
    <li class="task">
      <div>
        <p class="task__title">${title}</p>
        <p class="task__meta">${escapeHTML(task.project)} · ${formatDue(task.due)}</p>
      </div>
      <div class="task__side">${side}</div>
    </li>`;
}

function TaskList(tasks, editable = false) {
  if (!tasks.length) return `<p class="empty">No tasks here yet.</p>`;
  return `<ul class="task-list">${tasks.map((task) => TaskItem(task, editable)).join("")}</ul>`;
}

function ProjectCard(project) {
  const tasks = state.tasks.filter((t) => t.project === project.name);
  const done = tasks.filter((t) => t.status === "done").length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return `
    <article class="card">
      <h2 class="card__title">${escapeHTML(project.name)}</h2>
      <p class="card__note">${escapeHTML(project.description)}</p>
      <div class="progress" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress__bar" style="width:${percent}%"></div>
      </div>
      <p class="card__note">${done} of ${tasks.length} tasks done (${percent}%)</p>
    </article>`;
}

/* ---------- 4. Pages ---------- */
function DashboardPage() {
  const c = getCounts();
  const percent = c.total ? Math.round((c.done / c.total) * 100) : 0;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `
    <section class="welcome">
      <h1>Welcome back, ${escapeHTML(state.user.name)}</h1>
      <p>${today}</p>
    </section>

    <section class="stats" aria-label="Statistics">
      ${StatCard({ label: "Total tasks", value: c.total, note: `${c.todo} not started yet`, accent: "#0b2a5b" })}
      ${StatCard({ label: "Completed", value: c.done, note: `${percent}% of all tasks`, accent: "#00843d" })}
      ${StatCard({ label: "In progress", value: c.progress, note: "Currently being worked on", accent: "#d98e04" })}
    </section>

    <section class="panel">
      <div class="panel__head">
        <h2>Recent tasks</h2>
        <a href="#/tasks" class="link">View all tasks</a>
      </div>
      ${TaskList(state.tasks.slice(0, 5))}
    </section>`;
}

function ProjectsPage() {
  return `
    ${PageTitle("Projects", `${state.projects.length} projects in progress`)}
    <section class="projects">${state.projects.map(ProjectCard).join("")}</section>`;
}

function TasksPage() {
  const filters = [["all", "All"], ["todo", "To do"], ["progress", "In progress"], ["done", "Done"]];
  const visible = taskFilter === "all" ? state.tasks : state.tasks.filter((t) => t.status === taskFilter);

  return `
    ${PageTitle("Tasks", "Add, update and track your work")}
    <section class="panel">
      <form class="form-row" id="taskForm">
        <label class="sr-only" for="taskTitle">Task title</label>
        <input class="input" id="taskTitle" name="title" placeholder="New task title" maxlength="80" required>
        <select class="select" name="project" aria-label="Project">
          ${state.projects.map((p) => `<option>${escapeHTML(p.name)}</option>`).join("")}
        </select>
        <input class="input" type="date" name="due" aria-label="Due date">
        <button class="btn" type="submit">Add task</button>
      </form>

      <div class="tabs">
        ${filters.map(([value, label]) =>
          `<button class="tab${taskFilter === value ? " is-active" : ""}" data-filter="${value}" aria-pressed="${taskFilter === value}">${label}</button>`
        ).join("")}
      </div>
      ${TaskList(visible, true)}
    </section>`;
}

function SettingsPage() {
  const u = state.user;
  return `
    ${PageTitle("Settings", "Manage your profile and preferences")}
    <section class="panel">
      <form class="form-stack" id="settingsForm">
        <label class="field">Name
          <input class="input" name="userName" value="${escapeHTML(u.name)}" required>
        </label>
        <label class="field">Email
          <input class="input" type="email" name="email" value="${escapeHTML(u.email)}">
        </label>
        <label class="check"><input type="checkbox" name="notifications"${u.notifications ? " checked" : ""}> Email notifications</label>
        <label class="check"><input type="checkbox" name="dark"${u.dark ? " checked" : ""}> Dark mode</label>
        <div><button class="btn" type="submit">Save changes</button></div>
        <p class="form-msg" id="settingsMsg" role="status"></p>
      </form>
    </section>`;
}

/* ---------- 5. Router (hash based) ---------- */
const ROUTES = {
  dashboard: { title: "Dashboard", view: DashboardPage },
  projects: { title: "Projects", view: ProjectsPage },
  tasks: { title: "Tasks", view: TasksPage },
  settings: { title: "Settings", view: SettingsPage },
};

function closeMenu() {
  $("#nav").classList.remove("is-open");
  $("#menuToggle").setAttribute("aria-expanded", "false");
}

function render() {
  const key = location.hash.replace("#/", "");
  const page = ROUTES[key] ? key : "dashboard";

  $("#app").innerHTML = ROUTES[page].view();
  document.title = `${ROUTES[page].title} | Taskly`;

  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.dataset.route === page;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  closeMenu();
}

/* ---------- 6. Events ---------- */
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

$("#menuToggle").addEventListener("click", () => {
  const open = $("#nav").classList.toggle("is-open");
  $("#menuToggle").setAttribute("aria-expanded", String(open));
});

document.addEventListener("submit", (event) => {
  const form = event.target;

  if (form.id === "taskForm") {
    event.preventDefault();
    const data = new FormData(form);
    const title = data.get("title").trim();
    if (!title) return;
    state.tasks.unshift({ id: Date.now(), title, project: data.get("project"), due: data.get("due"), status: "todo" });
    saveState();
    render();
    $("#taskTitle").focus();
  }

  if (form.id === "settingsForm") {
    event.preventDefault();
    const f = form.elements;
    state.user = {
      name: f.userName.value.trim() || state.user.name,
      email: f.email.value.trim(),
      notifications: f.notifications.checked,
      dark: f.dark.checked,
    };
    saveState();
    applyTheme();
    render();
    $("#settingsMsg").textContent = "Settings saved.";
  }
});

document.addEventListener("click", (event) => {
  const filterBtn = event.target.closest("[data-filter]");
  if (filterBtn) {
    taskFilter = filterBtn.dataset.filter;
    render();
    return;
  }

  const deleteBtn = event.target.closest("[data-delete]");
  if (deleteBtn) {
    state.tasks = state.tasks.filter((t) => t.id !== Number(deleteBtn.dataset.delete));
    saveState();
    render();
  }
});

document.addEventListener("change", (event) => {
  const select = event.target.closest("[data-status]");
  if (!select) return;
  const task = state.tasks.find((t) => t.id === Number(select.dataset.status));
  if (task) {
    task.status = select.value;
    saveState();
    render();
  }
});

/* ---------- Start ---------- */
applyTheme();
render();