/**
 * Ambient module declaration for Parcel's glob resolver (@parcel/resolver-glob)
 * scoped specifically to the articles content directory consumed by index_instance.ts.
 */
declare module "/src/pages/articles/content/*" {
    const content: Record<string, unknown>;
    export default content;
}
