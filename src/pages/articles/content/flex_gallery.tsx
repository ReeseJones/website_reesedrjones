import { Register } from "../index_instance";


const content = <>
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


Register("flex_gallery", {
    title: "Flexbox Image Gallery",
    subtitle: "Make an image gallery using native css flexbox",
    heroImageUrl: "fake_image.png",
    children: content
});