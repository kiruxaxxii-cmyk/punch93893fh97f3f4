const ROLE_META = {
  owner: { label: 'Owner', icon: '/images/roles/admin.svg' },
  admin: { label: 'Admin', icon: '/images/roles/admin.svg' },
  moderator: { label: 'Moderator', icon: '/images/roles/moderator.svg' },
  media: { label: 'Media', icon: '/images/roles/media.svg' },
  user: { label: 'User', icon: '/images/roles/user.svg' },
};

function roleKey(role) {
  return ROLE_META[role] ? role : 'user';
}

function renderRoleBadge(role, label) {
  const key = roleKey(role);
  const meta = ROLE_META[key];
  const text = label || meta.label;
  return `<span class="role-badge role-${key}">
    <img class="role-icon" src="${meta.icon}" alt="" width="22" height="30" />
    <span class="role-text">${text}</span>
  </span>`;
}

function setRoleBadge(el, role, label) {
  if (!el) return;
  el.innerHTML = renderRoleBadge(role, label);
}

window.renderRoleBadge = renderRoleBadge;
window.setRoleBadge = setRoleBadge;
