# Route Configuration

The routing configuration is a hierarchical structure used to describe the entire Dojo application, associating `outlet` ids to a routing path. The routing path can be nested using children which enables building a routing structure that can accurately reflect the requirements of the application.

The routing configuration API is constructed with the following properties:

* `path: string`: The routing path segment to match in the URL.
* `outlet: string`: The `outlet` id used to render widgets to the associated routing path.
* `defaultRoute: boolean`(optional): Marks the outlet as default, the application will redirect to this route automatically if no route or an unknown routes is found on application load.
* `defaultParams: { [index: string]: string }`(optional): Associated default parameters (`path` and `query`), required if the default route has required params.
* `children: RouteConfig[]`(optional): Nested child routing configuration.

>src/routes.ts
```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	},
	{
		path: 'about',
		outlet: 'about-overview',
		children: [
			{
				path: '{services}',
				outlet: 'about-services'
			},
			{
				path: 'company',
				outlet: 'about-company'
			},
			{
				path: 'history',
				outlet: 'about-history'
			}
		]
	}
];
```

This example would register the following routes and outlets:

| Url Path          | Outlet          |
| ----------------- | --------------- |
| `/home`           | `home`          |
| `/about`          | `about-overview`|
| `/about/company`  | `about-company` |
| `/about/history`  | `about-history` |
| `/about/knitting` | `about-services`|
| `/about/sewing`   | `about-services`|

The `about-services` outlet has been registered to match any path after `/about` This is at odds with the other registered outlets, `about-company` and `about-history`, however Dojo routing ensures that the correct outlet is matched in these scenarios.
