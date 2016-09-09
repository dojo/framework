import createMemoryStore from 'dojo-stores/createMemoryStore';
import createWidget from '../createWidget';
import createPanel from '../createPanel';
import createTabbedPanel from '../createTabbedPanel';
import { Child, RegistryProvider } from '../mixins/interfaces';
import projector from '../projector';
import Promise from 'dojo-shim/Promise';
import { ComposeFactory } from 'dojo-compose/compose';

/**
 * A memory store which handles the widget states
 */
const widgetStore = createMemoryStore({
	data: [
		{ id: 'title', label: 'dojo-widget Examples'},
		{ id: 'tabbed-panel', children: [ 'panel-1', 'panel-2', 'panel-3', 'panel-4' ] },
		{ id: 'panel-1', label: 'foo', closeable: true },
		{ id: 'foo', label: 'Validus os indoles. Demoveo ventosus illum ut refoveo saepius antehabeo euismod gravis aliquam ea aliquip. Autem ratis verto. Accumsan refero capio ludus consequat tincidunt roto modo ea dolore. Ad iustum blandit.' },
		{ id: 'panel-2', label: 'bar foo qut qux quux', active: true },
		{ id: 'bar', label: 'Si at humo euismod fatua melior praesent praemitto camur foras eros. Esca multo transverbero facilisi nisl exputo nisl.' },
		{ id: 'panel-3', label: 'qat' },
		{ id: 'baz', label: 'Odio vel inhibeo nostrud. Ad duis blandit facilisi hos multo nobis quibus zelus bene. Ideo veniam eum iriure ymo.' },
		{ id: 'panel-4', label: 'baz', closeable: true },
		{ id: 'qat', label: 'Sit pertineo at facilisis quidne qui et amet duis. Patria meus proprius immitto ne appellatio cogo jus. Cui genitus sudo. Suscipit abdo dignissim huic accumsan importunus inhibeo luptatum ut neque augue sagaciter. Iaceo odio exerci natu nonummy vel iaceo odio erat.' }
	]
});

/**
 * This is a mock of dojo/app
 */
const widgetRegistry = {
	get(id: string | symbol): Promise<Child> {
		let widget: Child;
		switch (id) {
		case 'panel-1':
			widget = panel1;
			break;
		case 'panel-2':
			widget = panel2;
			break;
		case 'panel-3':
			widget = panel3;
			break;
		case 'panel-4':
			widget = panel4;
			break;
		}
		return Promise.resolve(widget);
	},
	identify(value: Child): string | symbol {
		let id: string | symbol;
		switch (value) {
		case panel1:
			id = 'panel-1';
			break;
		case panel2:
			id = 'panel-2';
			break;
		case panel3:
			id = 'panel-3';
			break;
		case panel4:
			id = 'panel-4';
			break;
		}
		return id;
	},
	create(factory: ComposeFactory<any, any>, options?: any): Promise<[ string, Child ]> {
		return factory(options);
	}
};

const registryProvider: RegistryProvider<any> = {
	get(type: string) {
		if (type === 'widgets') {
			return widgetRegistry;
		}

		throw new Error('No such registry');
	}
};

const widgets: Child[] = [];

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
	stateFrom: widgetStore,
	registryProvider,
	listeners: {
		error(evt) {
			console.log(evt);
		},
		statechange(evt) {
			console.log(evt);
		},
		childlist(evt) {
			console.log(evt);
		}
	}
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

const panel2 = createPanel({
	id: 'panel-2',
	stateFrom: widgetStore
});

panel2.append(createWidget({
	id: 'bar',
	stateFrom: widgetStore
}));

const panel3 = createPanel({
	id: 'panel-3',
	stateFrom: widgetStore
});

panel3.append(createWidget({
	id: 'baz',
	stateFrom: widgetStore
}));

const panel4 = createPanel({
	id: 'panel-4',
	stateFrom: widgetStore
});

panel4.append(createWidget({
	id: 'qat',
	stateFrom: widgetStore
}));

/* debug logging */
projector.on('schedulerender', () => { console.log('scheduleRender()'); });

/* Append widgets to projector */
projector.append(widgets);

/* Attach projector to DOM */
projector.attach();
