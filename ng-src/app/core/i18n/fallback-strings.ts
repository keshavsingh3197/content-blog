/**
 * Built-in English text for every key this app renders.
 *
 * Strings live in the identity provider's catalogue, not in this build — that is the whole point of
 * {@link I18nService}. But the catalogue is a database an admin fills in, and a key that has not
 * reached it yet renders *as the key*: a reader sees `blog.reader.fontSize` where a label belongs.
 * That trade was acceptable when every key was seeded together with the feature; it is not
 * acceptable for a feature shipped ahead of the catalogue edit.
 *
 * So the resolution order is: catalogue → this table → the key itself. The catalogue still wins for
 * every key it defines, in every language, so translating remains a database edit and nothing here
 * can override a translator. What this table buys is that a *missing* key degrades to readable
 * English instead of to a debug token.
 *
 * Keep it in step with the templates: a key rendered anywhere in `ng-src/app` belongs here.
 */
export const FALLBACK_STRINGS: Readonly<Record<string, string>> = {
  // ── Common ────────────────────────────────────────────────────────────────────────────────
  'common.actions.cancel': 'Cancel',
  'common.actions.close': 'Close',
  'common.actions.delete': 'Delete',
  'common.actions.edit': 'Edit',
  'common.actions.save': 'Save',
  'common.actions.clear': 'Clear',
  'common.actions.retry': 'Try again',
  'common.label.language': 'Language',
  'common.label.theme': 'Theme',
  'common.state.loading': 'Loading…',

  // ── Navigation ────────────────────────────────────────────────────────────────────────────
  'blog.nav.home': 'Home',
  'blog.nav.breadcrumb': 'Breadcrumb',
  'blog.nav.browseFolder': 'Browse {name}',
  'blog.nav.toggleMenu': 'Toggle menu',
  'blog.nav.topics': 'Topics',
  'blog.nav.menu': 'Menu',
  'blog.nav.skipToContent': 'Skip to content',

  // ── Theme menu ────────────────────────────────────────────────────────────────────────────
  'blog.theme.light': 'Light',
  'blog.theme.dark': 'Dark',
  'blog.theme.system': 'System',
  'blog.theme.choose': 'Choose a theme',

  // ── Hero / home ───────────────────────────────────────────────────────────────────────────
  'blog.hero.eyebrow': 'Engineering knowledge base',
  'blog.hero.title': 'Deep dives, not summaries',
  'blog.hero.subtitle':
    'Long-form engineering guides on C#/.NET, cloud, containers, databases and design — written to be read end to end.',
  'blog.hero.stat.articles': 'Articles',
  'blog.hero.stat.topics': 'Topics',
  'blog.hero.stat.free': 'Free',
  'blog.hero.stat.forever': 'Forever',
  'blog.section.browseTopics': 'Browse topics',
  'blog.section.allFiles': 'All documents',
  'blog.section.continueReading': 'Continue reading',
  'blog.section.recentlyUpdated': 'Recently updated',
  'blog.section.bookmarks': 'Your reading list',

  // ── Search / command palette ──────────────────────────────────────────────────────────────
  'blog.search.placeholder': 'Search articles, topics and tags…',
  'blog.search.noResults': 'Nothing matched that search.',
  'blog.search.open': 'Search',
  'blog.search.hint': 'Search the whole library',
  'blog.search.recent': 'Recent searches',
  'blog.search.suggestions': 'Jump to',
  'blog.search.results': 'Results',
  'blog.search.count': '{count} results',
  'blog.search.navigateHint': 'to navigate',
  'blog.search.selectHint': 'to open',
  'blog.search.closeHint': 'to close',
  'blog.search.emptyPrompt': 'Start typing to search the library.',

  // ── Content view ──────────────────────────────────────────────────────────────────────────
  'blog.content.contents': 'Contents',
  'blog.content.readingTime': '{minutes} min read',
  'blog.content.words': '{count} words',
  'blog.content.updated': 'Updated {date}',
  'blog.content.views': '{count} views',
  'blog.content.print': 'Print',
  'blog.content.copy': 'Copy',
  'blog.content.copied': 'Copied',
  'blog.content.copyFailed': 'Copy failed',
  'blog.content.copyCode': 'Copy code to clipboard',
  'blog.content.loadFailed': 'That document could not be loaded.',
  'blog.content.backToTop': 'Back to top',
  'blog.content.share': 'Share',
  'blog.content.linkCopied': 'Link copied',
  'blog.content.copyHeadingLink': 'Copy link to this section',
  'blog.content.previous': 'Previous',
  'blog.content.next': 'Next',
  'blog.content.related': 'Related reading',
  'blog.content.inThisFolder': 'In this folder',
  'blog.content.readerSettings': 'Reading options',
  'blog.content.textSize': 'Text size',
  'blog.content.lineWidth': 'Line width',
  'blog.content.textSmaller': 'Smaller text',
  'blog.content.textLarger': 'Larger text',
  'blog.content.widthNarrow': 'Narrow',
  'blog.content.widthWide': 'Wide',
  'blog.content.resetSettings': 'Reset',
  'blog.content.progress': 'Reading progress',

  // ── Bookmarks & history ───────────────────────────────────────────────────────────────────
  'blog.bookmarks.title': 'Reading list',
  'blog.bookmarks.subtitle':
    'Bookmarks and reading history are kept in this browser only — nothing is sent to a server.',
  'blog.bookmarks.add': 'Save to reading list',
  'blog.bookmarks.remove': 'Remove from reading list',
  'blog.bookmarks.saved': 'Saved',
  'blog.bookmarks.empty': 'No saved documents yet. Use the bookmark button on any article.',
  'blog.bookmarks.historyTitle': 'Recently read',
  'blog.bookmarks.historyEmpty': 'Nothing read yet.',
  'blog.bookmarks.clearHistory': 'Clear history',
  'blog.bookmarks.confirmClear': 'Clear your reading history in this browser?',
  'blog.bookmarks.browse': 'Browse the library',

  // ── Folder view ───────────────────────────────────────────────────────────────────────────
  'blog.folder.notFound': 'That folder is not in the library.',
  'blog.folder.empty': 'This folder is empty.',
  'blog.folder.documents': 'Documents',
  'blog.folder.subFolders': 'Sections',
  'blog.folder.fileCount': '{count} documents',
  'blog.folder.parent': 'Up one level',
  'blog.folder.read': 'Read {name}',
  'blog.folder.filter': 'Filter documents in this folder…',
  'blog.folder.noMatches': 'No document here matches that filter.',

  // ── Tags ──────────────────────────────────────────────────────────────────────────────────
  'blog.tags.title': 'Tags',
  'blog.tags.subtitle': 'Every tag in the library. Pick one to see what is behind it.',
  'blog.tags.all': 'All',
  'blog.tags.noMatches': 'No document carries that tag.',
  'blog.tags.filter': 'Filter tags…',
  'blog.tags.noTagMatches': 'No tag matches that filter.',

  // ── File tree ─────────────────────────────────────────────────────────────────────────────
  'blog.tree.expandAll': 'Expand all',
  'blog.tree.collapseAll': 'Collapse all',

  // ── Not found ─────────────────────────────────────────────────────────────────────────────
  'blog.notFound.title': 'That page is not here',
  'blog.notFound.body':
    'The address may be mistyped, or the document may have been renamed or moved.',
  'blog.notFound.home': 'Go to the home page',
  'blog.notFound.search': 'Search the library',

  // ── Comments ──────────────────────────────────────────────────────────────────────────────
  'blog.comments.title': 'Discussion',
  'blog.comments.empty': 'No comments yet.',
  'blog.comments.loadFailed': 'The discussion could not be loaded.',
  'blog.comments.placeholder': 'Add to the discussion…',
  'blog.comments.post': 'Post comment',
  'blog.comments.postingAs': 'Posting as {name}',
  'blog.comments.you': 'you',
  'blog.comments.edited': 'edited',
  'blog.comments.editLabel': 'Edit your comment',
  'blog.comments.confirmDelete': 'Delete this comment?',
  'blog.comments.signIn': 'Sign in',
  'blog.comments.signInPrompt': 'Sign in to join the discussion.',
  'blog.comments.requestAccount': 'Request an account',
  'blog.comments.approvalNote': 'Accounts on this site are granted by an administrator.',
  'blog.comments.errorGeneric': 'That could not be saved. Please try again.',
  'blog.comments.errorSignedOut': 'Your session has expired. Sign in again to post.',
  'blog.comments.errorTooMany': 'Too many comments too quickly. Please wait a moment.',

  // ── Footer ────────────────────────────────────────────────────────────────────────────────
  'blog.footer.about': 'Long-form engineering writing, kept in one place.',
  'blog.footer.contact': 'Contact',
  'blog.footer.reachOut': 'Questions or corrections are welcome.',
  'blog.footer.rights': 'All rights reserved.',
  'blog.footer.builtWith': 'Built with care',
};

/**
 * Built-in text for `key`, or `undefined` when there is none. `params` are interpolated with the
 * same `{name}` syntax the catalogue uses, so a fallback and a translation behave identically.
 */
export function fallbackString(
  key: string,
  params?: Record<string, string | number>
): string | undefined {
  // Annotated because `Record<string, string>` types the lookup as `string`, which makes the
  // undefined check a type error rather than the runtime guard it actually is.
  const template: string | undefined = FALLBACK_STRINGS[key];
  if (template === undefined) return undefined;
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
