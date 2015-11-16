# lang

## Module Exports

### assign - copies values of own properties from the source object(s) to the target object

```ts
import { assign } from 'src/lang';

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

### create - creates a new object based on

```ts
import { create } from 'src/lang';

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

### deepAssign - recursively copies values from own properties of source object(s) to target object

```ts
import { deepAssign } from 'src/lang';

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

### mixin - copies values of own and inherited properties from the source object(s) to the target object
```ts
import { mixin } from 'src/lang';

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

### deepMixin - recursively copies values of own and inherited properties from the source object(s) to the target object
```ts
import { deepMixin } from 'src/lang';

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

### duplicate - creates new object with property set to `oldObj` prototype and a deep copies of its properties
```ts
import { duplicate } from 'src/lang';

var oldObj = {
	foo: 'bar'
};

var newObj = duplicate(oldObj);

oldObj.foo = 'foo';

oldObj.foo === 'foo';
newObj.foo === 'bar';

```

### partial - creates a function that calls the provided function with the arguments provides and any other arguments provided to the new function

```ts
import { partial } from 'src/lang';

var add = function (a, b) {
	return a + b;
}

var addFive = partial(add, 5);

var result = addFive(4);

result === 9;

```

### isIdentical - determines whether two values are the same (including NaN)
```ts
import { isIdentical } from 'src/lang';

isIdentical(1, 1); // true
isIdentical(NaN, NaN); // true

```

### lateBind - creates a function that calls the current method on an object with given arguments
```ts
import { lateBind } from 'src/lang';

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
