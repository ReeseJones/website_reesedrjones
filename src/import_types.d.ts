declare module "*.png" {
    const fileName: string;
    export default fileName;
}

declare module "*.jpg" {
    const fileName: string;
    export default fileName;
}

declare module "*.jpeg" {
    const fileName: string;
    export default fileName;
}

declare module "*.gif" {
    const fileName: string;
    export default fileName;
}

declare module "*.webp" {
    const fileName: string;
    export default fileName;
}

declare module "*.avif" {
    const fileName: string;
    export default fileName;
}

declare module "*.svg" {
    const fileName: string;
    export default fileName;
}

// Parcel URL scheme imports (including query parameters like ?width=200, ?as=webp)
declare module "url:*" {
    const fileName: string;
    export default fileName;
}

declare module "*.scss" {
    const fileName: string;
    export default fileName;
}

declare module "*.css" {
    const fileName: string;
    export default fileName;
}

// MDX component declarations for Parcel MDX transformer
declare module "*.mdx" {
    import type { ComponentType, ReactNode } from "react";
    interface MDXProps {
        components?: Record<string, ComponentType<any>>;
        children?: ReactNode;
        [key: string]: any;
    }
    const MDXComponent: ComponentType<MDXProps>;
    export default MDXComponent;
}

declare module "bundle-text:*" {
    const content: string;
    export default content;
}

declare module "*.vert" {
    const content: string;
    export default content;
}

declare module "*.frag" {
    const content: string;
    export default content;
}

declare module "*.glsl" {
    const content: string;
    export default content;
}
