import createMemoryStore from 'src/util/createMemoryStore';
import createWidget from 'src/createWidget';
import createPanel from 'src/createPanel';
import createTabbedPanel from 'src/createTabbedPanel';
import { Renderable } from 'src/mixins/createRenderable';
import projector from 'src/projector';

/**
 * A memory store which handles the widget states
 */
const widgetStore = createMemoryStore({
	data: [
		{ id: 'title', label: 'dojo-widget Examples'},
		{ id: 'tabbed-panel' },
		{ id: 'panel-1', label: 'foo' },
		{ id: 'foo', label: 'Validus os indoles. Demoveo ventosus illum ut refoveo saepius antehabeo euismod gravis aliquam ea aliquip. Autem ratis verto. Accumsan refero capio ludus consequat tincidunt roto modo ea dolore. Ad iustum blandit.' },
		{ id: 'panel-2', label: 'bar foo qut qux quux', active: true },
		{ id: 'bar', label: 'Si at humo euismod fatua melior praesent praemitto camur foras eros. Esca multo transverbero facilisi nisl exputo nisl.' },
		{ id: 'panel-3', label: 'qat' },
		{ id: 'baz', label: 'Odio vel inhibeo nostrud. Ad duis blandit facilisi hos multo nobis quibus zelus bene. Ideo veniam eum iriure ymo.' },
		{ id: 'panel-4', label: 'baz' },
		{ id: 'qat', label: 'Sit pertineo at facilisis quidne qui et amet duis. Patria meus proprius immitto ne appellatio cogo jus. Cui genitus sudo. Suscipit abdo dignissim huic accumsan importunus inhibeo luptatum ut neque augue sagaciter. Iaceo odio exerci natu nonummy vel iaceo odio erat.' }
	]
});

const widgets: Renderable[] = [];

/**
 * Header widget
 */
widgets.push(createWidget({
	id: 'title',
	stateFrom: widgetStore,
	tagName: 'h1'
}));

const tabbedPanel = createTabbedPanel({
	id: 'tabbed-panel',
	stateFrom: widgetStore
});

widgets.push(tabbedPanel);

const panel1 = createPanel({
	id: 'panel-1',
	stateFrom: widgetStore
});

panel1.append(createWidget({
	id: 'foo',
	stateFrom: widgetStore
}));

tabbedPanel.append(panel1);

const panel2 = createPanel({
	id: 'panel-2',
	stateFrom: widgetStore
});

panel2.append(createWidget({
	id: 'bar',
	stateFrom: widgetStore
}));

tabbedPanel.append(panel2);

const panel3 = createPanel({
	id: 'panel-3',
	stateFrom: widgetStore
});

panel3.append(createWidget({
	id: 'baz',
	stateFrom: widgetStore
}));

tabbedPanel.append(panel3);

const panel4 = createPanel({
	id: 'panel-4',
	stateFrom: widgetStore
});

panel4.append(createWidget({
	id: 'qat',
	stateFrom: widgetStore
}));

tabbedPanel.append(panel4);

/* debug logging */
projector.on('schedulerender', () => { console.log('scheduleRender()'); });

/* Append widgets to projector */
projector.append(widgets);

/* Attach projector to DOM */
projector.attach();
