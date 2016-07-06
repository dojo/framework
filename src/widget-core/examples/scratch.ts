import { createProjector, h, VNode } from 'maquette/maquette';

let closed = false;

const panel1 = {};
const panel2 = {};
const panel3 = {};
const panel4 = {};

function render(): VNode {
	return h('dojo-panel-tabbed', {
		id: 'tabbed-panel'
	}, [
		h('ul', {}, [
			h('li', { classes: { active: false }, key: panel1 }, [ h('div.tab-label', [ 'tab 1' ]), h('div.tab-close', [ 'X' ]) ]),
			h('li', { classes: { active: closed }, key: panel2 }, [ h('div.tab-label', [ 'tab 2' ]), h('div.tab-close', [ 'X' ]) ]),
			h('li', { classes: { active: false }, key: panel3 }, [ h('div.tab-label', [ 'tab 3' ]), h('div.tab-close', [ 'X' ]) ]),
			closed
				? undefined
				: h('li', { classes: { active: !closed }, key: panel4 }, [ h('div.tab-label', [ 'tab 4' ]), h('div.tab-close', [ 'X' ]) ])
		]),
		h('div.panels', [
			undefined,
			closed
				? h('dojo-panel', { classes: { visible: true }, key: panel2 }, [ h('div#bar', [ 'tab 2' ]) ])
				: undefined,
			undefined,
			closed
				? undefined
				: h('dojo-panel', { classes: { visible: true }, key: panel4 }, [ h('div#bar', [ 'tab 4' ]) ])
		])
	]);
}

const projector = createProjector({});

projector.append(document.body, render);

const next = document.getElementById('next');

next.addEventListener('click', (event) => {
	closed = true;
	projector.scheduleRender();
});
