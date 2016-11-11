import { VNodeProperties } from 'dojo-interfaces/vdom';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { NodeAttributeFunction } from 'dojo-interfaces/widgetBases';
import createStateful from 'dojo-compose/bases/createStateful';
import { State, Stateful, StatefulOptions } from 'dojo-interfaces/bases';

export type CssTransitionMixinState = State & {
	/**
	 * The class of the CSS animation to be applied as the widget enters the dom
	 */
	enterAnimation?: string;

	/**
	 * The class of the CSS animation to be applied as the widget exits the dom
	 */
	exitAnimation?: string;
}

export interface CssTransition {
	/**
	 * An array of node attribute functions which return additional attributes that should be mixed into
	 * the final VNode during a render call
	 */
	nodeAttributes: NodeAttributeFunction[];
}

export type CssTransitionMixin<S extends CssTransitionMixinState> = CssTransition & Stateful<S>;

export interface CssTransitionMixinFactory extends ComposeFactory<CssTransitionMixin<CssTransitionMixinState>, StatefulOptions<CssTransitionMixinState>> {};

const createCssTransitionMixin: CssTransitionMixinFactory = compose({
		nodeAttributes: [
			function (this: CssTransitionMixin<CssTransitionMixinState>): VNodeProperties {
				const { enterAnimation, exitAnimation } = this.state;
				return { enterAnimation, exitAnimation };
			}
		]
	})
	.mixin(createStateful);

export default createCssTransitionMixin;
