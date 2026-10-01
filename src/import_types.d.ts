declare module "*.png" {
    const fileName: string;
    export = fileName;
}

declare module "url:*.png" {
    const fileName: string;
    export = fileName;
}

declare module "*.jpg" {
    const fileName: string;
    export = fileName;
}

declare module "*.gif" {
    const fileName: string;
    export = fileName;
}

declare module "*.scss" {
    const fileName: string;
    export = fileName;
}


declare module "*.css" {
    const fileName: string;
    export = fileName;
}

declare module "*.mdx" {
    const fileName: string;
    export = fileName;
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

