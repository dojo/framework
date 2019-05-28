# Version 6.0.0 Migration Guide

Dojo 6 has landed and contains some major ergonomic changes along with a few breaking changes that you should be aware of when migrating from version 5. As much as possible these updates should be automated by using the `@dojo/cli-upgrade-app` CLI command. When the command cannot automate the upgrade, there should be helpful hints and information in the output to guide you through the manual process.

To install the upgrade command, run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root. The migrations tool should automatically detect the necessary migration from your `package.json`.

```
dojo upgrade app
```

If you are upgrading from a version before 5.0.0, please see the [previous migration guides](./V5-Migration-Guide) for more details first.

-   The `@dojo/cli` should be updated to version 6.0.0, along with all the commands used by the project.
-   If your project is using `@dojo/widgets` and `@dojo/interop`, these packages also require upgrading to version 6.0.0.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix any linting rule violations.

### Breaking Changes:

#### [Update to the minimum support TypeScript version]()

#### [`widget-core` merged with `core`]()

#### [`@dojo/widgets` updated to functional components]()
