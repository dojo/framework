import { VNode, h, VNodeProperties } from 'maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable, { Destroyable } from 'dojo-compose/mixins/createDestroyable';
import { Handle } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import { assign } from 'dojo-core/lang';
import WeakMap from 'dojo-shim/WeakMap';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createParentListMixin, { ParentListMixin, ParentListMixinOptions } from './mixins/createParentListMixin';
import createRenderableChildrenMixin from './mixins/createRenderableChildrenMixin';
import createStatefulChildrenMixin, { StatefulChildrenState, StatefulChildrenOptions } from './mixins/createStatefulChildrenMixin';
import { Child } from './mixins/interfaces';
import { Projector } from './projector';
import css from './themes/structural/modules/ResizePanel';

/* TODO: Abstract logic to a mixin */

export interface ResizePanelState extends WidgetState, StatefulChildrenState {
	width?: string;
	height?: string;
}

export type ResizePanelOptions = WidgetOptions<ResizePanelState> & ParentListMixinOptions<Child> & StatefulChildrenOptions<Child, ResizePanelState>;

export interface ResizePanelMixin {
	tagNames: {
		handle: string;
	};
	width: string;
	height: string;
}

export type ResizePanel = Widget<ResizePanelState> & ParentListMixin<Child> & Destroyable & ResizePanelMixin;

export interface ResizePanelFactory extends ComposeFactory<ResizePanel, ResizePanelOptions> { }

const resizeNodePropertiesMap = new WeakMap<ResizePanel, VNodeProperties>();
const resizingMap = new WeakMap<ResizePanel, {
	width: number,
	height: number,
	clientX: number,
	clientY: number
}>();

function getProjector(resizePanel: ResizePanel): Projector {
	let child: any = resizePanel;
	while (child.parent) {
		child = child.parent;
	}
	return <Projector> child;
}

function setResizeListeners(resizePanel: ResizePanel): Handle {

	let onmouseupHandle: Handle;
	let onmousemoveHandle: Handle;
	let ontouchendHandle: Handle;
	let ontouchmoveHandle: Handle;

	function onmouseupListener(evt: MouseEvent): boolean {
		if (!resizingMap.has(resizePanel)) {
			return false;
		}

		evt.preventDefault();
		resizingMap.delete(resizePanel);
		onmousemoveHandle.destroy();
		onmouseupHandle.destroy();
		resizePanel.invalidate();
		return true;
	}

	function onmousemoveListener(evt: MouseEvent): boolean {
		const original = resizingMap.get(resizePanel);
		if (!original) {
			return false;
		}

		evt.preventDefault();
		resizePanel.width = String(original.width + evt.clientX - original.clientX) + 'px';
		resizePanel.height = String(original.height + evt.clientY - original.clientY) + 'px';
		return true;
	}

	function onmousedownListener(evt: MouseEvent): boolean {
		if (!resizingMap.get(resizePanel)) {
			const projector = getProjector(resizePanel);
			if (projector && projector.document) {
				evt.preventDefault();
				resizingMap.set(resizePanel, {
					width: parseInt(resizePanel.width, 10),
					clientX: evt.clientX,
					height: parseInt(resizePanel.height, 10),
					clientY: evt.clientY
				});
				onmouseupHandle = on(projector.document, 'onmouseup', onmouseupListener);
				onmousemoveHandle = on(projector.document, 'onmousemove', onmousemoveListener);
				resizePanel.invalidate();
				return true;
			}
		}

		return false;
	}

	function ontouchendListener(evt: TouchEvent): boolean {
		const original = resizingMap.get(resizePanel);
		if (original) {
			evt.preventDefault();
			resizingMap.delete(resizePanel);
			ontouchendHandle.destroy();
			ontouchmoveHandle.destroy();
			resizePanel.invalidate();
			return true;
		}
		return false;
	}

	function ontouchmoveListener(evt: TouchEvent): boolean {
		const original = resizingMap.get(resizePanel);
		if (original && evt.touches.length === 1) {
			evt.preventDefault();
			resizePanel.width = String(original.width + evt.touches[0].clientX - original.clientX) + 'px';
			resizePanel.height = String(original.height + evt.touches[0].clientY - original.clientY) + 'px';
		}
		return false;
	}

	function ontouchstartListener(evt: TouchEvent): boolean {
		if (evt.touches.length === 1 && !resizingMap.get(resizePanel)) {
			const projector = getProjector(resizePanel);
			if (projector) {
				evt.preventDefault();
				resizingMap.set(resizePanel, {
					width: parseInt(resizePanel.width, 10),
					clientX: evt.touches[0].clientX,
					height: parseInt(resizePanel.height, 10),
					clientY: evt.touches[0].clientY
				});
				ontouchendHandle = projector.on('touchend', ontouchendListener);
				ontouchmoveHandle = projector.on('touchmove', ontouchmoveListener);
				resizePanel.invalidate();
				return true;
			}
		}
		return false;
	}

	const resizeNodeProperties = resizeNodePropertiesMap.get(resizePanel);
	const onmousedownHandle = on(resizeNodeProperties, 'onmousedown', onmousedownListener);
	const ontouchstartHandle = on(resizeNodeProperties, 'ontouchstart', ontouchstartListener);
	return {
		destroy() {
			onmousedownHandle && onmousedownHandle.destroy();
			onmouseupHandle && onmouseupHandle.destroy();
			onmousemoveHandle && onmousemoveHandle.destroy();
			ontouchstartHandle && ontouchstartHandle.destroy();
		}
	};
}

const createResizePanel: ResizePanelFactory = createWidget
	.mixin(createParentListMixin)
	.mixin(createRenderableChildrenMixin)
	.mixin(createStatefulChildrenMixin)
	.mixin({
		mixin: <ResizePanelMixin> {
			nodeAttributes: [
				function (this: ResizePanel, attributes: VNodeProperties): VNodeProperties {
					const styles = assign({}, attributes.styles);
					styles['width'] = this.width;
					styles['height'] = this.height;
					return { styles };
				}
			],

			tagNames: {
				handle: 'dojo-resize-handle'
			},

			get width(this: ResizePanel): string {
				return this.state && this.state.width ? this.state.width : '100px';
			},

			set width(value: string) {
				const resizePanel: ResizePanel = this;
				resizePanel.setState({ width: value });
			},

			get height(this: ResizePanel): string {
				return this.state && this.state.height ? this.state.height : '100px';
			},
			set height(value: string) {
				const resizePanel: ResizePanel = this;
				resizePanel.setState({ height: value });
			}
		},
		aspectAdvice: {
			after: {
				getChildrenNodes(this: ResizePanel, result: (VNode | string)[]): (VNode | string)[] {
					result.push(h(this.tagNames.handle, resizeNodePropertiesMap.get(this)));
					return result;
				}
			}
		}
	})
	.extend({
		tagName: 'dojo-panel-resize',
		classes: [ css.panel ]
	})
	.mixin({
		mixin: createDestroyable,
		initialize(instance) {
			resizeNodePropertiesMap.set(instance, {});
			instance.own(setResizeListeners(instance));
		}
	});

export default createResizePanel;
