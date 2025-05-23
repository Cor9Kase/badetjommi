// src/app/page/page.tsx
export default function GenericPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Generic Page</h1>
      <p>This is a placeholder page for the /page route.</p>
      <p>If you are seeing this unexpectedly, please check your navigation links or the URL you entered.</p>
      <p>The main feed page is at the <a href="/" className="text-primary hover:underline">root path</a>.</p>
    </div>
  );
}
