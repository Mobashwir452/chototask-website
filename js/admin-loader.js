document.addEventListener('DOMContentLoaded', async () => {
  const parts = {
    '#admin-header': '/components-admin/admin-header.html',
    '#admin-sidebar': '/components-admin/admin-sidebar.html',
    '#admin-footer': '/components-admin/admin-footer.html',
  };
  const load = async (sel, url) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const r = await fetch(url);
    el.innerHTML = await r.text();
  };
  await Promise.all(Object.entries(parts).map(([s,u]) => load(s,u)));
  document.dispatchEvent(new Event('adminComponentsLoaded'));
});
