document.addEventListener('DOMContentLoaded', async () => {
  const parts = {
    '#admin-header': '/admin/components/admin-header.html',
    '#admin-sidebar': '/admin/components/admin-sidebar.html',
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
