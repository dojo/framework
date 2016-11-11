import createWidgetBase from '../../src/bases/createWidgetBase';
import { Widget, WidgetState } from 'dojo-interfaces/widgetBases';
import Promise from 'dojo-shim/Promise';
import { Child } from '../../src/mixins/interfaces';
import { ComposeFactory } from 'dojo-compose/compose';
import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';

export const widgetMap: Map<string | symbol, Child> = new Map<string | symbol, Child>();
const widgetIdMap: WeakMap<Child, string | symbol> = new WeakMap<Child, string | symbol>();

const widgetIds: string[] = [ 'widget1', 'widget2', 'widget3', 'widget4' ];
let widgetUID = 5;

function reset() {
	widgetMap.clear();
	widgetUID = 5;
	widgetRegistry.stack = [];

	widgetIds.forEach((id) => {
		const widget = createWidgetBase({ id });
		widget.own({
			destroy() {
				widgetMap.delete(id);
				widgetIdMap.delete(widget);
			}
		});
		widgetMap.set(id, widget);
		widgetIdMap.set(widget, id);
	});
}

const widgetRegistry = {
	reset,
	stack: <(string | symbol)[]> [],
	get(id: string | symbol): Promise<Widget<WidgetState>> {
		widgetRegistry.stack.push(id);
		const widget = widgetMap.get(id);
		if (widget) {
			return Promise.resolve(widgetMap.get(id));
		}
		else {
			return Promise.reject(new Error(`Cannot find widget with id ${id}`));
		}
	},
	identify(value: Widget<WidgetState>): string | symbol {
		const id = widgetIdMap.get(value);
		if (!id) {
			throw new Error('Cannot identify value');
		}
		else {
			return id;
		}
	},
	create<C extends Widget<WidgetState>>(factory: ComposeFactory<C, any>, options?: any): Promise<[string | symbol, C]> {;
		return Promise.resolve<[ string, C ]>([options && options.id || `widget${widgetUID++}`, factory(options)]);
	},
	has(id: string | symbol): Promise<boolean> {
		return Promise.resolve(widgetMap.has(id));
	}
};

reset();

export default widgetRegistry;
