(function () {
  'use strict';

  var hostname = window.location.hostname;
  var isSymphoniaDev = hostname === 'symphonia-dev-488613.web.app'
    || hostname.indexOf('symphonia-dev-488613--') === 0
    || hostname === 'localhost'
    || hostname === '127.0.0.1';
  if (!isSymphoniaDev) return;

  function installDemoLogin() {
    if (document.getElementById('dev-demo-login')) return true;
    var submit = document.querySelector('button[type="submit"]');
    var password = document.querySelector('input[type="password"]');
    if (!submit || !password) return false;

    var button = document.createElement('button');
    button.id = 'dev-demo-login';
    button.type = 'button';
    button.className = submit.className;
    button.textContent = 'Open demo';
    button.style.marginTop = '0.75rem';
    button.style.background = 'var(--muted)';
    button.style.color = 'var(--foreground)';
    button.style.border = '1px solid var(--border)';

    var status = document.createElement('p');
    status.id = 'dev-demo-login-status';
    status.setAttribute('role', 'status');
    status.style.margin = '0.5rem 0 0';
    status.style.fontSize = '0.8rem';
    status.style.color = 'var(--muted-foreground)';

    button.addEventListener('click', async function () {
      button.disabled = true;
      button.textContent = 'Signing in…';
      status.textContent = '';
      try {
        var response = await fetch('/api/dev/demo-login', {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Open demo is unavailable.');
        var data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('email', data.email);
        localStorage.setItem('is_admin', String(Boolean(data.is_admin)));
        localStorage.setItem('role', data.role || (data.is_admin ? 'platform_admin' : 'expert'));
        window.location.assign('/');
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Open demo failed.';
        button.disabled = false;
        button.textContent = 'Open demo';
      }
    });

    submit.insertAdjacentElement('afterend', button);
    button.insertAdjacentElement('afterend', status);
    return true;
  }

  function installFastDevModel() {
    if (window.location.pathname.indexOf('/summary') === -1) return true;
    var select = document.getElementById('model-select');
    if (!select) return false;

    var fastModel = 'google/gemini-2.5-flash-lite';
    var active = true;
    var timer = null;

    function stop() {
      active = false;
      if (timer) window.clearInterval(timer);
    }

    function applyDefault() {
      if (!active || select.value === fastModel) return;
      var descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      if (descriptor && descriptor.set) descriptor.set.call(select, fastModel);
      else select.value = fastModel;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    select.addEventListener('pointerdown', stop, { once: true });
    select.addEventListener('keydown', stop, { once: true });
    applyDefault();
    timer = window.setInterval(applyDefault, 250);
    window.setTimeout(stop, 5000);
    return true;
  }

  function installWhenAvailable(installer) {
    if (installer()) return;
    var observer = new MutationObserver(function () {
      if (!installer()) return;
      observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () { observer.disconnect(); }, 10000);
  }

  installWhenAvailable(installDemoLogin);
  installWhenAvailable(installFastDevModel);
})();
