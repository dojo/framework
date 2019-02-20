# Introduction

Dojo's `i18n` package solves a variety of common requirements and challenges around web application internationalization.

It is best used in Dojo applications to help render localized `Widget`s, including advanced message, date and number formatting, but can also be used as a standalone module if required.

Feature | Description
--- | ---
Per-widget localization | Each widget instance can have its own locale specified, allowing data from multiple locales to be displayed within a single application. If not specified, widgets fall back to the current root locale.
Fine-grained message bundling | Bundles can be decomposed and scoped locally to individual widgets, and can be lazily-loaded only if a given locale is in use. This allows message bundles to benefit from the same layer separation & bundled delivery as all other resources within an application.
Locale-specific message, date, and number formatting | Uses industry-standard [Unicode CLDR formatting](http://cldr.unicode.org/) rules. CLDR formatting data is optional and only needs to be loaded if advanced formatting is required. Applications that only require basic locale-based message substitution can simply use Dojo `i18n`.
Reactive locale change response | Similar to other reactive state changes within a Dojo application, messages can be automatically reloaded and affected widgets re-rendered when changing locales.<br>If using `i18n` as a standalone module, locale change events can be acted on via listener callbacks.
Fallback locale detection | Ensures a default locale is available if a root override has not been explicitly set.<br>When running client-side, this defaults to the user or system locale, and when running server-side, this defaults to the process or host locale.
