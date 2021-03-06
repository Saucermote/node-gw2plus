/**
 * Created by user on 2017/7/13/013.
 */

//const webpack = require('webpack');
const path = require('path');

module.exports = {
	entry: {},
	output: {
		pathinfo: true,

		path: path.join(__dirname, 'dist'),
		filename: '[name].js',
		sourceMapFilename: "[file].map",
	},

	resolve: {
		// Add `.ts` and `.tsx` as a resolvable extension.
		extensions: [
			'.ts',
			'.tsx',
			'.js',
		]
	},

	module: {
		loaders: [
			{ test: /\.css$/, loader: 'style-loader!css-loader' },
			{ test: /\.tsx?$/, loader: 'ts-loader' }
		]
	},

	//devtool: "inline-source-map",
	devtool: "eval",

	plugins: [],
};
