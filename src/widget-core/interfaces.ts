/**
 * Because the NodeJS types are needed at development time for testing, we need to add the AMD require APIs we
 * need in order to support the rest of the package code
 */

declare global {
	namespace DojoLoader {

		interface ModuleMapItem {
			[ mid: string ]: /* ModuleMapReplacement | ModuleMap */ any;
		}

		interface ModuleMapReplacement extends ModuleMapItem {
			[ findMid: string ]: /* replaceMid */ string;
		}

		interface ModuleMap extends ModuleMapItem {
			[ sourceMid: string ]: ModuleMapReplacement | string;
		}

		interface Package {
			location?: string;
			main?: string;
			name?: string;
		}

		export interface Config {
			/**
			 * Indicates the root used for ID-to-path resolutions. Relative paths are relative to the current
			 * working directory. In web browsers, the current working directory is the directory containing
			 * the web page running the script.
			 */
			baseUrl?: string;

			/**
			 * Specifies for a given module ID prefix, what module ID prefix to use in place of another
			 * module ID prefix. For example, how to express "when `bar` asks for module ID `foo`,
			 * actually use module ID 'foo1.2'".
			 *
			 * This sort of capability is important for larger projects which may have two sets of
			 * modules that need to use two different versions of `foo`, but they still need to
			 * cooperate with each other.
			 *
			 * This is different from `paths` config. `paths` is only for setting up root paths for
			 * module IDs, not for mapping one module ID to another one.
			 */
			map?: ModuleMap;

			/**
			 * Array of package configuration (packageConfig) objects. Package configuration is for
			 * traditional CommonJS packages, which has different path lookup rules than the default
			 * ID-to-path lookup rules used by an AMD loader.
			 *
			 * Default lookup rules are ,baseUrl + 'module/id' + .js, where paths config can be used
			 * to map part of 'module/id' to another path.
			 */
			packages?: Package[];

			/**
			 * For specifying a path for a the given module ID prefix.
			 *
			 * A property in the paths object is an absolute module ID prefix.
			 */
			paths?: { [ path: string ]: string; };

			/* TODO: We should remove internal APIs like this */
			pkgs?: { [ path: string ]: Package; };
		}
	}

	interface NodeRequire {
		(mids: string[], callback: (...args: any[]) => void): void;
		on(type: string, listener: (event: any) => void): { remove: () => void; };
		config(config: DojoLoader.Config): void;
	}
}

export interface Widgets {
	/* This is an empty interface to "trick" TypeScript into treating this as a module, and
	 * therefore allowing global scope modification by thinking this is a module */
}
