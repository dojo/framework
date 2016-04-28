import { VNode } from 'maquette/maquette';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable, { Destroyable } from 'dojo-compose/mixins/createDestroyable';
import { ParentMixin } from './createParentMixin';

export interface RenderFunction {
	(): VNode;
}

export interface RenderableOptions {
	/**
	 * A render function to be used.
	 */
	render?: RenderFunction;

	tagName?: string;

	parent?: ParentMixin<any>;
}

export interface Renderable extends Destroyable {
	/**
	 * Takes no arguments and returns a VNode
	 */
	render(): VNode;

	tagName: string;

	parent?: ParentMixin<this>;
}

export interface RenderableFactory extends ComposeFactory<Renderable, RenderableOptions> { }

export function isRenderable(value: any): value is Renderable {
	return value && typeof value.render === 'function';
}

const createRenderable: RenderableFactory = compose<any, RenderableOptions>({
		render: <RenderFunction> null,

		tagName: 'div'
	}, (instance, options) => {
		if (options && options.tagName) {
			instance.tagName = options.tagName;
		}
	})
	.mixin({
		mixin: createDestroyable,
		initialize(instance: Renderable, options: RenderableOptions) {
			if (options) {
				if (options.render) {
					instance.render = options.render;
				}
				if (options.tagName) {
					instance.tagName = options.tagName;
				}
				if (options.parent) {
					options.parent.append(instance);
				}
			}
		}
	});

export default createRenderable;
