/**
 * Created by user on 2017/8/10/010.
 */

import gulp from './src/gulp/hook';

import * as fs from './src/lib/fs';
import * as path from 'path';
import * as globby from 'globby';
import * as Promise from 'bluebird';
import * as minimatch from 'minimatch';
import * as globule from 'globule';

import project_config, { project_root, dist_root, temp_root, gw2taco_path } from './project.config.ts';

import gw2taco, { Category, Node, Poi } from './src/gw2taco';

gulp.task('gw2taco:categorydata', ['category:cache'], async function ()
{
	//let src = path.join(dist_root, 'assets/gw2taco', file);
	//let target = path.join(gw2taco_path, file);
});

gulp.task('gw2taco:link', async function ()
{
	const currentTask = this.currentTask;

	let options = {
		cwd: path.join(dist_root, 'assets/gw2taco'),
	};

	let ls = await globby([
			'*/*.xml',
			'**/*.{gif,jpg,jpeg,png}',
		], options)
		.then(async (ls) =>
		{
			for (let file of ls)
			{
				let src = path.join(dist_root, 'assets/gw2taco', file);
				let target = path.join(gw2taco_path, file);

				if (fs.existsSync(target))
				{
					src = await fs.realpath(src);

					let stat = await fs.lstat(target);

					if (!stat.isSymbolicLink() && !fs.existsSync(target + '.gw2taco'))
					{
						console.warn(`backup ${file}`);
						await fs.copy(target, target + '.gw2taco');
					}

					if (src != await fs.realpath(target))
					{
						console.warn(`relink ${file}`);
						await fs.remove(target);
					}
					else
					{
						console.info(`skip ${file}`);
						continue;
					}
				}

				console.warn(`link ${file}`);
				await fs.ensureSymlink(src, target);
			}

			return ls;
		})
	;

	return ls;
});

gulp.task('dist:clear', async function ()
{
	return fs.emptyDir(path.join(dist_root, 'assets/gw2taco'));
});

gulp.task('assets:copy', ['dist:clear'], async function ()
{
	const currentTask = this.currentTask;

	let patterns = [
		'**/psd',
		'**/*.{psd,bak}',
	];

	return fs.copy(path.join(project_root, 'assets/gw2taco'), path.join(dist_root, 'assets/gw2taco'), {
		preserveTimestamps: true,
		filter: function (src, dest)
		{
			let _path = path.relative(project_root, src);

			console.log(_path, globule.isMatch(patterns, _path));

			if (globule.isMatch(patterns, _path))
			{
				return false;
			}

			return true;
		}
	});
});

gulp.task('assets:pretty', async function ()
{
	const currentTask = this.currentTask;

	let options = {
		cwd: path.join(project_root, 'assets/gw2taco'),
		absolute: true,
	};

	let ls = await globby([
		'**/*.xml',
	], options);

	for (let file of ls)
	{
		let doc = await Node.load(file);
		let out = doc.dump();

		await fs.writeFile(file, out);

		//let b = path.relative(options.cwd, file);
		//await fs.outputFile(path.join(dist_root, 'assets/gw2taco', b), out);
	}
});

gulp.task('dist:pretty', async function ()
{
	const currentTask = this.currentTask;

	let options = {
		cwd: path.join(dist_root, 'assets/gw2taco'),
		absolute: true,
	};

	let ls = await globby([
		'**/*.xml',
	], options);

	for (let file of ls)
	{
		let doc = await Node.load(file);
		let out = doc.dump();

		await fs.writeFile(file, out);
	}
});

gulp.task('assets:cache', async function ()
{
	const currentTask = this.currentTask;

	let patterns = [
		'**/*.{gif,jpg,jpeg,png}',
	];

	let ls = await globby(patterns, {
			cwd: path.join(gw2taco_path, 'data'),
		})
		.then(async (ls) =>
		{
			let ls2 = await globby(patterns, {
				cwd: path.join(gw2taco_path, 'pois/data'),
			});

			return ls.concat(ls2);
		})
		.then(async (ls) =>
		{
			let ls2 = await globby(patterns, {
				cwd: path.join(project_root, 'assets/gw2taco/data'),
			});

			return ls.concat(ls2);
		})
		.then(async (ls) =>
		{
			let ls2 = await globby(patterns, {
				cwd: path.join(project_root, 'assets/gw2taco/pois/data'),
			});

			return ls.concat(ls2);
		})
		.then(ls =>
		{
			return Array.from(new Set(ls));
		})
		.then(ls =>
		{
			ls.sort();

			return ls.reduce((a, b) =>
			{
				a[b.toString().toLowerCase().replace(/\.(gif|jpg|jpeg|png)$/, '').replace(/[\\\/\-]+/g, '.')] = b;

				return a;
			}, {});
		})
	;

	//console.log(ls);

	await fs.outputFile(path.join(temp_root, `assets.gw2taco.cache.json`), JSON.stringify(ls, null, "  "));
});

