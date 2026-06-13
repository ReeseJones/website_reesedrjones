import { ArticleDetails } from "./article_details.ts";
import { ArticlePageEntry } from "./ArticlePageEntry.ts";
import ARTICLE_PAGE_IMPORTS from './content/*/*.tsx';
import { ReactNode } from "react";

console.log(ARTICLE_PAGE_IMPORTS);

function GetArticlesList() {
    const keyStack: string[] = [];

    function* getArticles(obj: unknown, keyStack: string[], maxDepth = Infinity, currentDepth = 0): IterableIterator<ArticlePageEntry> {
        // If we have reached the depth limit, yield the entire remaining object/value

        if (obj && typeof obj === 'object' && 'default' in obj) {
            const moduleObj = obj as unknown as {
                default: () => ReactNode;
                ARTICLE_DETAILS: ArticleDetails;
            };

            const path = keyStack.join('/');
            yield {
                articleComponent: moduleObj.default,
                path,
                details: moduleObj.ARTICLE_DETAILS,
            };
            
            return;
        }

        if(currentDepth >= maxDepth) {
            return;
        }

        if(!obj || typeof obj !== 'object') {
            return;
        }

        for (const [key, value] of Object.entries(obj)) {
            keyStack.push(key);
            // Check if the item is a nestable object
            if (value && typeof value === 'object') {
                // Recursively call the generator and increment the depth tracking counter
                yield* getArticles(value, keyStack, maxDepth, currentDepth + 1);
            }
            keyStack.pop();
        }
    }

    return getArticles(ARTICLE_PAGE_IMPORTS, keyStack, 5)

}

export const ARTICLE_PAGES = [...GetArticlesList()];

console.log(ARTICLE_PAGES);