/** A content filename split into its ordering prefix and a human-readable title. */
export interface DocName {
  /** Leading order number, e.g. "03" from "03-oop-and-class-design.md". Empty when absent. */
  order: string;
  /** Readable title, e.g. "OOP and Class Design". */
  title: string;
}

const CONTENT_EXTENSION = /\.(md|markdown|txt|html?|json)$/i;
const ORDER_PREFIX = /^(\d{1,3})[-_. ]+/;

/** Small words that read better lower-case inside a title. */
const MINOR_WORDS = new Set([
  'and', 'or', 'of', 'the', 'a', 'an', 'to', 'in', 'on', 'at', 'vs', 'for', 'with',
]);

/** Acronyms that must stay upper-case. */
const ACRONYMS = new Set([
  'api', 'aws', 'cicd', 'cli', 'clr', 'cors', 'cqrs', 'css', 'di', 'dns', 'ef', 'gc', 'gof',
  'grpc', 'html', 'http', 'il', 'iot', 'jit', 'json', 'jwt', 'k8', 'linq', 'nfr', 'oop', 'orm',
  'rest', 'sdk', 'solid', 'sql', 'ssl', 'tls', 'tpl', 'ui', 'ux', 'vpc', 'xml', 'yaml',
]);

/** Product names a filename cannot spell, mapped to how they are actually written. */
const BRANDS = new Map<string, string>([
  ['dotnet', '.NET'],
  ['aspnet', 'ASP.NET'],
  ['csharp', 'C#'],
  ['nuget', 'NuGet'],
  ['github', 'GitHub'],
  ['gitlab', 'GitLab'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['nodejs', 'Node.js'],
  ['mongodb', 'MongoDB'],
  ['postgresql', 'PostgreSQL'],
  ['sonarqube', 'SonarQube'],
  ['sonarcloud', 'SonarCloud'],
  ['kubernetes', 'Kubernetes'],
  ['powershell', 'PowerShell'],
  ['signalr', 'SignalR'],
  ['graphql', 'GraphQL'],
  ['openapi', 'OpenAPI'],
  ['oauth', 'OAuth'],
  ['webapi', 'Web API'],
  ['ef', 'EF Core'],
]);

/**
 * Turn a filename into something worth putting in front of a reader:
 * `09-aspnet-core-pipeline-and-di.md` → `{ order: '09', title: 'Aspnet Core Pipeline and DI' }`.
 *
 * Used by the folder view (number as a badge, title as the card heading) and as the breadcrumb
 * fallback before the document's own `<h1>` is available.
 */
export function parseDocName(fileName: string): DocName {
  const withoutExtension = fileName.replace(CONTENT_EXTENSION, '');
  const order = ORDER_PREFIX.exec(withoutExtension)?.[1] ?? '';

  const stem = withoutExtension
    .replace(ORDER_PREFIX, '')
    .replace(/[-_.]+/g, ' ')
    .trim();

  if (!stem) return { order, title: withoutExtension || fileName };

  const title = stem.split(/\s+/).map((word, index) => {
    const lower = word.toLowerCase();
    const brand = BRANDS.get(lower);
    if (brand) return brand;
    if (ACRONYMS.has(lower)) return lower.toUpperCase();
    if (index > 0 && MINOR_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');

  return { order, title };
}

/** `parseDocName` as one string: `"09 — Aspnet Core Pipeline and DI"`. */
export function docLabel(fileName: string): string {
  const { order, title } = parseDocName(fileName);
  return order ? `${order} — ${title}` : title;
}
