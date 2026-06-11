import { ReactNode } from "react";
import { ArticleDetails } from "./article_details";
import { PageIndex } from "./articles_index";

import articleComponents from './content/*/*.tsx';

export const ARTICLES_INDEX = new PageIndex<ArticleDetails>();

export function Register(name: string, params: ArticleDetails) {
    return ARTICLES_INDEX.registerPage(name, params);
}

console.log(articleComponents);

export interface ArticlePageDetails {
    articleComponent: ReactNode;
    path: string;
}

function GetArticlesList() {
    const keyStack: string[] = [];

    function* getArticles(obj: any, keyStack: string[], maxDepth = Infinity, currentDepth = 0): IterableIterator<ArticlePageDetails> {
        // If we have reached the depth limit, yield the entire remaining object/value
        if (currentDepth >= maxDepth) {
            const path = keyStack.join('/');
            yield {
                articleComponent: obj.default(),
                path: `articles/${path}`
            };
            return;
        }

        for (const key of Object.keys(obj)) {
            keyStack.push(key);
            const value = obj[key];
            // Check if the item is a nestable object
            if (value && typeof value === 'object') {
                // Recursively call the generator and increment the depth tracking counter
                yield* getArticles(value, keyStack, maxDepth, currentDepth + 1);
            }
            keyStack.pop();
        }
    }

    return getArticles(articleComponents, keyStack, 2)

}

export const ARTICLE_PAGES = [...GetArticlesList()];

console.log(ARTICLE_PAGES);