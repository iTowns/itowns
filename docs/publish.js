const env = require('jsdoc/env');
const fs = require('jsdoc/fs');
const path = require('jsdoc/path');
const template = require('jsdoc/template');

const helper = require('./templateHelper');

const rootProject = path.normalize(`${__dirname}/..`);

// globals
const outDir = path.normalize(env.opts.destination);
let view;
let data;

function find(spec) {
    const res = helper.find(data, spec);
    return res.sort((a, b) => {
        const A = a.name.toUpperCase();
        const B = b.name.toUpperCase();

        if (A < B) { return -1; }
        if (A > B) { return 1; }
        return 0;
    });
}

function linkToSource(filename, pathFile) {
    const location = path.relative(rootProject, pathFile);
    return `${location}/${filename}`;
}

function rank(properties) {
    const res = [];
    let parent;

    properties.forEach((property) => {
        if (property.name.startsWith(`${parent}.`)) {
            res[res.length - 1].subprop.push(property);
        } else {
            property.subprop = [];
            res.push(property);
            parent = property.name;
        }
    });

    return res;
}

function caption(example) {
    const c = example.match(/(<caption>[\s\S]*<\/caption>)\n/g) || [];
    const e = example.split(c[0]);
    return {
        caption: c[0],
        content: e[0] || e[1],
    };
}

function sortByPackage(members, navList) {
    const packages = {};
    const invertedNavList = {};

    for (const type in navList) {
        navList[type].forEach((e) => { invertedNavList[e] = type; });
        packages[type] = [];
    }

    for (const type in members) {
        const member = members[type];
        if (!member || type == 'globals' || type == 'tutorials') { continue; }
        member.forEach((m) => {
            const p = invertedNavList[m.name] || invertedNavList[m.memberof];
            if (!p) { return; }
            packages[p].push(m);
        });
    }

    return packages;
}

// Generate an html page
function generate(title, content, filename, template) {
    const outpath = path.join(outDir, filename);
    let html = view.render(template || 'page.tmpl', { env, title, content });
    html = helper.resolveLinks(html);
    fs.writeFileSync(outpath, html, 'utf8');
}

function buildPages(packages) {
    fs.mkPath(path.join(outDir, 'api'));

    for (const packageName in packages) {
        fs.mkPath(path.join(outDir, 'api', packageName));

        // first pass for registering links
        packages[packageName].forEach((page) => {
            page.url = `api/${packageName}/${page.name}.html`;
            helper.registerLink(page.longname, page.url);
        });
    }

    for (const packageName in packages) {
        // second pass to generate pages
        packages[packageName].forEach((page) => {
            generate(`${page.name} - iTowns documentation`, page, page.url);
        });
    }
}

function buildTutorials(tutorials) {
    helper.setTutorials(tutorials);

    fs.mkPath(path.join(outDir, 'tutorials'));

    tutorials.children.forEach((tutorial) => {
        const url = path.join('tutorials', `${tutorial.name}.html`);
        generate(`Tutorial: ${tutorial.title}`, tutorial.parse(), url, 'tutorial.tmpl');
    });

    // Copy images resources
    const fromDir = path.join(__dirname, 'tutorials/images');
    const images = fs.ls(fromDir, 3);
    images.forEach((filename) => {
        const toDir = path.join(fs.toDir(filename.replace(fromDir, outDir)), 'tutorials/images');
        fs.mkPath(toDir);
        fs.copyFileSync(filename, toDir);
    });
}

exports.publish = function publish(taffyData, opts, tutorials) {
    const conf = env.conf.templates || {};
    conf.default = conf.default || {};

    fs.mkPath(outDir);

    // Setup the template
    const templatePath = path.normalize(opts.template);
    view = new template.Template(path.join(templatePath, 'tmpl'));
    view.find = find;
    view.linkToSource = linkToSource;
    view.rank = rank;
    view.caption = caption;

    // Copy static resources
    const fromDir = path.join(templatePath, 'static');
    const staticFiles = fs.ls(fromDir, 3);
    staticFiles.forEach((filename) => {
        const toDir = fs.toDir(filename.replace(fromDir, outDir));
        fs.mkPath(toDir);
        fs.copyFileSync(filename, toDir);
    });

    // Get the navigation configuration
    const navList = opts.navigation;

    // Sort all the data that will be used by packages
    data = helper.prune(taffyData);
    const members = helper.getMembers(data);
    const packages = sortByPackage(members, navList);

    generate('Home - iTowns documentation', opts.readme, 'home.html', 'readme.tmpl');
    buildPages(packages);
    buildTutorials(tutorials);
    generate('iTowns documentation', { tutorials, packages: navList }, 'index.html', 'main.tmpl');
};
