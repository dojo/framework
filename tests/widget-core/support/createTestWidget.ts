import { WidgetBase } from './../../src/WidgetBase';
import { w } from './../../src/d';
import { Constructor, VirtualDomNode, WidgetBaseInterface } from './../../src/interfaces';

interface TestWidget<W extends WidgetBase> extends WidgetBaseInterface {
	getWidgetUnderTest(): W;
	getAttribute(key: string): any;
	setProperties(properties: W['properties']): void;
	setChildren(children: W['children']): void;
	invalidate(): void;
	renderResult: VirtualDomNode | VirtualDomNode[];
}

function createTestWidget<W extends WidgetBase>(
	component: Constructor<W>,
	properties: W['properties'],
	children?: W['children']
): TestWidget<W> {
	const testWidget = new class extends WidgetBase implements TestWidget<W> {
		private _testProperties: W['properties'] = properties;
		private _testChildren: W['children'] = children || [];
		private _renderResult: VirtualDomNode | VirtualDomNode[];

		getAttribute(key: string): any {
			return (<any> this)[key];
		}

		setProperties(properties: W['properties']): void {
			this._testProperties = properties;
			this.invalidate();
		}

		setChildren(children: W['children']): void {
			this._testChildren = children;
			this.invalidate();
		}

		invalidate(): void {
			super.invalidate();
		}

		getWidgetUnderTest(): W {
			return (<any> this)._cachedChildrenMap.get(component)[0].child;
		}

		render() {
			return w(component, this._testProperties, this._testChildren);
		}

		get renderResult(): VirtualDomNode | VirtualDomNode[] {
			return this._renderResult;
		}

		__render__() {
			const render = super.__render__();
			this._renderResult = render;
			return render;

		}
	}();
	testWidget.__render__();
	return testWidget;
}

export default createTestWidget;
