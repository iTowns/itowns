import { readFile } from 'node:fs/promises';
import path from 'node:path';
import githubUrlFromGit from 'github-url-from-git';

let pkgJson = {};

try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    pkgJson = JSON.parse(await readFile(pkgPath, 'utf-8'));
} catch (err) {
    console.error('no root package.json found');
}

const parserOpts = {
    headerPattern: /^(\w*)(?:\((.*)\))?\: (.*)$/,
    headerCorrespondence: [
        'type',
        'scope',
        'subject',
    ],
    noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
    revertPattern: /^revert:\s([\s\S]*?)\s*This reverts commit (\w*)\./,
    revertCorrespondence: ['header', 'hash'],
};

function issueUrl() {
    if (pkgJson.repository && pkgJson.repository.url && pkgJson.repository.url.includes('github.com')) {
        const gitUrl = githubUrlFromGit(pkgJson.repository.url);

        if (gitUrl) {
            return `${gitUrl}/issues/`;
        }
    }
}

const writerOpts = {
    transform(commit) {
        const issues = [];
        const notes = (commit.notes || []).map(note => ({
            ...note,
            title: 'BREAKING CHANGES',
        }));

        let type = commit.type;
        if (['feat', 'features', 'feature'].includes(type)) {
            type = 'Features';
        } else if (type === 'fix') {
            type = 'Bug Fixes';
        } else if (type === 'perf') {
            type = 'Performance Improvements';
        } else if (type === 'revert') {
            type = 'Reverts';
        } else if (['doc', 'docs'].includes(type)) {
            type = 'Documentation';
        } else if (type === 'style') {
            type = 'Styles';
        } else if (['refactor', 'refacto', 'refactoring'].includes(type)) {
            type = 'Code Refactoring';
        } else if (['test', 'tests'].includes(type)) {
            type = 'Tests';
        } else if (['chore', 'rename', 'workflow'].includes(type) || (commit.header && commit.header.startsWith('release v'))) {
            type = 'Workflow and chores';
        } else if (['example', 'examples'].includes(type)) {
            type = 'Examples';
        } else {
            type = 'Others';
        }

        let subject = commit.subject;
        if (typeof subject === 'string') {
            const url = issueUrl();
            if (url) {
                // GitHub issue URLs.
                subject = subject.replace(/#([0-9]+)/g, (_, issue) => {
                    issues.push(issue);
                    return `[#${issue}](${url}${issue})`;
                });
            }
            // GitHub user URLs.
            subject = subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)');
        }

        // Remove references that already appear in the subject.
        const references = (commit.references || []).filter((reference) => {
            return !issues.includes(reference.issue);
        });

        return {
            ...commit,
            notes,
            type,
            scope: commit.scope === '*' ? '' : commit.scope,
            hash: typeof commit.hash === 'string' ? commit.hash.substring(0, 7) : commit.hash,
            subject,
            references,
        };
    },
    groupBy: 'type',

    commitGroupsSort: (a, b) => {
        const commitGroupOrder = [
            'BREAKING CHANGES',
            'Features',
            'Bug Fixes',
            'Performance Improvements',
            'Examples',
            'Code Refactoring',
            'Workflow and chores',
            'Reverts',
            'Documentation',
            'Styles',
            'Tests',
            'Others',
        ];
        const gRankA = commitGroupOrder.indexOf(a.title);
        const gRankB = commitGroupOrder.indexOf(b.title);
        return gRankA >= gRankB ? 1 : -1;
    },
    commitsSort: ['scope', 'subject'],
    noteGroupsSort: 'title',
    notesSort: (a, b) => {
        const titleA = a.title || '';
        const titleB = b.title || '';
        if (titleA !== titleB) {
            return titleA.localeCompare(titleB);
        }

        const textA = a.text || '';
        const textB = b.text || '';
        return textA.localeCompare(textB);
    },
};

const [template, header, commit, footer] = await Promise.all([
    readFile(new URL('./templates/template.hbs', import.meta.url), 'utf-8'),
    readFile(new URL('./templates/header.hbs', import.meta.url), 'utf-8'),
    readFile(new URL('./templates/commit.hbs', import.meta.url), 'utf-8'),
    readFile(new URL('./templates/footer.hbs', import.meta.url), 'utf-8'),
]);

const resolvedWriterOpts = {
    ...writerOpts,
    mainTemplate: template,
    headerPartial: header,
    commitPartial: commit,
    footerPartial: footer,
};

export default {
    parserOpts,
    writerOpts: resolvedWriterOpts,
};
