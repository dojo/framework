import { Constructor, DNode } from '../interfaces';
import WidgetBase from '../WidgetBase';
import { Handle } from '../../core/Destroyable';
import Registry from '../Registry';
import { renderer } from './../vdom';
import { w } from '../d';

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

export function ProjectorMixin<P, T extends WidgetBase<P>>(Base: Constructor<T>): Constructor<ProjectorMixin<T>> {
	class Projector {
		public projectorState: ProjectorAttachState;
		private _root: Element = document.body;
		private _async = true;
		private _children: DNode[];
		private _properties: P & ProjectorProperties = {} as P;
		private _widget: Constructor<T> = Base;

		public append(root: Element = this._root): Handle {
			const { registry, ...props } = this._properties as any;
			this._root = root;
			const r = renderer(() => w(this._widget, props, this._children));
			if (registry) {
				r.registry = registry;
			}
			if (!this.async) {
				r.sync = false;
			}
			r.append(root as HTMLElement);
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
		}

		public setProperties(properties: P): void {
			this._properties = properties;
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