gulp.task('category:cache', ['dist:pretty', 'assets:copy', 'assets:cache'], async function ()
{
	const cu = require('./src/gw2taco/category/util');

	const currentTask = this.currentTask;
	const gw2taco_prefix = 'ZZZ_SC_';

	let patterns = [
		'categorydata.xml',
		'POIs/*.xml',
		`!${gw2taco_prefix}*.xml`,
		`!POIs/${gw2taco_prefix}*.xml`,
		`!SC_Temp.xml`,
		`!POIs/SC_Temp.xml`,
	];

	let options = {
		cwd: gw2taco_path,
		absolute: true,
	};

	let ls = await globby(patterns, options)
		.then(async (ls) =>
		{
			patterns.push('POIs/**/*.xml');

			let ls2 = await globby(patterns, (options.cwd = path.join(dist_root, 'assets/gw2taco'), options));

			//console.log(ls, ls2);

			return ls.concat(ls2);
		})
		.then(cu.loadAll)
		.then(ls => {
			return cu.allCatList(ls, {
				merge: true,
				overwite: true,
			});
		})
		.then(ls =>
		{

			let assets_iconfile = require(path.join(temp_root, `assets.gw2taco.cache.json`));

			//console.log(ls['DivingGoggles'], ls['divinggoggles']);

			return cu.listToCat(ls, function (a, b, cat, ls)
			{
				//console.log(b, ls[b].name_id, Object.keys(ls[b].elem[0]));

				let name_id = ls[b].name_id.substr(0);

				if (ls[b].parent_name)
				{
					let parent_name = ls[b].parent_name.toLowerCase();
					parent_name = ls[parent_name].name_id;

					name_id = `${parent_name}.${ls[b].name}`;
				}

				let d = name_id;
				let p = cat.makeTree(d.split('.'), [], {
					gw2taco: true,
					lc: false,
					space: true,
				});

				let attrs = {};

				for (let attr in ls[b].elem[0].attribs)
				{
					if (attr == 'name') continue;

					//let value = cat.$(ls[b].elem).attr(attr);
					let value = ls[b].elem[0].attribs[attr];

					//p.attr(attr, value);

					attrs[attr] = value;
				}

				if (p.attr('name') != ls[b].name && !p.attr('DisplayName') && !attrs['DisplayName'])
				{
					attrs['DisplayName'] = ls[b].name;
				}

				{
					let iconFile = p.attr('iconFile') || attrs['iconFile'];

					let k = Poi.normalize(name_id);

					if ((1 || !iconFile || iconFile == p.attr('data-iconFile')) && assets_iconfile[k])
					{
						attrs['iconFile'] = `Data/${assets_iconfile[k]}`;
						attrs['data-iconFile'] = iconFile || attrs['iconFile'];
					}
				}



				cat.getStatic().attr(p, attrs);

				//console.log(p[0].attribs);

				return a;
			});
		})
		.then(cat =>
		{
			let p = cat.makeTree(`temp`.split('.'), [])
			.attr('data-allowsub', true)
			;

			p.appendTo(p.parent());

			cat
			.find(`${cat.tagName}[name="undefined"]`)
			.each(function (i, elem)
			{
				cat.$(elem).appendTo(cat.$(elem).parent());
			})
			;

			return cat;
		})
		.then(cat =>
		{
			cat.getStatic().attr(cat.root(), {
				fadeFar: 16800,
				fadeNear: 8400,
			});

			return cat;
		})
	;

	await fs.outputFile(path.join(temp_root, `categorydata.cache.xml`), ls.dump());
});

gulp.task('category:undefined', ['category:cache'], async function ()
{
	const cu = require('./src/gw2taco/category/util');

	const currentTask = this.currentTask;
	const gw2taco_prefix = 'ZZZ_SC_';

	let patterns = [
		'categorydata.xml',
		'POIs/*.xml',
		`!${gw2taco_prefix}*.xml`,
		`!POIs/${gw2taco_prefix}*.xml`,
	];

	let options = {
		cwd: gw2taco_path,
		absolute: true,
	};

	/*
	let ls = await globby(patterns, options)
		.then(async (ls) =>
		{
			let ls2 = await globby(patterns, (options.cwd = path.join(dist_root, 'assets/gw2taco'), options));

			return ls.concat(ls2);
		})
		.then(cu.loadAll)
	*/

	let ls = await Category.load(path.join(temp_root, `categorydata.cache.xml`))
		.then(cat =>
		{
			let ls = [cat];

			ls.push(Category.load(path.join(dist_root, 'assets/gw2taco', 'pois/SC_Temp.xml')));

			return Promise.all(ls);
		})
		.then(cu.allCatList)
		.then(ls =>
		{
			return cu.listToCat(ls, function (a, b, cat, ls)
			{
				let name_id = ls[b].name_id.substr(0);

				if (ls[b].parent_name)
				{
					let parent_name = ls[b].parent_name.toLowerCase();
					parent_name = ls[parent_name].name_id;

					name_id = `${parent_name}.${ls[b].name}`;
				}

				let d = `${name_id}.undefined`;

				let c = !!ls[`${b}.undefined`] || b.name == 'undefined';

				//console[!c ? 'log' : 'error'](c, b, d);

				//console.error(ls[b].elem.attr('data-allowsub'));

				if (!c && (ls[b].elem.children().length || ls[b].elem.attr('data-allowsub')))
				{
					let p = cat.makeTree(d.split('.'), []);
				}

				return a;
			});
		})
		.then(cat =>
		{
			cat.makeTree(`temp.undefined`.split('.'), []);
			cat.makeTree(`undefined`.split('.'), []);

			//console.log(`${cat.tagName}[name="undefined"]`);

			cat
			.find(`${cat.tagName}[name="undefined"]`)
			.each(function (i, elem)
			{
				cat.$(elem).appendTo(cat.$(elem).parent());
			})
			;

			return cat;
		})
	;

	await fs.outputFile(path.join(dist_root, 'assets/gw2taco', 'pois', `${gw2taco_prefix}undefined.xml`), ls.dump());
});

gulp.task('arcdps:evtc', async function ()
{
	const old = process.argv.slice(0);

	process.argv = [];

	try
	{
		await require('./bin/evtc');
	}
	finally
	{
		process.argv = old;
	}
});