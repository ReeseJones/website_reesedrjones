import { Register } from "../../index_instance";
import heroImage from "url:./hero_image.jpg";

export const content = <>
    <p>To make a flexbox gallery make a container like this</p>
    <p>
        Then to get images to dynamically size to fit the container
        add this class to them so that they keep their aspect ratio
        but also expand to fit the row its on.
    </p>
    <p>
        Now images will resize dynamically to fit in the gallery!
    </p>
</>;

export default () => content;