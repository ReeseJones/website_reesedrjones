import { ArticleDetails } from "../../article_details";
import { ArticlePageLayout } from "../../article_page_layout";
import ProjectScaleMdx from "./project-scale.mdx";
import projectScaleSplashUrl from "url:../../../../images/games/project_scale_splash.png";

export const ARTICLE_DETAILS: ArticleDetails = {
    title: "Project Scale",
    subtitle: "Scale-shifting puzzle platformer",
    description: "Manipulate scale to solve intricate environmental puzzles and platforming challenges.",
    date: "2026-09-24",
    heroImageUrl: projectScaleSplashUrl,
    heroImageAlt: "Project Scale game splash screen",
};

export default function ProjectScaleArticle() {
    return (
        <ArticlePageLayout {...ARTICLE_DETAILS}>
            <ProjectScaleMdx />
        </ArticlePageLayout>
    );
}
