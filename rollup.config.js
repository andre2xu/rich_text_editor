import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import typescript from '@rollup/plugin-typescript';
import package_json from './package.json' assert { type: 'json' };



const BABEL_OPTIONS = {
	babelHelpers: 'bundled',
	extensions: ['.ts'],
	exclude: ['node_modules/**'],
	presets: [['@babel/preset-env', { modules: 'auto' }]],
};

const TYPESCRIPT_OPTIONS = {
	allowSyntheticDefaultImports: true
};



export default [
	// browser-friendly UMD build
	{
		input: 'src/main.ts',
		output: {
			name: 'rich-text-editor',
			file: package_json.browser,
			format: 'umd'
		},
		plugins: [
			typescript(TYPESCRIPT_OPTIONS),
			resolve(), // so Rollup can find external dependencies in node_modules
			commonjs(), // so Rollup can convert node modules to an ES module
			babel(BABEL_OPTIONS)
		]
	},

	// CommonJS (for Node) and ES module (for bundlers) build
	{
		input: 'src/main.ts',
		external: ['jquery'],
		output: [
			{ file: package_json.main, format: 'cjs', exports: 'default' },
			{ file: package_json.module, format: 'es', exports: 'default' }
		],
		plugins: [
			typescript(TYPESCRIPT_OPTIONS),
			resolve(),
			commonjs(),
			babel(BABEL_OPTIONS)
		]
	},

	// development and demo build
	{
		input: 'src/index.ts',
		output: {
			name: 'index',
			file: 'dist/index.js',
			format: 'iife' // for script tags
		},
		plugins: [
			typescript(TYPESCRIPT_OPTIONS),
			resolve(),
			commonjs(),
			babel(BABEL_OPTIONS)
		]
	}
];