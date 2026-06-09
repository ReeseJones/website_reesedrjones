
export class PageIndex<T> {

    private readonly pages = new Map<string, T>();

    constructor() {

    }

    registerPage(name: string, pageParams: T) {
        if(this.pages.has(name)) {
            throw new Error(`Page with name: ${name} is already registered`);
        }

        this.pages.set(name, pageParams)
    }

    getPageParams(name: string): T | undefined {
        return this.pages.get(name);
    }

    getAllPages(): T[] {
        return [...this.pages.values()];
    }
}