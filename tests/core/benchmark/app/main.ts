import { renderer, w } from '../../../../src/core/vdom';

import App from './App';

const root = document.getElementById('main') || undefined;

const r = renderer(() => w(App, {}));
r.mount({ domNode: root });
