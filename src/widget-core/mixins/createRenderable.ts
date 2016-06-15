import { h, VNode } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable, { Destroyable } from 'dojo-compose/mixins/createDestroyable';
import { Parent } from './interfaces';

export interface RenderFunction {
	(): VNode;
}

export interface RenderableOptions {
	/**
	 * A render function to be used.
	 */
	render?: RenderFunction;

	/**
	 * Override the widget's tagName during construction
	 */
	tagName?: string;

	/**
	 * Set the widget's parent during construction
	 */
	parent?: Parent;
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

	/**
	 * A reference to the widget's parent
	 */
	parent?: Parent;
}

export type Renderable = Destroyable & RenderableMixin;

export interface RenderableFactory extends ComposeFactory<Renderable, RenderableOptions> { }

export function isRenderable(value: any): value is Renderable {
	return value && typeof value.render === 'function';
}

const createRenderable: RenderableFactory = createDestroyable
	.mixin<RenderableMixin, RenderableOptions>({
		mixin: {
			render() {
				const renderable: Renderable = this;
				return h(renderable.tagName);
			},

			tagName: 'div'
		},
		initialize(instance, options) {
			if (options) {
				const { tagName, render, parent } = options;
				instance.tagName = tagName || instance.tagName;
				instance.render = render || instance.render;
				if (parent) {
					parent.append(instance);
				}
			}
		}
	});

export default createRenderable;
