# lang

## Module Exports

### `assign`

Copies values of own properties from the source object(s) to the target object.

```ts
import { assign } from '@dojo/core/lang';

var target = {
	foo: 'bar'
};

var source = {
	bar: 'foo'
};

assign(target, source);

target.foo === 'bar'; // true
target.bar === 'foo'; // true

```

### `create`

Creates a new object from the given prototype, and copies all enumerable own properties of one or more source objects to the newly created target object.

```ts
import { create } from '@dojo/core/lang';

var oldObj = {
	foo: 'bar',
	obj: {
		bar: 'foo'
	}
};

var newObj = create(oldObj, {
	bar: 'foo'
});

newObj.bar === 'foo'; // true
newObj.foo === 'bar'; // true
newObj.obj.bar === 'foo'; // true

oldObj.foo = 'foo';
oldObj.obj.bar = 'bar';

newObj.foo === 'bar'; // true
newObj.obj.bar === 'bar'; // true
```

### `deepAssign`

Copies the values of all enumerable own properties of one or more source objects to the target object, recursively copying all nested objects and arrays as well.

```ts
import { deepAssign } from '@dojo/core/lang';

var oldObj = {
	foo: 'bar',
	obj: {
		bar: 'foo'
	}
};

var newObj = deepAssign(oldObj, {
	bar: 'foo'
});

newObj.bar === 'foo'; // true
newObj.foo === 'bar'; // true
newObj.obj.bar === 'foo'; // true

oldObj.foo = 'foo';
oldObj.obj.bar = 'bar';

newObj.foo === 'bar'; // true
newObj.obj.bar === 'bar'; // true
```

### `mixin`

Copies values of own and inherited properties from the source object(s) to the target object.

```ts
import { mixin } from '@dojo/core/lang';

const obj = {
	foo: 'bar',
	fooObj: {
		bar: 'foo'
	}
};

const result = mixin({}, obj);

result.foo === 'bar'; // true
result.fooObj.bar === 'foo'; // true

obj.fooObj.bar = 'bar';

result.fooObj.bar === 'bar'; // true

```

### `deepMixin`

Copies the values of all enumerable (own or inherited) properties of one or more source objects to the target object, recursively copying all nested objects and arrays as well.

```ts
import { deepMixin } from '@dojo/core/lang';

const obj = {
	foo: 'bar',
	fooObj: {
		bar: 'foo'
	}
};

const result = deepMixin({}, obj);

result.foo === 'bar'; // true
result.fooObj.bar === 'foo'; // true

obj.fooObj.bar = 'bar';

result.fooObj.bar === 'bar'; // false
result.fooObj.bar === 'foo'; // true

```

### `duplicate`

Creates a new object using the provided source's prototype as the prototype for the new object, and then deep copies the provided source's values into the new target.

```ts
import { duplicate } from '@dojo/core/lang';

var oldObj = {
	foo: 'bar'
};

var newObj = duplicate(oldObj);

oldObj.foo = 'foo';

oldObj.foo === 'foo';
newObj.foo === 'bar';

```

### `partial`

Returns a function which invokes the given function with the given arguments prepended to its argument list. Like `Function.prototype.bind`, but does not alter execution context.

```ts
import { partial } from '@dojo/core/lang';

var add = function (a, b) {
	return a + b;
}

var addFive = partial(add, 5);

var result = addFive(4);

result === 9;

```

### `isIdentical`

Determines whether two values are the same (including NaN).

```ts
import { isIdentical } from '@dojo/core/lang';

isIdentical(1, 1); // true
isIdentical(NaN, NaN); // true

```

### `lateBind`

Creates a function that calls the current method on an object with given arguments.

```ts
import { lateBind } from '@dojo/core/lang';

var person = {
	speak: function (name) {
		return 'hi, ' + name;
	}
};

var personSpeak = lateBind(person, 'speak', 'name');

personSpeak() === 'hi, name'; // true

person.speak = function (name) {
	return 'bye, ' + name;
};

personSpeak() === 'bye, name';

```
