import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, 'dist');
const hrefPattern = /\bhref\s*=\s*["']([^"']+)["']/gi;
const idPattern = /\b(?:id|name)\s*=\s*["']([^"']+)["']/gi;

async function walk(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(target)));
		else files.push(target);
	}
	return files;
}

async function isFile(filePath) {
	try {
		return (await stat(filePath)).isFile();
	} catch {
		return false;
	}
}

function routeForHtml(filePath) {
	const relative = path.relative(distRoot, filePath).split(path.sep).join('/');
	if (relative === 'index.html') return '/';
	if (relative.endsWith('/index.html')) return `/${relative.slice(0, -10)}`;
	return `/${relative}`;
}

async function resolveBuiltPath(pathname, redirects) {
	const redirectedPath = redirects.get(pathname) ?? pathname;
	const relative = decodeURIComponent(redirectedPath).replace(/^\/+/, '');
	const candidates = redirectedPath.endsWith('/')
		? [path.join(distRoot, relative, 'index.html')]
		: [
			path.join(distRoot, relative),
			path.join(distRoot, `${relative}.html`),
			path.join(distRoot, relative, 'index.html'),
		];
	if (redirectedPath === '/') candidates.unshift(path.join(distRoot, 'index.html'));
	for (const candidate of candidates) {
		if (await isFile(candidate)) return candidate;
	}
	return null;
}

const vercelConfig = JSON.parse(
	await readFile(path.join(projectRoot, 'vercel.json'), 'utf8'),
);
const redirects = new Map(
	(vercelConfig.redirects ?? []).map(({ source, destination }) => [
		source,
		destination,
	]),
);
const htmlFiles = (await walk(distRoot)).filter((file) => file.endsWith('.html'));
const errors = [];

for (const sourceFile of htmlFiles) {
	const sourceHtml = await readFile(sourceFile, 'utf8');
	const sourceRoute = routeForHtml(sourceFile);
	for (const match of sourceHtml.matchAll(hrefPattern)) {
		const href = match[1].replaceAll('&amp;', '&');
		if (
			!href ||
			href.startsWith('//') ||
			/^(?:mailto|tel|javascript|data):/i.test(href)
		) {
			continue;
		}

		let url;
		try {
			url = new URL(href, `https://conduital.local${sourceRoute}`);
		} catch {
			errors.push(`${sourceRoute}: invalid href ${href}`);
			continue;
		}
		if (url.origin !== 'https://conduital.local') continue;

		const targetFile = await resolveBuiltPath(url.pathname, redirects);
		if (!targetFile) {
			errors.push(`${sourceRoute}: missing target ${href}`);
			continue;
		}

		if (url.hash && targetFile.endsWith('.html')) {
			const targetHtml = await readFile(targetFile, 'utf8');
			const anchors = new Set(
				[...targetHtml.matchAll(idPattern)].map((anchor) => anchor[1]),
			);
			const fragment = decodeURIComponent(url.hash.slice(1));
			if (!anchors.has(fragment)) {
				errors.push(`${sourceRoute}: missing fragment ${href}`);
			}
		}
	}
}

if (errors.length > 0) {
	console.error(`Internal-link check failed with ${errors.length} error(s):`);
	for (const error of errors) console.error(`- ${error}`);
	process.exitCode = 1;
} else {
	console.log(`Internal-link check passed across ${htmlFiles.length} HTML files.`);
}
