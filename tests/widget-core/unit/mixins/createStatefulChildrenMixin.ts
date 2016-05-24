import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStatefulChildrenMixin from 'src/mixins/createStatefulChildrenMixin';
import createRenderable, { Renderable } from 'src/mixins/createRenderable';
import Promise from 'dojo-core/Promise';
import { List } from 'immutable/immutable';

const widget1 = createRenderable();
const widget2 = createRenderable();
const widget3 = createRenderable();
const widget4 = createRenderable();

const widgetMap: { [id: string]: Renderable } = {
	widget1,
	widget2,
	widget3,
	widget4
};

const widgetRegistry = {
	stack: <(string | symbol)[]> [],
	get(id: string | symbol): Promise<Renderable> {
		widgetRegistry.stack.push(id);
		return Promise.resolve(widgetMap[id]);
	}
};

registerSuite({
	name: 'mixins/createStatefulChildrenMixin',
	beforeEach() {
		widgetRegistry.stack = [];
	},
	creation() {
		const dfd = this.async();
		const parent: any = createStatefulChildrenMixin({
			widgetRegistry,
			state: {
				children: [ 'widget1' ]
			}
		});

		setTimeout(dfd.callback(() => {
			assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
			assert.isTrue(List([ widget1 ]).equals(parent.children));
		}), 10);
	},
	setState() {
		const dfd = this.async();
		const parent: any = createStatefulChildrenMixin({
			widgetRegistry
		});

		parent.setState({ children: [ 'widget2' ] });

		setTimeout(dfd.callback(() => {
			assert.deepEqual(widgetRegistry.stack, [ 'widget2' ]);
			assert.isTrue(List([ widget2 ]).equals(parent.children));
		}), 10);
	},
	'chaching widgets'() {
		const dfd = this.async();
		const parent: any = createStatefulChildrenMixin({
			widgetRegistry
		});

		parent.setState({ children: [ 'widget1' ]});

		setTimeout(() => {
			widgetRegistry.stack = [];
			parent.setState({ children: [ 'widget1', 'widget2' ] });
			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
				assert.isTrue(List([ widget1, widget2 ]).equals(parent.children));
			}), 10);
		}, 10);
	}
});
