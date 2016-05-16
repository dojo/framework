import { h, VNode } from 'maquette/maquette';
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

export interface RenderableMixin {
	/**
	 * Takes no arguments and returns a VNode
	 */
	render(): VNode;

	/**
	 * The tag name to be used
	 */
	tagName: string;

	parent?: ParentMixin<Renderable>;
}

export type Renderable = Destroyable & RenderableMixin;

export interface RenderableFactory extends ComposeFactory<Renderable, RenderableOptions> { }

export function isRenderable(value: any): value is Renderable {
	return value && typeof value.render === 'function';
}

const createRenderable: RenderableFactory = compose<RenderableMixin, RenderableOptions>({
		render() {
			const renderable: Renderable = this;
			return h(renderable.tagName);
		},

		tagName: 'div'
	}, (instance, options) => {
		if (options) {
			const { tagName, render, parent } = options;
			instance.tagName = tagName || instance.tagName;
			instance.render = render || instance.render;
			if (parent) {
				parent.append(instance);
			}
		}
	})
	.mixin(createDestroyable);

export default createRenderable;
