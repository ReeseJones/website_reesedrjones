export interface Page {
    name: string;
    path: string;
    children: Page[];
}

export const PAGES: Page = {
    name: "Home",
    path: "/",
    children: [
        {
            name: "Articles",
            path: "/articles/",
            children: []
        },
        {
            name: "About Me",
            path: "/about-me/",
            children: []
        }
    ]
};

export const NAVBAR_PAGES = [PAGES, ...PAGES.children];
