// TypeDoc plugin adding a selector in the sidebar to switch between the
// documentation of the latest release (`/itowns/docs/`) and of the next
// version (`/itowns/dev/docs/`) deployed on itowns-project.org.
import { JSX } from 'typedoc';

const SITE = 'https://www.itowns-project.org/itowns';

const script = `(() => {
    const select = document.getElementById('itowns-version-switch');
    const match = location.pathname.match(/^(.*\\/itowns)(\\/dev)?\\/docs\\/(.*)$/);
    const root = match ? match[1] : '${SITE}';
    const page = match ? match[3] : '';
    if (match) { select.value = match[2] ? 'next' : 'latest'; }
    select.addEventListener('change', async () => {
        const home = root + (select.value === 'next' ? '/dev' : '') + '/docs/';
        let target = home + page + location.hash;
        try {
            const res = await fetch(home + page, { method: 'HEAD' });
            if (!res.ok) { target = home; }
        } catch (e) {
            target = home;
        }
        location.href = target;
    });
})();`;

/** @param {import('typedoc').Application} app */
export function load(app) {
    app.renderer.hooks.on('sidebar.begin', () => JSX.createElement(
        'div',
        { class: 'itowns-version-switch', style: 'margin-bottom: 1rem;' },
        JSX.createElement('label', { for: 'itowns-version-switch' }, 'Version: '),
        JSX.createElement(
            'select',
            {
                id: 'itowns-version-switch',
                style: 'background: var(--color-background-secondary); color: var(--color-text);'
                    + ' border: 1px solid var(--color-accent); border-radius: 4px; padding: 2px 6px;',
            },
            JSX.createElement('option', { value: 'latest' }, 'latest'),
            JSX.createElement('option', { value: 'next' }, 'next'),
        ),
        JSX.createElement('script', null, JSX.createElement(JSX.Raw, { html: script })),
    ));
}
