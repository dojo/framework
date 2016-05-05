import { VNode, h, VNodeProperties } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable from 'dojo-compose/mixins/createDestroyable';
import { Handle } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import WeakMap from 'dojo-core/WeakMap';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import { Child } from './mixins/createParentMixin';
import createContainerMixin, { ContainerMixin, ContainerMixinState, ContainerMixinOptions } from './mixins/createContainerMixin';
import { Projector } from './projector';

export interface ResizePanelState extends WidgetState, ContainerMixinState {
	width?: string;
}

export interface ResizePanelOptions extends WidgetOptions<ResizePanelState>, ContainerMixinOptions<ResizePanelState> { }

export interface ResizePanel extends Widget<ResizePanelState>, ContainerMixin<Child, ResizePanelState> {
	tagNames: {
		handle: string;
	};
	width: string;
}

export interface ResizePanelFactory extends ComposeFactory<ResizePanel, ResizePanelOptions> { }

const resizeNodePropertiesMap = new WeakMap<ResizePanel, VNodeProperties>();
const resizingMap = new WeakMap<ResizePanel, { width: number, clientX: number }>();

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
		if (resizingMap.get(resizePanel)) {
			evt.preventDefault();
			resizingMap.delete(resizePanel);
			onmousemoveHandle.destroy();
			onmouseupHandle.destroy();
			resizePanel.invalidate();
			return true;
		}
	}

	function onmousemoveListener(evt: MouseEvent): boolean {
		const originalWidth = resizingMap.get(resizePanel);
		if (originalWidth) {
			evt.preventDefault();
			resizePanel.width = String(originalWidth.width + evt.clientX - originalWidth.clientX) + 'px';
			return true;
		}
	}

	function onmousedownListener(evt: MouseEvent): boolean {
		if (!resizingMap.get(resizePanel)) {
			const projector = getProjector(resizePanel);
			if (projector && projector.document) {
				evt.preventDefault();
				resizingMap.set(resizePanel, { width: parseInt(resizePanel.width, 10), clientX: evt.clientX });
				onmouseupHandle = on(projector.document, 'onmouseup', onmouseupListener);
				onmousemoveHandle = on(projector.document, 'onmousemove', onmousemoveListener);
				resizePanel.invalidate();
				return true;
			}
		}
	}

	function ontouchendListener(evt: TouchEvent): boolean {
		const originalWidth = resizingMap.get(resizePanel);
		if (originalWidth) {
			console.log('ontouchend');
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
		const originalWidth = resizingMap.get(resizePanel);
		if (originalWidth && evt.touches.length === 1) {
			console.log('ontouchmove');
			evt.preventDefault();
			resizePanel.width = String(originalWidth.width + evt.touches[0].clientX - originalWidth.clientX) + 'px';
		}
		return false;
	}

	function ontouchstartListener(evt: TouchEvent): boolean {
		if (evt.touches.length === 1 && !resizingMap.get(resizePanel)) {
			const projector = getProjector(resizePanel);
			if (projector) {
				console.log('ontouchstart');
				evt.preventDefault();
				resizingMap.set(resizePanel, { width: parseInt(resizePanel.width, 10), clientX: evt.touches[0].clientX });
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
	.mixin(createContainerMixin)
	.mixin({
		mixin: {
			tagName: 'dojo-panel-resize',
			tagNames: {
				handle: 'dojo-resize-handle'
			},
			get width(): string {
				const resizePanel: ResizePanel = this;
				return resizePanel.state && resizePanel.state && resizePanel.state.width;
			},
			set width(value: string) {
				const resizePanel: ResizePanel = this;
				resizePanel.setState({ width: value });
			}
		},
		aspectAdvice: {
			after: {
				getChildrenNodes(result: (VNode | string)[]): (VNode | string)[] {
					const resizePanel: ResizePanel = this;
					result.push(h(resizePanel.tagNames.handle, resizeNodePropertiesMap.get(resizePanel)));
					return result;
				},
				getNodeAttributes(result: VNodeProperties) {
					const resizePanel: ResizePanel = this;
					result = result || {};
					result.styles = result.styles || {};
					result.styles['width'] = resizePanel.width || '200px';
					return result;
				}
			}
		}
	})
	.mixin({
		mixin: createDestroyable,
		initialize(instance) {
			resizeNodePropertiesMap.set(instance, {});
			instance.own(setResizeListeners(instance));
		}
	});

export default createResizePanel;
