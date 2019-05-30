import { Constructor, DNode, WNode } from '../interfaces';
import WidgetBase from '../WidgetBase';
import { Handle } from '../../core/Destroyable';
import Registry from '../Registry';
import { renderer, Renderer, w } from './../vdom';
import { alwaysRender } from '../decorators/alwaysRender';

export enum ProjectorAttachState {
	Attached = 1,
	Detached
}

export interface ProjectorProperties {
	registry?: Registry;
}

export interface ProjectorMixin<T extends WidgetBase> {
	append(root?: Element): Handle;
	merge(root?: Element): Handle;
	sandbox(doc?: Document): void;
	setProperties(properties: T['properties'] & ProjectorProperties): void;
	setChildren(children: DNode[]): void;
	toHtml(): string;
	async: boolean;
	root: Element;
	destroy(): void;
	readonly projectorState: ProjectorAttachState;
}

@alwaysRender()
class ProjectorWidget extends WidgetBase<{ renderer: () => WNode }> {
	protected render() {
		return this.properties.renderer();
	}
}

export function ProjectorMixin<P, T extends WidgetBase<P>>(Base: Constructor<T>): Constructor<ProjectorMixin<T>> {
	class Projector {
		public projectorState!: ProjectorAttachState;
		private _root: Element = document.body;
		private _async = true;
		private _children!: DNode[];
		private _properties: P & ProjectorProperties = {} as P;
		private _widget: Constructor<T> = Base;
		private _renderer: Renderer | undefined;
		private _renderResult!: WNode;

		public append(root: Element = this._root): Handle {
			this._root = root;
			this._renderResult = w(ProjectorWidget, {
				renderer: () => {
					const { registry, ...props } = this._properties as any;
					return w(this._widget, props, this._children);
				}
			});
			this._renderer = renderer(() => this._renderResult);
			this._renderer.mount({
				domNode: root as HTMLElement,
				registry: this._properties.registry,
				sync: !this.async
			});
			this.projectorState = ProjectorAttachState.Attached;
			return {
				destroy() {}
			};
		}

		public merge(root: Element = document.body): Handle {
			return this.append((root.parentNode as Element) || undefined);
		}

		public set root(root: Element) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change root element');
			}
			this._root = root;
		}

		public get root(): Element {
			return this._root;
		}

		public get async(): boolean {
			return this._async;
		}

		public set async(async: boolean) {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot change async mode');
			}
			this._async = async;
		}

		public sandbox(doc: Document = document): void {
			if (this.projectorState === ProjectorAttachState.Attached) {
				throw new Error('Projector already attached, cannot create sandbox');
			}
			this._async = false;
			this.append(doc.createDocumentFragment() as any);
		}

		public setChildren(children: DNode[]): void {
			this._children = children;
			if (this._renderer) {
				this._renderer.invalidate();
			}
		}

		public setProperties(properties: P): void {
			this._properties = properties;
			if (this._renderer) {
				this._renderer.invalidate();
			}
		}

		public toHtml(): string {
			if (this.projectorState !== ProjectorAttachState.Attached) {
				throw new Error('Projector is not attached, cannot return an HTML string of projection.');
			}
			return (this._root.childNodes[0] as Element).outerHTML;
		}

		public destroy() {}
	}

	return Projector;
}

export default ProjectorMixin;
