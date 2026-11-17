export function StaticContent({ html }) {
  return <div className="content-root" dangerouslySetInnerHTML={{ __html: html }} />;
}
